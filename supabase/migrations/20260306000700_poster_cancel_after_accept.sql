begin;

-- Allow poster to cancel after acceptance if remover hasn't started (accepted -> canceled).
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
    if old.status = 'accepted'::public.job_status and new.status in ('canceled'::public.job_status, 'disputed'::public.job_status) then
      return new;
    end if;
    if old.status in ('en_route'::public.job_status, 'arrived'::public.job_status, 'picked_up'::public.job_status)
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

commit;

