import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { adminForceResolveAdjustmentAction, adminSetVisibilityTierAction } from "./actions";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const REASON_LABELS: Record<string, string> = {
  size_mismatch: "Size mismatch",
  access_issue: "Access issue",
  unlisted_items: "Unlisted items",
  hazardous_items: "Hazardous items",
  other: "Other",
};

const TIER_BADGE: Record<string, string> = {
  normal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  reduced: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default async function AdminAdjustmentsPage() {
  await requireAdmin();
  const service = createSupabaseServiceClient();

  const [
    { data: pending },
    { data: recent },
    { data: flaggedRemovers },
  ] = await Promise.all([
    service
      .from("price_adjustments")
      .select("id,job_id,remover_id,original_amount_cents,requested_amount_cents,difference_cents,reason,message,evidence_photo_url,status,created_at,expires_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    service
      .from("price_adjustments")
      .select("id,job_id,remover_id,original_amount_cents,requested_amount_cents,status,reason,resolved_at,created_at")
      .in("status", ["accepted", "declined", "expired"])
      .order("created_at", { ascending: false })
      .limit(50),
    service
      .from("remover_metrics")
      .select("remover_id,total_adjustment_requests,accepted_adjustments,declined_adjustments,disputes_count,cancellations_count,late_cancellations,abuse_score")
      .order("abuse_score", { ascending: false })
      .limit(25),
  ]);

  // Load visibility tiers for flagged removers.
  const removerIds = (flaggedRemovers ?? []).map((r) => r.remover_id);
  const { data: removerTiers } = removerIds.length
    ? await service
        .from("remover_profiles")
        .select("remover_id,visibility_tier,is_flagged,company_name")
        .in("remover_id", removerIds)
    : { data: [] };

  const tierByRemover = new Map<string, { visibility_tier: string; is_flagged: boolean; company_name: string | null }>();
  for (const rt of removerTiers ?? []) {
    tierByRemover.set(rt.remover_id, rt);
  }

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Adjustments</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pending price adjustments and remover abuse tracking.
        </p>
      </div>

      {/* Pending adjustments */}
      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Pending adjustments ({(pending ?? []).length})
        </h2>
        {(pending ?? []).length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">None pending.</p>
        ) : (
          <div className="grid gap-4">
            {(pending ?? []).map((adj) => (
              <Card key={adj.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">
                      {REASON_LABELS[adj.reason] ?? adj.reason}
                    </CardTitle>
                    <Badge>pending</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Job: {adj.job_id} • Remover: {adj.remover_id.slice(0, 8)}… • Expires:{" "}
                    {new Date(adj.expires_at).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex flex-wrap gap-6 text-sm">
                    <span>
                      Original: <strong>{money(adj.original_amount_cents)}</strong>
                    </span>
                    <span>
                      Requested: <strong>{money(adj.requested_amount_cents)}</strong>
                    </span>
                    <span>
                      Difference: <strong>+{money(adj.difference_cents)}</strong>
                    </span>
                  </div>
                  {adj.message && (
                    <p className="whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-900">
                      {adj.message}
                    </p>
                  )}
                  {adj.evidence_photo_url && (
                    <div>
                      <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Evidence</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/adjustment-photo?path=${encodeURIComponent(adj.evidence_photo_url)}`}
                        alt="Evidence"
                        className="max-h-48 rounded-md object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const reason = String(formData.get("reason") ?? "Admin override");
                        await adminForceResolveAdjustmentAction({
                          adjustmentId: adj.id,
                          action: "accept",
                          reason,
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="reason" value="Admin approved" />
                      <Button type="submit" size="sm">Force accept</Button>
                    </form>
                    <form
                      action={async (formData: FormData) => {
                        "use server";
                        const reason = String(formData.get("reason") ?? "Admin override");
                        await adminForceResolveAdjustmentAction({
                          adjustmentId: adj.id,
                          action: "decline",
                          reason,
                        });
                      }}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="reason" value="Admin declined" />
                      <Button type="submit" variant="destructive" size="sm">Force decline & cancel</Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Recent resolved */}
      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Recent resolved</h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Job</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Original</th>
                <th className="px-4 py-3 text-left font-medium">Requested</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(recent ?? []).map((adj) => (
                <tr key={adj.id}>
                  <td className="px-4 py-3 font-mono text-xs">{adj.job_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{REASON_LABELS[adj.reason] ?? adj.reason}</td>
                  <td className="px-4 py-3">{money(adj.original_amount_cents)}</td>
                  <td className="px-4 py-3">{money(adj.requested_amount_cents)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        adj.status === "accepted"
                          ? "success"
                          : adj.status === "declined"
                            ? "destructive"
                            : "default"
                      }
                    >
                      {adj.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(adj.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Remover metrics + abuse scores */}
      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Remover metrics (top 25 by abuse score)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Remover</th>
                <th className="px-4 py-3 text-right font-medium">Adj. requests</th>
                <th className="px-4 py-3 text-right font-medium">Declined</th>
                <th className="px-4 py-3 text-right font-medium">Disputes</th>
                <th className="px-4 py-3 text-right font-medium">Abuse score</th>
                <th className="px-4 py-3 text-left font-medium">Tier</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(flaggedRemovers ?? []).map((m) => {
                const tp = tierByRemover.get(m.remover_id);
                const tier = tp?.visibility_tier ?? "normal";
                const adjRate =
                  m.total_adjustment_requests > 0
                    ? Math.round((m.declined_adjustments / m.total_adjustment_requests) * 100)
                    : 0;
                return (
                  <tr key={m.remover_id}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{m.remover_id.slice(0, 8)}…</span>
                      {tp?.company_name && (
                        <span className="ml-2 text-zinc-500 dark:text-zinc-400">{tp.company_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{m.total_adjustment_requests}</td>
                    <td className="px-4 py-3 text-right">
                      {m.declined_adjustments}
                      {m.total_adjustment_requests > 0 && (
                        <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
                          ({adjRate}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{m.disputes_count}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <span className={m.abuse_score >= 6 ? "text-red-600 dark:text-red-400" : ""}>
                        {m.abuse_score}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIER_BADGE[tier] ?? ""}`}
                      >
                        {tier}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(["normal", "reduced", "suspended"] as const).filter((t) => t !== tier).map((t) => (
                          <form
                            key={t}
                            action={async () => {
                              "use server";
                              await adminSetVisibilityTierAction({
                                removerId: m.remover_id,
                                tier: t,
                                reason: `Admin set tier to ${t}`,
                              });
                            }}
                          >
                            <Button type="submit" size="sm" variant="outline">
                              Set {t}
                            </Button>
                          </form>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
