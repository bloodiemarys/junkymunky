import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminCancelAndRefundAction, adminForceCaptureAndPayoutAction, adminRemoveJobAction } from "./actions";

export default async function AdminJobsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: jobs, error } = await supabase
    .from("jobs")
    .select("id,title,city,state,zip,status,is_flagged,flagged_reason,created_at,poster_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Review job lifecycle, disputes, and moderation flags.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {(jobs ?? []).map((j) => (
          <Card key={j.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{j.title}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge>{j.status}</Badge>
                  {j.is_flagged ? <Badge variant="warning">Flagged</Badge> : null}
                </div>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {j.city}, {j.state} {j.zip} {j.flagged_reason ? `• flag: ${j.flagged_reason}` : ""}
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/jobs/${j.id}`}>Open in app</Link>
              </Button>
              <form
                action={async () => {
                  "use server";
                  await adminForceCaptureAndPayoutAction({ jobId: j.id });
                }}
              >
                <Button type="submit" size="sm" variant="secondary">
                  Force capture & payout
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await adminCancelAndRefundAction({ jobId: j.id });
                }}
              >
                <Button type="submit" size="sm" variant="destructive">
                  Cancel & refund
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await adminRemoveJobAction({ jobId: j.id, reason: "admin_removed" });
                }}
              >
                <Button type="submit" size="sm" variant="outline">
                  Remove job
                </Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

