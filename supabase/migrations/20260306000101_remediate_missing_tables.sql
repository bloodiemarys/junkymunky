-- Remediation migration: idempotently creates public.job_assignments and
-- public.messages on databases where migration 000100 was tracked as applied
-- before those tables were added to it.
--
-- WHEN TO USE THIS FILE
--   • Only needed if your Supabase project has public.jobs, public.profiles,
--     and public.bids already present (from an older 000100 run) but is
--     missing public.job_assignments and/or public.messages.
--
--   • On a completely FRESH database, run 000100_init.sql first.
--     000100 creates ALL tables including job_assignments and messages.
--     This file will then be a safe no-op.
--
--   • If public.jobs / public.profiles / public.bids do not exist yet,
--     stop here and run 000100_init.sql first; this migration cannot proceed
--     without those parent tables (required for foreign-key constraints).
--
-- Every statement is fully idempotent.

begin;

-- ── Prerequisite guard ────────────────────────────────────────────────────────
-- Raises a clear error instead of the cryptic "relation does not exist" message
-- if the parent tables from 000100 have not been created yet.

do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'profiles'
  ) then
    raise exception
      'Prerequisite not met: public.profiles does not exist. '
      'Run 000100_init.sql first, then re-run this migration.';
  end if;

  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'jobs'
  ) then
    raise exception
      'Prerequisite not met: public.jobs does not exist. '
      'Run 000100_init.sql first, then re-run this migration.';
  end if;

  if not exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'bids'
  ) then
    raise exception
      'Prerequisite not met: public.bids does not exist. '
      'Run 000100_init.sql first, then re-run this migration.';
  end if;
end $$;

-- ── job_assignments ───────────────────────────────────────────────────────────

create table if not exists public.job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  bid_id uuid not null references public.bids(id) on delete restrict,
  remover_id uuid not null references public.profiles(id) on delete restrict,
  poster_id uuid not null references public.profiles(id) on delete restrict,
  payment_intent_id text not null,
  amount_cents int not null check (amount_cents > 0),
  platform_fee_cents int not null check (platform_fee_cents >= 0),
  payout_cents int not null check (payout_cents >= 0),
  authorized_at timestamptz not null,
  capture_deadline_at timestamptz,        -- nullable; set when job reaches picked_up
  captured_at timestamptz,
  transfer_id text,
  payout_status text not null default 'pending',  -- pending|paid|failed|held|refunded
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_assignment_fee_math check (platform_fee_cents + payout_cents = amount_cents)
);

create unique index if not exists uq_job_assignments_job_id
  on public.job_assignments(job_id);
create unique index if not exists uq_job_assignments_pi
  on public.job_assignments(payment_intent_id);
create index if not exists idx_job_assignments_capture_deadline
  on public.job_assignments(capture_deadline_at);

drop trigger if exists trg_job_assignments_set_updated_at on public.job_assignments;
create trigger trg_job_assignments_set_updated_at
before update on public.job_assignments
for each row execute function public.set_updated_at();

alter table public.job_assignments enable row level security;

drop policy if exists "assignments_read_participant_or_admin" on public.job_assignments;
create policy "assignments_read_participant_or_admin"
on public.job_assignments for select
using (
  public.is_admin()
  or poster_id = auth.uid()
  or remover_id = auth.uid()
);

-- ── messages ─────────────────────────────────────────────────────────────────

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_job_id_created_at
  on public.messages(job_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_read_job_participant_or_admin" on public.messages;
create policy "messages_read_job_participant_or_admin"
on public.messages for select
using (
  public.is_admin()
  or sender_id = auth.uid()
  or recipient_id = auth.uid()
);

-- Baseline insert policy (tightened further in 000200 and 000900).
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
on public.messages for insert
with check (
  public.is_admin()
  or sender_id = auth.uid()
);

commit;
