-- JunkyMunky.com initial schema (idempotent-ish migration)
-- Designed for Supabase Postgres + RLS.

begin;

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type public.user_role as enum ('poster', 'remover', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum (
    'open',
    'accepted',
    'en_route',
    'arrived',
    'picked_up',
    'completed',
    'canceled',
    'disputed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bid_status as enum ('active', 'withdrawn', 'accepted', 'declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dispute_status as enum ('open', 'under_review', 'resolved');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_type as enum ('illegal_or_hazardous', 'spam', 'harassment', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'job_created',
    'bid_received',
    'bid_accepted',
    'message_received',
    'job_status_changed',
    'dispute_opened',
    'reminder_confirm_pickup'
  );
exception when duplicate_object then null; end $$;

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'poster',
  full_name text,
  phone text,
  avatar_url text,
  stripe_customer_id text,
  stripe_connect_account_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Utility: role helper — must come after public.profiles exists (language sql validates at creation time)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'::public.user_role
  );
$$;

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, avatar_url)
  values (new.id, 'poster'::public.user_role, coalesce(new.raw_user_meta_data->>'full_name', null), coalesce(new.raw_user_meta_data->>'avatar_url', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Remover profiles
create table if not exists public.remover_profiles (
  remover_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text,
  service_radius_miles int not null default 25,
  vehicle_type text,
  bio text,
  rating_avg numeric(3,2) not null default 0,
  completed_jobs_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_remover_profiles_set_updated_at on public.remover_profiles;
create trigger trg_remover_profiles_set_updated_at
before update on public.remover_profiles
for each row execute function public.set_updated_at();

-- Jobs
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  size text not null check (size in ('small','medium','large','cubic_yards')),
  estimated_cubic_yards numeric(6,2),
  reusable_ok boolean not null default false,
  status public.job_status not null default 'open',
  policy_accepted_at timestamptz not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  zip text not null,
  lat double precision,
  lng double precision,
  location_instructions text,
  preferred_window_start timestamptz,
  preferred_window_end timestamptz,
  is_flagged boolean not null default false,
  flagged_reason text,
  flagged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_poster_id on public.jobs(poster_id);
create index if not exists idx_jobs_status on public.jobs(status);
create index if not exists idx_jobs_zip on public.jobs(zip);
create index if not exists idx_jobs_created_at on public.jobs(created_at desc);

drop trigger if exists trg_jobs_set_updated_at on public.jobs;
create trigger trg_jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

-- Job photos (stored in Supabase Storage)
create table if not exists public.job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_job_photos_job_id on public.job_photos(job_id);
create unique index if not exists uq_job_photos_job_path on public.job_photos(job_id, storage_path);

-- Bids
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  remover_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  message text,
  eta_timestamp timestamptz,
  can_keep_reusables_ack boolean not null default false,
  status public.bid_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bids_job_id on public.bids(job_id);
create index if not exists idx_bids_remover_id on public.bids(remover_id);
create index if not exists idx_bids_status on public.bids(status);
create unique index if not exists uq_active_bid_per_job_remover
  on public.bids(job_id, remover_id)
  where status = 'active';

drop trigger if exists trg_bids_set_updated_at on public.bids;
create trigger trg_bids_set_updated_at
before update on public.bids
for each row execute function public.set_updated_at();

-- Job assignment + escrow lifecycle
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
  capture_deadline_at timestamptz not null,
  captured_at timestamptz,
  transfer_id text,
  payout_status text not null default 'pending', -- pending|paid|failed|held
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_assignment_fee_math check (platform_fee_cents + payout_cents = amount_cents)
);

create unique index if not exists uq_job_assignments_job_id on public.job_assignments(job_id);
create unique index if not exists uq_job_assignments_pi on public.job_assignments(payment_intent_id);
create index if not exists idx_job_assignments_capture_deadline on public.job_assignments(capture_deadline_at);

drop trigger if exists trg_job_assignments_set_updated_at on public.job_assignments;
create trigger trg_job_assignments_set_updated_at
before update on public.job_assignments
for each row execute function public.set_updated_at();

-- Messages (per-job chat)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_job_id_created_at on public.messages(job_id, created_at desc);

-- Disputes
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status public.dispute_status not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_disputes_set_updated_at on public.disputes;
create trigger trg_disputes_set_updated_at
before update on public.disputes
for each row execute function public.set_updated_at();

-- Reports / moderation
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  type public.report_type not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_job_id on public.reports(job_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id_created_at on public.notifications(user_id, created_at desc);

-- Ratings
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(job_id, rater_id)
);

create index if not exists idx_ratings_ratee_id on public.ratings(ratee_id);

-- -------------------------
-- RLS
-- -------------------------
alter table public.profiles enable row level security;
alter table public.remover_profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_photos enable row level security;
alter table public.bids enable row level security;
alter table public.job_assignments enable row level security;
alter table public.messages enable row level security;
alter table public.disputes enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;

-- Profiles policies
drop policy if exists "profiles_read_own_or_admin" on public.profiles;
create policy "profiles_read_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Remover profiles policies
drop policy if exists "remover_profiles_read_public" on public.remover_profiles;
create policy "remover_profiles_read_public"
on public.remover_profiles for select
using (true);

drop policy if exists "remover_profiles_upsert_own" on public.remover_profiles;
create policy "remover_profiles_upsert_own"
on public.remover_profiles for insert
with check (remover_id = auth.uid() or public.is_admin());

drop policy if exists "remover_profiles_update_own" on public.remover_profiles;
create policy "remover_profiles_update_own"
on public.remover_profiles for update
using (remover_id = auth.uid() or public.is_admin())
with check (remover_id = auth.uid() or public.is_admin());

-- Jobs policies
drop policy if exists "jobs_read_open_or_participant_or_admin" on public.jobs;
create policy "jobs_read_open_or_participant_or_admin"
on public.jobs for select
using (
  public.is_admin()
  or status = 'open'::public.job_status
  or poster_id = auth.uid()
  or exists (
    select 1 from public.job_assignments a
    where a.job_id = jobs.id
      and a.remover_id = auth.uid()
      and a.canceled_at is null
  )
);

drop policy if exists "jobs_insert_poster" on public.jobs;
create policy "jobs_insert_poster"
on public.jobs for insert
with check (poster_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_update_poster_when_not_completed" on public.jobs;
create policy "jobs_update_poster_when_not_completed"
on public.jobs for update
using (poster_id = auth.uid() or public.is_admin())
with check (poster_id = auth.uid() or public.is_admin());

-- Job photos policies (table, not storage)
drop policy if exists "job_photos_read_open_or_participant_or_admin" on public.job_photos;
create policy "job_photos_read_open_or_participant_or_admin"
on public.job_photos for select
using (
  public.is_admin()
  or exists (select 1 from public.jobs j where j.id = job_photos.job_id and j.status = 'open'::public.job_status)
  or exists (select 1 from public.jobs j where j.id = job_photos.job_id and j.poster_id = auth.uid())
  or exists (select 1 from public.job_assignments a where a.job_id = job_photos.job_id and a.remover_id = auth.uid() and a.canceled_at is null)
);

drop policy if exists "job_photos_insert_poster" on public.job_photos;
create policy "job_photos_insert_poster"
on public.job_photos for insert
with check (
  public.is_admin()
  or exists (select 1 from public.jobs j where j.id = job_photos.job_id and j.poster_id = auth.uid())
);

-- Bids policies
drop policy if exists "bids_read_job_participant_or_admin" on public.bids;
create policy "bids_read_job_participant_or_admin"
on public.bids for select
using (
  public.is_admin()
  or remover_id = auth.uid()
  or exists (select 1 from public.jobs j where j.id = bids.job_id and j.poster_id = auth.uid())
);

drop policy if exists "bids_insert_remover" on public.bids;
create policy "bids_insert_remover"
on public.bids for insert
with check (
  public.is_admin()
  or (remover_id = auth.uid()
      and exists (select 1 from public.jobs j where j.id = bids.job_id and j.status = 'open'::public.job_status))
);

drop policy if exists "bids_update_own_or_admin" on public.bids;
create policy "bids_update_own_or_admin"
on public.bids for update
using (public.is_admin() or remover_id = auth.uid())
with check (public.is_admin() or remover_id = auth.uid());

-- Assignments policies (read-only for participants; writes via server/service role)
drop policy if exists "assignments_read_participant_or_admin" on public.job_assignments;
create policy "assignments_read_participant_or_admin"
on public.job_assignments for select
using (
  public.is_admin()
  or poster_id = auth.uid()
  or remover_id = auth.uid()
);

-- Messages policies
drop policy if exists "messages_read_job_participant_or_admin" on public.messages;
create policy "messages_read_job_participant_or_admin"
on public.messages for select
using (
  public.is_admin()
  or sender_id = auth.uid()
  or recipient_id = auth.uid()
);

drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
on public.messages for insert
with check (
  public.is_admin()
  or sender_id = auth.uid()
);

-- Disputes policies
drop policy if exists "disputes_read_participant_or_admin" on public.disputes;
create policy "disputes_read_participant_or_admin"
on public.disputes for select
using (
  public.is_admin()
  or opened_by = auth.uid()
  or exists (select 1 from public.jobs j where j.id = disputes.job_id and j.poster_id = auth.uid())
  or exists (select 1 from public.job_assignments a where a.job_id = disputes.job_id and a.remover_id = auth.uid() and a.canceled_at is null)
);

drop policy if exists "disputes_insert_participant" on public.disputes;
create policy "disputes_insert_participant"
on public.disputes for insert
with check (
  public.is_admin()
  or opened_by = auth.uid()
);

drop policy if exists "disputes_update_admin" on public.disputes;
create policy "disputes_update_admin"
on public.disputes for update
using (public.is_admin())
with check (public.is_admin());

-- Reports policies
drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
on public.reports for insert
with check (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports_read_admin" on public.reports;
create policy "reports_read_admin"
on public.reports for select
using (public.is_admin());

-- Notifications policies
drop policy if exists "notifications_read_own_or_admin" on public.notifications;
create policy "notifications_read_own_or_admin"
on public.notifications for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own_or_admin" on public.notifications;
create policy "notifications_update_own_or_admin"
on public.notifications for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- Ratings policies
drop policy if exists "ratings_read_public" on public.ratings;
create policy "ratings_read_public"
on public.ratings for select
using (true);

drop policy if exists "ratings_insert_participant" on public.ratings;
create policy "ratings_insert_participant"
on public.ratings for insert
with check (rater_id = auth.uid() or public.is_admin());

commit;

-- -------------------------
-- Storage bucket + policies
-- Runs outside the main transaction so a storage initialisation error
-- cannot roll back the table/RLS DDL above.
-- -------------------------
do $storage$
begin
  insert into storage.buckets (id, name, public)
  values ('job-photos', 'job-photos', false)
  on conflict (id) do nothing;
exception when others then
  raise warning 'storage.buckets insert skipped (storage may not be enabled yet): %', sqlerrm;
end $storage$;

-- Allow reading job photos when job is open OR participant/admin.
do $policy_read$
begin
  drop policy if exists "job_photos_read_open_or_participant" on storage.objects;
  create policy "job_photos_read_open_or_participant"
  on storage.objects for select
  using (
    bucket_id = 'job-photos'
    and (
      exists (
        select 1
        from public.job_photos jp
        join public.jobs j on j.id = jp.job_id
        where jp.storage_path = storage.objects.name
          and j.status = 'open'::public.job_status
      )
      or exists (
        select 1
        from public.job_photos jp
        join public.jobs j on j.id = jp.job_id
        where jp.storage_path = storage.objects.name
          and j.poster_id = auth.uid()
      )
      or exists (
        select 1
        from public.job_photos jp
        join public.job_assignments a on a.job_id = jp.job_id
        where jp.storage_path = storage.objects.name
          and a.remover_id = auth.uid()
          and a.canceled_at is null
      )
      or public.is_admin()
    )
  );
exception when others then
  raise warning 'storage.objects policy "job_photos_read_open_or_participant" skipped: %', sqlerrm;
end $policy_read$;

-- Allow poster to upload into job-photos/<job_id>/...
do $policy_upload$
begin
  drop policy if exists "job_photos_upload_poster" on storage.objects;
  create policy "job_photos_upload_poster"
  on storage.objects for insert
  with check (
    bucket_id = 'job-photos'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.jobs j
        where j.id::text = (storage.foldername(storage.objects.name))[1]
          and j.poster_id = auth.uid()
      )
    )
  );
exception when others then
  raise warning 'storage.objects policy "job_photos_upload_poster" skipped: %', sqlerrm;
end $policy_upload$;

do $policy_delete$
begin
  drop policy if exists "job_photos_delete_poster" on storage.objects;
  create policy "job_photos_delete_poster"
  on storage.objects for delete
  using (
    bucket_id = 'job-photos'
    and (
      public.is_admin()
      or exists (
        select 1
        from public.jobs j
        where j.id::text = (storage.foldername(storage.objects.name))[1]
          and j.poster_id = auth.uid()
      )
    )
  );
exception when others then
  raise warning 'storage.objects policy "job_photos_delete_poster" skipped: %', sqlerrm;
end $policy_delete$;

