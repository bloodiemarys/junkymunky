begin;

-- Service-role-only role setter (bootstrap + admin tooling)
create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role_required';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_role(uuid, public.user_role) from public;

commit;

