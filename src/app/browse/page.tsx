import Link from "next/link";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobPhoto } from "@/components/JobPhoto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BrowseForm } from "./BrowseForm";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string }>;
}) {
  const { zip } = await searchParams;
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("jobs")
    .select("id,title,category,size,reusable_ok,city,state,zip,created_at,status")
    .eq("status", "open")
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (zip && zip.trim()) {
    const trimmed = zip.trim();
    if (/^\d+$/.test(trimmed)) {
      query = query.ilike("zip", `${trimmed}%`);
    } else {
      query = query.eq("zip", trimmed);
    }
  }
  const { data: jobs, error } = await query;

  const jobIds = (jobs ?? []).map((j) => j.id);
  type PhotoRow = { job_id: string; storage_path: string; created_at: string };
  const { data: photos } = jobIds.length
    ? await supabase
        .from("job_photos")
        .select("job_id,storage_path,created_at")
        .in("job_id", jobIds)
        .order("created_at", { ascending: true })
    : { data: [] as PhotoRow[] };

  const firstPhotoByJob = new Map<string, string>();
  for (const p of photos ?? []) {
    if (!firstPhotoByJob.has(p.job_id)) firstPhotoByJob.set(p.job_id, p.storage_path);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Browse jobs</h1>
        <p className="mt-3 text-sm text-red-600">
          Failed to load jobs: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Browse open jobs</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            View listings. Sign in to bid or message posters.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Suspense fallback={<span className="text-zinc-500">Loading…</span>}>
            <BrowseForm zip={zip} />
          </Suspense>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(jobs ?? []).map((job) => (
          <Card key={job.id} className="flex flex-col">
            <CardHeader>
              {firstPhotoByJob.get(job.id) ? (
                <JobPhoto
                  storagePath={firstPhotoByJob.get(job.id)!}
                  alt={job.title}
                  className="mb-4 aspect-[16/10]"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="line-clamp-2">{job.title}</CardTitle>
                {job.reusable_ok ? <Badge variant="success">Reusable</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {job.city}, {job.state} {job.zip}
              </p>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge>{job.category}</Badge>
                <Badge>{job.size}</Badge>
              </div>
              <div className="mt-4">
                <Button asChild className="w-full" variant="secondary">
                  <Link href={`/browse/${job.id}`}>View details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

