import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { cancelAssignmentAsRemoverAction, updateAssignmentJobStatusAction } from "./actions";
import { requestPriceAdjustmentAction, startPickupAction } from "./adjustment-actions";

const REASON_LABELS: Record<string, string> = {
  size_mismatch: "Size mismatch",
  access_issue: "Access issue",
  unlisted_items: "Unlisted items",
  hazardous_items: "Hazardous items",
  other: "Other",
};

type AssignmentRow = {
  id: string;
  job_id: string;
  amount_cents: number;
  payout_cents: number;
  payout_status: string;
  capture_deadline_at: string | null;
  started_at: string | null;
  remover_liability_confirmed_at: string | null;
  jobs:
    | { id: string; title: string; city: string; state: string; zip: string; status: string }
    | { id: string; title: string; city: string; state: string; zip: string; status: string }[];
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function RemoverAssignmentsPage() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const { data: assignments, error } = await supabase
    .from("job_assignments")
    .select(
      "id,job_id,amount_cents,payout_cents,payout_status,capture_deadline_at,captured_at,canceled_at,started_at,remover_liability_confirmed_at, jobs!inner(id,title,city,state,zip,status)"
    )
    .eq("remover_id", profile.id)
    .order("authorized_at", { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  // Load pending adjustments for all active jobs.
  const activeJobIds = ((assignments ?? []) as unknown as AssignmentRow[])
    .map((a) => a.job_id);

  const { data: pendingAdjustments } = activeJobIds.length
    ? await service
        .from("price_adjustments")
        .select("id,job_id,assignment_id,original_amount_cents,requested_amount_cents,difference_cents,reason,status,created_at")
        .in("job_id", activeJobIds)
        .in("status", ["pending"])
    : { data: [] };

  const pendingByJobId = new Map<string, NonNullable<typeof pendingAdjustments>[number]>();
  for (const pa of pendingAdjustments ?? []) {
    pendingByJobId.set(pa.job_id, pa);
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Assignments</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Jobs you've been accepted for. Update status as you progress.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/remover/jobs">Browse</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-3">
        {((assignments ?? []) as unknown as AssignmentRow[]).map((a) => {
          const job = Array.isArray(a.jobs) ? a.jobs[0] : a.jobs;
          const isStarted = Boolean(a.started_at);
          const pendingAdj = pendingByJobId.get(a.job_id);

          return (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <div className="flex gap-2">
                    {isStarted && (
                      <Badge variant="warning" className="border-orange-400 text-orange-600">
                        Price locked
                      </Badge>
                    )}
                    <Badge>{job.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {job.city}, {job.state} {job.zip}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>
                    Payout:{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {money(a.payout_cents)} ({a.payout_status})
                    </span>
                  </span>
                  {a.capture_deadline_at && (
                    <span>
                      • Deadline: {new Date(a.capture_deadline_at).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Price lock notice */}
                {!isStarted && (
                  <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                    All price changes must be requested before pickup begins.
                  </div>
                )}

                {/* Pending adjustment status */}
                {pendingAdj && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      Adjustment pending poster response
                    </p>
                    <p className="mt-1 text-amber-700 dark:text-amber-300">
                      {money(pendingAdj.original_amount_cents)} → {money(pendingAdj.requested_amount_cents)}{" "}
                      ({REASON_LABELS[pendingAdj.reason] ?? pendingAdj.reason})
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* En route — requires liability confirmation if not already done */}
                  {!a.remover_liability_confirmed_at ? (
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const confirmed = formData.get("liability_confirmed") === "on";
                        if (!confirmed) throw new Error("You must confirm compliance before marking En Route.");
                        // Confirm and update in the assignments action.
                        const service2 = createSupabaseServiceClient();
                        await service2
                          .from("job_assignments")
                          .update({ remover_liability_confirmed_at: new Date().toISOString() })
                          .eq("id", a.id);
                        await updateAssignmentJobStatusAction({ jobId: a.job_id, status: "en_route" });
                      }}
                      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <label className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <input type="checkbox" name="liability_confirmed" className="mt-0.5 h-3 w-3 flex-shrink-0" required />
                        <span>
                          I confirm I will comply with all applicable local, state, and federal laws
                          regarding waste handling and disposal.
                        </span>
                      </label>
                      <Button type="submit" variant="secondary" size="sm">Mark En Route</Button>
                    </form>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await updateAssignmentJobStatusAction({ jobId: a.job_id, status: "en_route" });
                      }}
                    >
                      <Button type="submit" variant="secondary" size="sm">En route</Button>
                    </form>
                  )}

                  <form
                    action={async () => {
                      "use server";
                      await updateAssignmentJobStatusAction({ jobId: a.job_id, status: "arrived" });
                    }}
                  >
                    <Button type="submit" variant="secondary" size="sm">Arrived</Button>
                  </form>

                  {/* Start Pickup — locks price */}
                  {!isStarted ? (
                    <form
                      action={async () => {
                        "use server";
                        await startPickupAction({ jobId: a.job_id });
                        await updateAssignmentJobStatusAction({ jobId: a.job_id, status: "picked_up" });
                      }}
                    >
                      <Button type="submit" size="sm">Start Pickup</Button>
                    </form>
                  ) : (
                    <form
                      action={async () => {
                        "use server";
                        await updateAssignmentJobStatusAction({ jobId: a.job_id, status: "picked_up" });
                      }}
                    >
                      <Button type="submit" size="sm">Picked up</Button>
                    </form>
                  )}

                  <form
                    action={async () => {
                      "use server";
                      await cancelAssignmentAsRemoverAction({ jobId: a.job_id });
                    }}
                  >
                    <Button type="submit" variant="destructive" size="sm">Cancel</Button>
                  </form>

                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/jobs/${a.job_id}`}>Open</Link>
                  </Button>
                </div>

                {/* Request adjustment (only before start, no pending adj) */}
                {!isStarted && !pendingAdj && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                      Request price adjustment
                    </summary>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const dollars = Number(formData.get("requested_amount_dollars") ?? 0);
                        await requestPriceAdjustmentAction({
                          job_id: a.job_id,
                          assignment_id: a.id,
                          requested_amount_cents: Math.round(dollars * 100),
                          reason: String(formData.get("reason") ?? "other"),
                          message: String(formData.get("message") ?? "") || undefined,
                          evidence_photo_url: String(formData.get("evidence_photo_url") ?? ""),
                        });
                      }}
                      className="mt-3 grid gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                    >
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Current amount: {money(a.amount_cents)}. Enter the new total you need.
                      </p>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium">New total ($)</label>
                        <input
                          name="requested_amount_dollars"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Reason</label>
                        <select
                          name="reason"
                          required
                          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                        >
                          <option value="size_mismatch">Size mismatch</option>
                          <option value="access_issue">Access issue</option>
                          <option value="unlisted_items">Unlisted items</option>
                          <option value="hazardous_items">Hazardous items</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Message (optional)</label>
                        <textarea
                          name="message"
                          rows={2}
                          className="w-full rounded-md border border-zinc-200 bg-white p-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                          placeholder="Describe the issue…"
                        />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-xs font-medium">Evidence photo storage path (required)</label>
                        <input
                          name="evidence_photo_url"
                          type="text"
                          required
                          className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                          placeholder="Upload photo first, paste path here"
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Upload evidence to the adjustment-evidence bucket, then paste the storage path.
                        </p>
                      </div>
                      <Button type="submit" variant="outline" size="sm">
                        Submit adjustment request
                      </Button>
                    </form>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
