-- Trust & Fairness System
-- Adds: liability confirmations, price_adjustments table, remover_metrics, abuse scoring.
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL < 16.
-- These statements must appear before the BEGIN block.

alter type public.notification_type add value if not exists 'price_adjustment_requested';
alter type public.notification_type add value if not exists 'price_adjustment_responded';

begin;

-- ── New enums ──────────────────────────────────────────────────────────────────

do $$ begin
  create type public.adjustment_reason as enum (
    'size_mismatch',
    'access_issue',
    'unlisted_items',
    'hazardous_items',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.adjustment_status as enum (
    'pending',
    'accepted',
    'declined',
    'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.visibility_tier as enum (
    'normal',
    'reduced',
    'suspended'
  );
exception when duplicate_object then null; end $$;

-- ── Extend remover_profiles ────────────────────────────────────────────────────

alter table public.remover_profiles
  add column if not exists liability_confirmed_at timestamptz,
  add column if not exists liability_version text,
  add column if not exists is_flagged boolean not null default false,
  add column if not exists visibility_tier public.visibility_tier not null default 'normal';

-- ── Extend jobs ───────────────────────────────────────────────────────────────

alter table public.jobs
  add column if not exists poster_attestation_confirmed_at timestamptz,
  add column if not exists poster_attestation_version text;

-- ── Extend job_assignments ────────────────────────────────────────────────────

alter table public.job_assignments
  add column if not exists remover_liability_confirmed_at timestamptz,
  add column if not exists started_at timestamptz;

-- ── price_adjustments ─────────────────────────────────────────────────────────

create table if not exists public.price_adjustments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  assignment_id uuid not null references public.job_assignments(id) on delete cascade,
  remover_id uuid not null references public.profiles(id) on delete cascade,
  original_amount_cents int not null check (original_amount_cents > 0),
  requested_amount_cents int not null check (requested_amount_cents > 0),
  difference_cents int not null,
  reason public.adjustment_reason not null,
  message text,
  evidence_photo_url text,
  status public.adjustment_status not null default 'pending',
  supplemental_payment_intent_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 hours')
);

create index if not exists idx_price_adjustments_job_id
  on public.price_adjustments(job_id);
create index if not exists idx_price_adjustments_remover_id
  on public.price_adjustments(remover_id);
create index if not exists idx_price_adjustments_status
  on public.price_adjustments(status);
create index if not exists idx_price_adjustments_expires_at
  on public.price_adjustments(expires_at);

-- At most one pending adjustment per job at a time.
create unique index if not exists uq_price_adjustments_job_pending
  on public.price_adjustments(job_id)
  where status = 'pending';

-- ── remover_metrics ───────────────────────────────────────────────────────────

