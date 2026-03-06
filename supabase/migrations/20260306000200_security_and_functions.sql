begin;

-- Keyword flagging helper (simple; can be expanded)
create or replace function public.contains_banned_keywords(input text)
returns boolean
language plpgsql
immutable
as $$
declare
  t text := lower(coalesce(input, ''));
begin
  return
    t ~ '\\b(asbestos|needles|syringe|biohazard|medical waste|explosive|ammunition|grenade|gunpowder|chemical|hazmat|radioactive|meth|cocaine|heroin)\\b';
end;
$$;

create or replace function public.flag_job_if_needed()
returns trigger
language plpgsql
as $$
declare
  combined text;
begin
  combined := coalesce(new.title,'') || ' ' || coalesce(new.description,'') || ' ' || coalesce(new.category,'') || ' ' || coalesce(new.location_instructions,'');
  if public.contains_banned_keywords(combined) then
    new.is_flagged := true;
    new.flagged_reason := 'keyword';
    new.flagged_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jobs_flag_keywords on public.jobs;
create trigger trg_jobs_flag_keywords
before insert or update of title, description, category, location_instructions
on public.jobs
for each row execute function public.flag_job_if_needed();

-- Tighten message insert policy: only job participants can message.
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender"
on public.messages for insert
with check (
  public.is_admin()
  or (
    sender_id = auth.uid()
    and (
      exists (
        select 1
        from public.jobs j
        where j.id = messages.job_id
          and j.poster_id = auth.uid()
      )
      or exists (
        select 1
        from public.bids b
        where b.job_id = messages.job_id
          and b.remover_id = auth.uid()
      )
      or exists (
        select 1
        from public.job_assignments a
        where a.job_id = messages.job_id
          and a.remover_id = auth.uid()
          and a.canceled_at is null
      )
    )
  )
);

-- Prevent posters from directly setting accepted/completed without server actions by blocking updates when moving into "accepted" if no assignment exists.
-- This is a guardrail; privileged updates should use service role and create assignment first.
create or replace function public.enforce_accept_requires_assignment()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'accepted'::public.job_status then
    if not exists (select 1 from public.job_assignments a where a.job_id = new.id and a.canceled_at is null) then
      raise exception 'Cannot set job to accepted without assignment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jobs_accept_requires_assignment on public.jobs;
create trigger trg_jobs_accept_requires_assignment
before update of status on public.jobs
for each row execute function public.enforce_accept_requires_assignment();

commit;

