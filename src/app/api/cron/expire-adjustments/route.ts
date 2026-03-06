// Cron: expire pending price adjustments that have passed their deadline.
// Suggested schedule: every 15 minutes.
// Vercel cron: {"path": "/api/cron/expire-adjustments", "schedule": "*/15 * * * *"}

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const e = env();
  const authHeader = request.headers.get("authorization");
  if (e.CRON_SECRET && authHeader !== `Bearer ${e.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const now = new Date().toISOString();

  // Find all pending adjustments that have expired.
  const { data: expired, error } = await service
    .from("price_adjustments")
    .select("id,job_id,assignment_id,remover_id,status,expires_at")
    .eq("status", "pending")
    .lt("expires_at", now);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let processed = 0;
  const stripeClient = stripe();

  for (const adj of expired ?? []) {
    try {
      // Mark expired.
      await service
        .from("price_adjustments")
        .update({ status: "expired", resolved_at: now })
        .eq("id", adj.id)
        .eq("status", "pending"); // idempotent guard

      // Cancel the original PaymentIntent and the assignment.
      const { data: assignment } = await service
        .from("job_assignments")
        .select("id,payment_intent_id,canceled_at")
        .eq("id", adj.assignment_id)
        .maybeSingle();

      if (assignment && !assignment.canceled_at) {
        await stripeClient.paymentIntents.cancel(assignment.payment_intent_id, undefined, {
          idempotencyKey: `expire_adj_cancel:${assignment.payment_intent_id}`,
        });

        await service
          .from("job_assignments")
          .update({ canceled_at: now, payout_status: "canceled" })
          .eq("id", assignment.id)
          .is("canceled_at", null);
      }

      // Cancel the job.
      await service
        .from("jobs")
        .update({ status: "canceled" })
        .eq("id", adj.job_id)
        .not("status", "in", '("canceled","completed","disputed")');

      // Treat expired as a "declined" for abuse scoring purposes.
      await service.rpc("increment_declined_adjustments", { p_remover_id: adj.remover_id });

      processed++;
    } catch (err) {
      console.error(`Failed to expire adjustment ${adj.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, expired: processed });
}
