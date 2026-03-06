import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminRemoveJobAction } from "@/app/admin/jobs/actions";

type ReportRow = {
  id: string;
  job_id: string;
  type: string;
  notes: string | null;
  created_at: string;
};

export default async function AdminModerationPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id,title,status,is_flagged,flagged_reason,flagged_at,created_at,city,state,zip")
    .eq("is_flagged", true)
    .order("flagged_at", { ascending: false })
    .limit(200);

  const { data: reports } = await supabase
    .from("reports")
    .select("id,job_id,type,notes,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const reportsByJob = new Map<string, ReportRow[]>();
  for (const r of (reports ?? []) as ReportRow[]) {
    reportsByJob.set(r.job_id, [...(reportsByJob.get(r.job_id) ?? []), r]);
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Moderation</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Flagged jobs and user reports.
      </p>

      <div className="mt-8 grid gap-3">
        {(jobs ?? []).map((j) => (
          <Card key={j.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{j.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge>{j.status}</Badge>
                  <Badge variant="warning">Flagged</Badge>
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {j.city}, {j.state} {j.zip} • {j.flagged_reason ?? "unknown"}
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(reportsByJob.get(j.id) ?? []).length ? (
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Reports</p>
                  {(reportsByJob.get(j.id) ?? []).slice(0, 3).map((r) => (
                    <div key={r.id} className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <Badge>{r.type}</Badge>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      {r.notes ? <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{r.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/jobs/${j.id}`}>Open job</Link>
                </Button>
                <form
                  action={async () => {
                    "use server";
                    await adminRemoveJobAction({ jobId: j.id, reason: "moderation_removed" });
                  }}
                >
                  <Button type="submit" variant="destructive" size="sm">
                    Remove job
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

