begin;

create or replace function public.open_dispute(
  p_job_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
  v_dispute public.disputes%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found';
  end if;

  -- Must be poster or assigned remover (or admin)
  if not public.is_admin()
     and v_job.poster_id <> v_uid
     and not exists (select 1 from public.job_assignments a where a.job_id = p_job_id and a.remover_id = v_uid and a.canceled_at is null)
  then
    raise exception 'not_allowed';
  end if;

  insert into public.disputes(job_id, opened_by, reason, status)
  values (p_job_id, v_uid, p_reason, 'open'::public.dispute_status)
  on conflict (job_id) do update
    set reason = excluded.reason,
        status = 'open'::public.dispute_status,
        updated_at = now()
  returning id into v_dispute.id;

  update public.jobs
  set status = 'disputed'::public.job_status,
      updated_at = now()
  where id = p_job_id;

  return v_dispute.id;
end;
$$;

revoke all on function public.open_dispute(uuid, text) from public;

commit;

