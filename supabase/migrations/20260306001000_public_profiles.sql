begin;

-- Public profile summary table (no sensitive fields).
create table if not exists public.public_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  role public.user_role not null,
  display_name text,
  avatar_url text,
  company_name text,
  rating_avg numeric(3,2),
  completed_jobs_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_profiles enable row level security;

drop trigger if exists trg_public_profiles_set_updated_at on public.public_profiles;
create trigger trg_public_profiles_set_updated_at
before update on public.public_profiles
for each row execute function public.set_updated_at();

-- Sync from profiles/remover_profiles.
create or replace function public.sync_public_profile_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.public_profiles (id, role, display_name, avatar_url)
  values (new.id, new.role, new.full_name, new.avatar_url)
  on conflict (id) do update
    set role = excluded.role,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_public_profile_from_remover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.public_profiles (id, role, company_name, rating_avg, completed_jobs_count)
  values (new.remover_id, 'remover'::public.user_role, new.company_name, new.rating_avg, new.completed_jobs_count)
  on conflict (id) do update
    set company_name = excluded.company_name,
        rating_avg = excluded.rating_avg,
        completed_jobs_count = excluded.completed_jobs_count,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_sync_public on public.profiles;
create trigger trg_profiles_sync_public
after insert or update of role, full_name, avatar_url
on public.profiles
for each row execute function public.sync_public_profile_from_profiles();

drop trigger if exists trg_remover_profiles_sync_public on public.remover_profiles;
create trigger trg_remover_profiles_sync_public
after insert or update of company_name, rating_avg, completed_jobs_count
on public.remover_profiles
for each row execute function public.sync_public_profile_from_remover();

-- Readable by anyone (public marketplace identities)
drop policy if exists "public_profiles_read_all" on public.public_profiles;
create policy "public_profiles_read_all"
on public.public_profiles for select
using (true);

-- Prevent direct writes by clients
drop policy if exists "public_profiles_no_client_writes" on public.public_profiles;
create policy "public_profiles_no_client_writes"
on public.public_profiles for all
using (public.is_admin())
with check (public.is_admin());

commit;

