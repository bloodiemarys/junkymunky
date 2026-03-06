begin;

-- Helper to read JWT role (service_role vs authenticated)
create or replace function public.request_jwt_role()
returns text
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '');
$$;

-- Prevent role escalation; allow poster->remover self-transition
create or replace function public.prevent_illegal_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role then
    if public.request_jwt_role() = 'service_role' or public.is_admin() then
      return new;
    end if;

    if old.role = 'poster'::public.user_role and new.role = 'remover'::public.user_role then
      return new;
    end if;

    raise exception 'role_change_not_allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_illegal_role_change on public.profiles;
create trigger trg_profiles_prevent_illegal_role_change
before update of role on public.profiles
for each row execute function public.prevent_illegal_role_change();

-- Stripe Connect status fields
alter table public.profiles
  add column if not exists stripe_connect_details_submitted boolean not null default false,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false;

-- Allow assigned remover to update job status (and only status-related columns they touch via app).
drop policy if exists "jobs_update_poster_when_not_completed" on public.jobs;
drop policy if exists "jobs_update_poster" on public.jobs;
drop policy if exists "jobs_update_assigned_remover" on public.jobs;

create policy "jobs_update_poster"
on public.jobs for update
using (poster_id = auth.uid() or public.is_admin())
with check (poster_id = auth.uid() or public.is_admin());

create policy "jobs_update_assigned_remover"
on public.jobs for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.job_assignments a
    where a.job_id = jobs.id
      and a.remover_id = auth.uid()
      and a.canceled_at is null
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.job_assignments a
    where a.job_id = jobs.id
      and a.remover_id = auth.uid()
      and a.canceled_at is null
  )
);

-- Enforce status transitions (allows service_role/admin to bypass)
create or replace function public.enforce_job_status_transition()
returns trigger
language plpgsql
as $$
declare
  v_is_assigned_remover boolean;
begin
  if new.status = old.status then
    return new;
  end if;

  if public.request_jwt_role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if old.status = 'completed'::public.job_status then
    raise exception 'job_already_completed';
  end if;

  v_is_assigned_remover := exists (
    select 1
    from public.job_assignments a
    where a.job_id = old.id
      and a.remover_id = auth.uid()
      and a.canceled_at is null
  );

  -- Poster transitions
  if auth.uid() = old.poster_id then
    if old.status = 'open'::public.job_status and new.status in ('canceled'::public.job_status, 'disputed'::public.job_status) then
      return new;
    end if;
    if old.status in ('accepted'::public.job_status, 'en_route'::public.job_status, 'arrived'::public.job_status, 'picked_up'::public.job_status)
      and new.status = 'disputed'::public.job_status then
      return new;
    end if;
    raise exception 'poster_status_transition_not_allowed';
  end if;

  -- Remover transitions
  if v_is_assigned_remover then
    if old.status = 'accepted'::public.job_status and new.status in ('en_route'::public.job_status, 'canceled'::public.job_status, 'disputed'::public.job_status) then
      return new;
    end if;
    if old.status = 'en_route'::public.job_status and new.status in ('arrived'::public.job_status, 'disputed'::public.job_status) then
      return new;
    end if;
    if old.status = 'arrived'::public.job_status and new.status in ('picked_up'::public.job_status, 'disputed'::public.job_status) then
      return new;
    end if;
    raise exception 'remover_status_transition_not_allowed';
  end if;

  raise exception 'status_transition_not_allowed';
end;
$$;

drop trigger if exists trg_jobs_enforce_status_transition on public.jobs;
create trigger trg_jobs_enforce_status_transition
before update of status on public.jobs
for each row execute function public.enforce_job_status_transition();

commit;

