begin;

-- Backfill public_profiles for existing rows.
insert into public.public_profiles (id, role, display_name, avatar_url, created_at, updated_at)
select p.id, p.role, p.full_name, p.avatar_url, now(), now()
from public.profiles p
on conflict (id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

update public.public_profiles pp
set company_name = rp.company_name,
    rating_avg = rp.rating_avg,
    completed_jobs_count = rp.completed_jobs_count,
    updated_at = now()
from public.remover_profiles rp
where rp.remover_id = pp.id;

-- In-app notification on new message (recipient only). Email is handled app-side.
create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, type, payload)
  values (
    new.recipient_id,
    'message_received'::public.notification_type,
    jsonb_build_object('job_id', new.job_id, 'message_id', new.id, 'sender_id', new.sender_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_messages_notify_insert on public.messages;
create trigger trg_messages_notify_insert
after insert on public.messages
for each row execute function public.notify_on_message_insert();

commit;

