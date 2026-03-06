begin;

-- Helper RPC to increment completed jobs counter (service_role/admin usage)
create or replace function public.increment_completed_jobs_count(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.remover_profiles(remover_id, completed_jobs_count)
  values (p_remover_id, 1)
  on conflict (remover_id)
  do update set completed_jobs_count = public.remover_profiles.completed_jobs_count + 1,
                updated_at = now();
end;
$$;

revoke all on function public.increment_completed_jobs_count(uuid) from public;

commit;

