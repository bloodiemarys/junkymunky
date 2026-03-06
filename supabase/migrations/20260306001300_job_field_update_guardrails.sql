begin;

-- Prevent non-admins from altering moderation flags on jobs.
create or replace function public.prevent_job_moderation_field_edits()
returns trigger
language plpgsql
as $$
begin
  if public.request_jwt_role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  -- Only admins/service can change moderation fields.
  if (new.is_flagged is distinct from old.is_flagged)
     or (new.flagged_reason is distinct from old.flagged_reason)
     or (new.flagged_at is distinct from old.flagged_at)
  then
    raise exception 'moderation_fields_not_editable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jobs_prevent_moderation_field_edits on public.jobs;
create trigger trg_jobs_prevent_moderation_field_edits
before update on public.jobs
for each row execute function public.prevent_job_moderation_field_edits();

-- Prevent assigned remover from editing job fields beyond status updates.
create or replace function public.prevent_remover_job_field_edits()
returns trigger
language plpgsql
as $$
declare
  v_uid uuid := auth.uid();
  v_is_assigned boolean;
  v_old jsonb;
  v_new jsonb;
begin
  if public.request_jwt_role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Posters can edit their job details (subject to status transition rules elsewhere).
  if v_uid = old.poster_id then
    return new;
  end if;

  v_is_assigned := exists (
    select 1 from public.job_assignments a
    where a.job_id = old.id
      and a.remover_id = v_uid
      and a.canceled_at is null
  );

  if not v_is_assigned then
    -- Not poster or assigned remover; must be blocked by RLS but guard anyway.
    raise exception 'not_allowed';
  end if;

  -- Assigned remover may only change status (picked_up_at may be set by trigger).
  v_old := to_jsonb(old) - 'status' - 'updated_at' - 'picked_up_at';
  v_new := to_jsonb(new) - 'status' - 'updated_at' - 'picked_up_at';
  if v_new is distinct from v_old then
    raise exception 'remover_cannot_edit_job_fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jobs_prevent_remover_field_edits on public.jobs;
create trigger trg_jobs_prevent_remover_field_edits
before update on public.jobs
for each row execute function public.prevent_remover_job_field_edits();

commit;

