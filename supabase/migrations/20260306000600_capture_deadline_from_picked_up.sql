begin;

-- Capture deadline should start at picked_up time, not authorization time.
alter table public.job_assignments
  alter column capture_deadline_at drop not null;

alter table public.jobs
  add column if not exists picked_up_at timestamptz;

create or replace function public.set_picked_up_and_deadline()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'picked_up'::public.job_status and (old.status is distinct from new.status) then
    new.picked_up_at := coalesce(new.picked_up_at, now());

    update public.job_assignments a
    set capture_deadline_at = (now() + interval '72 hours'),
        updated_at = now()
    where a.job_id = new.id
      and a.canceled_at is null
      and a.captured_at is null
      and a.capture_deadline_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jobs_set_picked_up_and_deadline on public.jobs;
create trigger trg_jobs_set_picked_up_and_deadline
before update of status on public.jobs
for each row execute function public.set_picked_up_and_deadline();

commit;