create table if not exists public.remover_metrics (
  remover_id uuid primary key references public.profiles(id) on delete cascade,
  total_jobs int not null default 0,
  total_adjustment_requests int not null default 0,
  accepted_adjustments int not null default 0,
  declined_adjustments int not null default 0,
  disputes_count int not null default 0,
  cancellations_count int not null default 0,
  late_cancellations int not null default 0,
  abuse_score numeric(8,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ── Helper: ensure metrics row exists ────────────────────────────────────────

create or replace function public.upsert_remover_metrics(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.remover_metrics (remover_id)
  values (p_remover_id)
  on conflict (remover_id) do nothing;
end;
$$;

-- ── Increment helpers (called from server actions) ────────────────────────────

create or replace function public.increment_adjustment_requests(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_remover_metrics(p_remover_id);
  update public.remover_metrics
  set total_adjustment_requests = total_adjustment_requests + 1, updated_at = now()
  where remover_id = p_remover_id;
end;
$$;

create or replace function public.increment_accepted_adjustments(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_remover_metrics(p_remover_id);
  update public.remover_metrics
  set accepted_adjustments = accepted_adjustments + 1, updated_at = now()
  where remover_id = p_remover_id;
end;
$$;

create or replace function public.increment_declined_adjustments(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_remover_metrics(p_remover_id);
  update public.remover_metrics
  set declined_adjustments = declined_adjustments + 1, updated_at = now()
  where remover_id = p_remover_id;
  perform public.recalculate_abuse_score(p_remover_id);
end;
$$;

create or replace function public.increment_remover_disputes(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_remover_metrics(p_remover_id);
  update public.remover_metrics
  set disputes_count = disputes_count + 1, updated_at = now()
  where remover_id = p_remover_id;
  perform public.recalculate_abuse_score(p_remover_id);
end;
$$;

create or replace function public.increment_remover_cancellations(p_remover_id uuid, p_late boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.upsert_remover_metrics(p_remover_id);
  update public.remover_metrics
  set cancellations_count = cancellations_count + 1,
      late_cancellations   = late_cancellations + (case when p_late then 1 else 0 end),
      updated_at = now()
  where remover_id = p_remover_id;
  perform public.recalculate_abuse_score(p_remover_id);
end;
$$;

-- ── Abuse score recalculation ─────────────────────────────────────────────────
-- Formula v1:
--   abuse_score = (declined_adjustments * 2) + (disputes_count * 3) + (late_cancellations * 2)
-- Thresholds: >= 6 → reduced; >= 12 → suspended.

create or replace function public.recalculate_abuse_score(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_declined int := 0;
  v_disputes int := 0;
  v_late_cancel int := 0;
  v_score numeric := 0;
begin
  select
    coalesce(declined_adjustments, 0),
    coalesce(disputes_count, 0),
    coalesce(late_cancellations, 0)
  into v_declined, v_disputes, v_late_cancel
  from public.remover_metrics
  where remover_id = p_remover_id;

  v_score := (v_declined * 2) + (v_disputes * 3) + (v_late_cancel * 2);

  update public.remover_metrics
  set abuse_score = v_score, updated_at = now()
  where remover_id = p_remover_id;

  update public.remover_profiles
  set
    is_flagged = (v_score >= 6),
    visibility_tier = case
      when v_score >= 12 then 'suspended'::public.visibility_tier
      when v_score >= 6  then 'reduced'::public.visibility_tier
      else 'normal'::public.visibility_tier
    end
  where remover_id = p_remover_id;
end;
$$;

-- ── DB-level guard: no adjustment after job started ───────────────────────────

create or replace function public.guard_no_adjustment_after_start()
returns trigger
language plpgsql
as $$
declare
  v_started_at timestamptz;
begin
  select started_at into v_started_at
  from public.job_assignments
  where id = new.assignment_id;

  if v_started_at is not null then
    raise exception 'Price adjustment not allowed after job has started.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_no_adjustment_after_start on public.price_adjustments;
create trigger trg_no_adjustment_after_start
before insert on public.price_adjustments
for each row execute function public.guard_no_adjustment_after_start();

commit;

-- ── Storage: adjustment-evidence bucket ──────────────────────────────────────
-- Outside the main transaction so a storage error cannot roll back the DDL above.

do $storage_adj$
begin
  insert into storage.buckets (id, name, public)
  values ('adjustment-evidence', 'adjustment-evidence', false)
  on conflict (id) do nothing;
exception when others then
  raise warning 'storage.buckets insert skipped (storage may not be enabled yet): %', sqlerrm;
end $storage_adj$;

-- Assigned remover may upload (path: <job_id>/<filename>).
do $policy_adj_upload$
begin
  drop policy if exists "adjustment_evidence_upload_remover" on storage.objects;
  create policy "adjustment_evidence_upload_remover"
  on storage.objects for insert
  with check (
    bucket_id = 'adjustment-evidence'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.job_assignments a
        where a.remover_id = auth.uid()
          and a.canceled_at is null
          and a.job_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );
exception when others then
  raise warning 'storage.objects policy "adjustment_evidence_upload_remover" skipped: %', sqlerrm;
end $policy_adj_upload$;

-- Poster and assigned remover may read.
do $policy_adj_read$
begin
  drop policy if exists "adjustment_evidence_read_participant" on storage.objects;
  create policy "adjustment_evidence_read_participant"
  on storage.objects for select
  using (
    bucket_id = 'adjustment-evidence'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.job_assignments a
        where (a.remover_id = auth.uid() or a.poster_id = auth.uid())
          and a.canceled_at is null
          and a.job_id::text = (storage.foldername(storage.objects.name))[1]
      )
    )
  );
exception when others then
  raise warning 'storage.objects policy "adjustment_evidence_read_participant" skipped: %', sqlerrm;
end $policy_adj_read$;

begin;

-- ── RLS for new tables ────────────────────────────────────────────────────────

alter table public.price_adjustments enable row level security;
alter table public.remover_metrics enable row level security;

drop policy if exists "price_adjustments_read_participant_or_admin" on public.price_adjustments;
create policy "price_adjustments_read_participant_or_admin"
on public.price_adjustments for select
using (
  public.is_admin()
  or remover_id = auth.uid()
  or exists (
    select 1 from public.jobs j
    where j.id = price_adjustments.job_id
      and j.poster_id = auth.uid()
  )
);

drop policy if exists "price_adjustments_insert_remover" on public.price_adjustments;
create policy "price_adjustments_insert_remover"
on public.price_adjustments for insert
with check (
  public.is_admin()
  or remover_id = auth.uid()
);

-- Updates go through service role (bypasses RLS); this policy covers direct admin queries.
drop policy if exists "price_adjustments_update_admin" on public.price_adjustments;
create policy "price_adjustments_update_admin"
on public.price_adjustments for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "remover_metrics_read_public" on public.remover_metrics;
create policy "remover_metrics_read_public"
on public.remover_metrics for select
using (true);

commit;
