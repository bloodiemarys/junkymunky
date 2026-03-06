import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { adminRetryHeldPayoutAction } from "./actions";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("job_assignments")
    .select("id,job_id,poster_id,remover_id,amount_cents,platform_fee_cents,payout_cents,payment_intent_id,payout_status,authorized_at,captured_at,canceled_at,capture_deadline_at,transfer_id")
    .order("authorized_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Escrow authorizations, captures, and payouts.</p>

      <div className="mt-8 grid gap-3">
        {(rows ?? []).map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{money(a.amount_cents)}</CardTitle>
                <Badge>{a.payout_status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex flex-wrap gap-4">
                <span>Fee: {money(a.platform_fee_cents)}</span>
                <span>Payout: {money(a.payout_cents)}</span>
              </div>
              <div>PI: {a.payment_intent_id}</div>
              <div>
                Authorized: {new Date(a.authorized_at).toLocaleString()}{" "}
                {a.captured_at ? `• Captured: ${new Date(a.captured_at).toLocaleString()}` : ""}
                {a.canceled_at ? `• Canceled: ${new Date(a.canceled_at).toLocaleString()}` : ""}
              </div>
              <div>
                Deadline:{" "}
                {a.capture_deadline_at ? new Date(a.capture_deadline_at).toLocaleString() : "Pending picked_up"}
              </div>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link href={`/app/jobs/${a.job_id}`}>Open job</Link>
              </Button>
              {a.payout_status === "held" && !a.transfer_id ? (
                <form
                  action={async () => {
                    "use server";
                    await adminRetryHeldPayoutAction({ jobId: a.job_id });
                  }}
                >
                  <Button type="submit" variant="secondary" size="sm" className="w-fit">
                    Retry payout
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

