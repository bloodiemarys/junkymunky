begin;

-- Hide flagged open jobs from public/removers at RLS layer.
drop policy if exists "jobs_read_open_or_participant_or_admin" on public.jobs;
create policy "jobs_read_open_or_participant_or_admin"
on public.jobs for select
using (
  public.is_admin()
  or poster_id = auth.uid()
  or exists (
    select 1 from public.job_assignments a
    where a.job_id = jobs.id
      and a.remover_id = auth.uid()
      and a.canceled_at is null
  )
  or (status = 'open'::public.job_status and coalesce(is_flagged,false) = false)
);

-- Job photos table select: if job is open AND not flagged, or participant/admin.
drop policy if exists "job_photos_read_open_or_participant_or_admin" on public.job_photos;
create policy "job_photos_read_open_or_participant_or_admin"
on public.job_photos for select
using (
  public.is_admin()
  or exists (
    select 1 from public.jobs j
    where j.id = job_photos.job_id
      and j.status = 'open'::public.job_status
      and coalesce(j.is_flagged,false) = false
  )
  or exists (select 1 from public.jobs j where j.id = job_photos.job_id and j.poster_id = auth.uid())
  or exists (select 1 from public.job_assignments a where a.job_id = job_photos.job_id and a.remover_id = auth.uid() and a.canceled_at is null)
);

-- Bids insert: only on open + not flagged jobs.
drop policy if exists "bids_insert_remover" on public.bids;
create policy "bids_insert_remover"
on public.bids for insert
with check (
  public.is_admin()
  or (remover_id = auth.uid()
      and exists (
        select 1
        from public.jobs j
        where j.id = bids.job_id
          and j.status = 'open'::public.job_status
          and coalesce(j.is_flagged,false) = false
      ))
);

-- Storage read policy for job photos: require open + not flagged when unaffiliated.
drop policy if exists "job_photos_read_open_or_participant" on storage.objects;
create policy "job_photos_read_open_or_participant"
on storage.objects for select
using (
  bucket_id = 'job-photos'
  and (
    exists (
      select 1
      from public.job_photos jp
      join public.jobs j on j.id = jp.job_id
      where jp.storage_path = storage.objects.name
        and j.status = 'open'::public.job_status
        and coalesce(j.is_flagged,false) = false
    )
    or exists (
      select 1
      from public.job_photos jp
      join public.jobs j on j.id = jp.job_id
      where jp.storage_path = storage.objects.name
        and j.poster_id = auth.uid()
    )
    or exists (
      select 1
      from public.job_photos jp
      join public.job_assignments a on a.job_id = jp.job_id
      where jp.storage_path = storage.objects.name
        and a.remover_id = auth.uid()
        and a.canceled_at is null
    )
    or public.is_admin()
  )
);

commit;

