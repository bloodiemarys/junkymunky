import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminResolveDisputeAction } from "./actions";

type DisputeRow = {
  id: string;
  job_id: string;
  opened_by: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  jobs?: { id: string; title: string; status: string } | { id: string; title: string; status: string }[] | null;
};

export default async function AdminDisputesPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: disputes, error } = await supabase
    .from("disputes")
    .select("id,job_id,opened_by,reason,status,admin_notes,created_at, jobs!inner(id,title,status)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disputes</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Disputes</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Resolving disputes controls capture and refunds.</p>

      <div className="mt-8 grid gap-3">
        {((disputes ?? []) as unknown as DisputeRow[]).map((d) => {
          const job = Array.isArray(d.jobs) ? d.jobs[0] : d.jobs ?? null;
          return (
            <Card key={d.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{job?.title ?? d.job_id}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge>{d.status}</Badge>
                    <Badge variant="warning">{job?.status ?? "job"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{d.reason}</p>
                {d.admin_notes ? (
                  <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    Admin notes: {d.admin_notes}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/jobs/${d.job_id}`}>Open job</Link>
                  </Button>
                  <form
                    action={async () => {
                      "use server";
                      await adminResolveDisputeAction({ disputeId: d.id, resolution: "capture" });
                    }}
                  >
                    <Button type="submit" size="sm" variant="secondary">
                      Resolve: capture & payout
                    </Button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await adminResolveDisputeAction({ disputeId: d.id, resolution: "refund" });
                    }}
                  >
                    <Button type="submit" size="sm" variant="destructive">
                      Resolve: refund
                    </Button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await adminResolveDisputeAction({ disputeId: d.id, resolution: "cancel" });
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      Resolve: cancel job
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

