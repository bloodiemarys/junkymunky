begin;

-- Prevent bid edits after creation (except withdrawing).
create or replace function public.prevent_illegal_bid_updates()
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

  -- Must be the remover who created the bid (RLS also enforces).
  if auth.uid() <> old.remover_id then
    raise exception 'not_allowed';
  end if;

  -- Only allow status change active->withdrawn. No other field changes.
  if new.status <> old.status then
    if not (old.status = 'active'::public.bid_status and new.status = 'withdrawn'::public.bid_status) then
      raise exception 'bid_status_transition_not_allowed';
    end if;
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'bid_fields_not_editable';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bids_prevent_illegal_updates on public.bids;
create trigger trg_bids_prevent_illegal_updates
before update on public.bids
for each row execute function public.prevent_illegal_bid_updates();

commit;

