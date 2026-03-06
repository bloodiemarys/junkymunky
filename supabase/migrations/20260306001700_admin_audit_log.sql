begin;

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log(created_at desc);
create index if not exists idx_admin_audit_log_entity on public.admin_audit_log(entity_type, entity_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_read_admin" on public.admin_audit_log;
create policy "admin_audit_log_read_admin"
on public.admin_audit_log for select
using (public.is_admin());

drop policy if exists "admin_audit_log_insert_admin" on public.admin_audit_log;
create policy "admin_audit_log_insert_admin"
on public.admin_audit_log for insert
with check (public.is_admin() and admin_id = auth.uid());

commit;

