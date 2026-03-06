import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function statusVariant(status: string) {
  switch (status) {
    case "open":
      return "default";
    case "accepted":
    case "en_route":
    case "arrived":
    case "picked_up":
      return "warning";
    case "completed":
      return "success";
    case "canceled":
    case "disputed":
      return "destructive";
    default:
      return "default";
  }
}

export default async function MyJobsPage() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id,title,city,state,zip,size,reusable_ok,status,created_at")
    .eq("poster_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My jobs</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My jobs</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Track bids, accept an offer, and confirm pickup to release escrow.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/post">Post a job</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(jobs ?? []).map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="line-clamp-2">{job.title}</CardTitle>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                  {job.reusable_ok ? <Badge variant="success">Reusable</Badge> : null}
                </div>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {job.city}, {job.state} {job.zip} • {job.size}
              </p>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/app/jobs/${job.id}`}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

