begin;

-- Atomic finalize: create assignment + accept bid + update job status.
-- Should be invoked server-side after Stripe authorization is verified.
create or replace function public.finalize_authorized_assignment(
  p_job_id uuid,
  p_bid_id uuid,
  p_payment_intent_id text,
  p_authorized_at timestamptz,
  p_capture_deadline_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
  v_bid public.bids%rowtype;
  v_existing public.job_assignments%rowtype;
  v_amount int;
  v_platform_fee int;
  v_payout int;
  v_assignment_id uuid;
begin
  -- Lock job row to prevent concurrent accepts.
  select * into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'job_not_found';
  end if;

  if v_job.status <> 'open'::public.job_status then
    raise exception 'job_not_open';
  end if;

  -- Lock bid row.
  select * into v_bid
  from public.bids
  where id = p_bid_id
    and job_id = p_job_id
  for update;

  if not found then
    raise exception 'bid_not_found';
  end if;

  if v_bid.status <> 'active'::public.bid_status then
    raise exception 'bid_not_active';
  end if;

  -- Idempotency: if an assignment already exists, only allow returning it
  -- if it's for this payment_intent_id.
  select * into v_existing
  from public.job_assignments a
  where a.job_id = p_job_id
  limit 1;

  if found then
    if v_existing.payment_intent_id = p_payment_intent_id then
      return v_existing.id;
    end if;
    raise exception 'job_already_assigned';
  end if;

  v_amount := v_bid.amount_cents;
  v_platform_fee := round(v_amount * 0.15);
  v_payout := v_amount - v_platform_fee;

  insert into public.job_assignments (
    job_id,
    bid_id,
    remover_id,
    poster_id,
    payment_intent_id,
    amount_cents,
    platform_fee_cents,
    payout_cents,
    authorized_at,
    capture_deadline_at
  ) values (
    p_job_id,
    p_bid_id,
    v_bid.remover_id,
    v_job.poster_id,
    p_payment_intent_id,
    v_amount,
    v_platform_fee,
    v_payout,
    p_authorized_at,
    p_capture_deadline_at
  )
  returning id into v_assignment_id;

  -- Accept the winning bid; decline all other active bids.
  update public.bids
  set status = case when id = p_bid_id then 'accepted'::public.bid_status else 'declined'::public.bid_status end,
      updated_at = now()
  where job_id = p_job_id
    and status = 'active'::public.bid_status;

  -- Update job status to accepted (guard trigger ensures assignment exists).
  update public.jobs
  set status = 'accepted'::public.job_status,
      updated_at = now()
  where id = p_job_id;

  return v_assignment_id;
end;
$$;

revoke all on function public.finalize_authorized_assignment(uuid, uuid, text, timestamptz, timestamptz) from public;

commit;

