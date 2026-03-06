import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function RemoverBrowseJobsPage() {
  await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id,title,category,size,reusable_ok,city,state,zip,status,created_at")
    .eq("status", "open")
    .eq("is_flagged", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Browse jobs</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Browse open jobs</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Open a job to place a bid.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/remover/onboarding">Payout setup</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(jobs ?? []).map((job) => (
          <Card key={job.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="line-clamp-2">{job.title}</CardTitle>
                {job.reusable_ok ? <Badge variant="success">Reusable</Badge> : null}
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {job.city}, {job.state} {job.zip}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge>{job.category}</Badge>
                <Badge>{job.size}</Badge>
              </div>
              <Button asChild className="mt-4 w-full" variant="secondary">
                <Link href={`/app/jobs/${job.id}`}>Open & bid</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

