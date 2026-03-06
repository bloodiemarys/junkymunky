begin;

-- Rework ratings RLS: only participants can rate each other on completed jobs.
drop policy if exists "ratings_insert_participant" on public.ratings;
drop policy if exists "ratings_insert_participant_on_completed_job" on public.ratings;

create policy "ratings_insert_participant_on_completed_job"
on public.ratings for insert
with check (
  public.is_admin()
  or (
    rater_id = auth.uid()
    and exists (
      select 1
      from public.jobs j
      where j.id = ratings.job_id
        and j.status = 'completed'::public.job_status
        and (
          (j.poster_id = ratings.rater_id and exists (
            select 1 from public.job_assignments a
            where a.job_id = j.id and a.remover_id = ratings.ratee_id and a.canceled_at is null
          ))
          or
          (exists (
            select 1 from public.job_assignments a
            where a.job_id = j.id and a.remover_id = ratings.rater_id and a.canceled_at is null
          ) and j.poster_id = ratings.ratee_id)
        )
    )
  )
);

-- Optional: allow rater to see ratings they wrote and ratings about them (already public via select policy).

-- Maintain remover rating average on insert/update of ratings.
create or replace function public.update_remover_rating_avg(p_remover_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avg numeric(3,2);
begin
  select coalesce(round(avg(score)::numeric, 2), 0) into v_avg
  from public.ratings r
  where r.ratee_id = p_remover_id;

  insert into public.remover_profiles(remover_id, rating_avg)
  values (p_remover_id, v_avg)
  on conflict (remover_id)
  do update set rating_avg = excluded.rating_avg,
                updated_at = now();
end;
$$;

revoke all on function public.update_remover_rating_avg(uuid) from public;

create or replace function public.trg_ratings_update_rollups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  -- Only maintain rollups for removers.
  select role into v_role from public.profiles where id = new.ratee_id;
  if v_role = 'remover'::public.user_role then
    perform public.update_remover_rating_avg(new.ratee_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ratings_update_rollups on public.ratings;
create trigger trg_ratings_update_rollups
after insert or update of score on public.ratings
for each row execute function public.trg_ratings_update_rollups();

commit;

