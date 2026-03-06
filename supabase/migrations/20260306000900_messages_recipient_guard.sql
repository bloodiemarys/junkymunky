begin;

-- Tighten messages insert policy: recipient must be a valid participant for that job.
drop policy if exists "messages_insert_sender" on public.messages;

create policy "messages_insert_sender"
on public.messages for insert
with check (
  public.is_admin()
  or (
    sender_id = auth.uid()
    and recipient_id <> sender_id
    and (
      -- poster messaging a bidder or assigned remover
      (
        exists (
          select 1
          from public.jobs j
          where j.id = messages.job_id
            and j.poster_id = sender_id
        )
        and (
          exists (
            select 1
            from public.bids b
            where b.job_id = messages.job_id
              and b.remover_id = recipient_id
          )
          or exists (
            select 1
            from public.job_assignments a
            where a.job_id = messages.job_id
              and a.remover_id = recipient_id
              and a.canceled_at is null
          )
        )
      )
      or
      -- remover messaging the poster (bidder or assigned)
      (
        recipient_id in (
          select j.poster_id from public.jobs j where j.id = messages.job_id
        )
        and (
          exists (
            select 1 from public.bids b
            where b.job_id = messages.job_id and b.remover_id = sender_id
          )
          or exists (
            select 1 from public.job_assignments a
            where a.job_id = messages.job_id and a.remover_id = sender_id and a.canceled_at is null
          )
        )
      )
    )
  )
);

commit;

