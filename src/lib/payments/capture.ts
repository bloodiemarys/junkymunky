import "server-only";

import { stripe } from "@/lib/stripe/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function captureAndPayoutJob(jobId: string) {
  const service = createSupabaseServiceClient();

  const { data: job, error: jErr } = await service
    .from("jobs")
    .select("id,status")
    .eq("id", jobId)
    .single();
  if (jErr || !job) throw new Error("Job not found.");
  if (job.status !== "picked_up" && job.status !== "completed") {
    throw new Error("Capture is only allowed after the remover marks picked up.");
  }

  const { data: assignment, error: aErr } = await service
    .from("job_assignments")
    .select("id,job_id,remover_id,payment_intent_id,amount_cents,platform_fee_cents,payout_cents,captured_at,transfer_id,payout_status,canceled_at")
    .eq("job_id", jobId)
    .maybeSingle();
  if (aErr || !assignment) throw new Error("Assignment not found.");
  if (assignment.canceled_at) throw new Error("Assignment is canceled.");

  const { data: dispute } = await service
    .from("disputes")
    .select("id,status")
    .eq("job_id", jobId)
    .maybeSingle();
  if (dispute && dispute.status !== "resolved") {
    throw new Error("Dispute is open; capture is blocked.");
  }

  const stripeClient = stripe();

  // Capture if not captured yet.
  if (!assignment.captured_at) {
    const pi = await stripeClient.paymentIntents.retrieve(assignment.payment_intent_id);
    if (pi.status !== "requires_capture") {
      if (pi.status !== "succeeded") {
        throw new Error(`PaymentIntent not capturable (status: ${pi.status}).`);
      }
    } else {
      await stripeClient.paymentIntents.capture(assignment.payment_intent_id, undefined, {
        idempotencyKey: `capture:${assignment.payment_intent_id}`,
      });
    }

    // Mark captured locally (idempotent).
    const capturedAt = new Date().toISOString();
    await service
      .from("job_assignments")
      .update({ captured_at: capturedAt })
      .eq("id", assignment.id)
      .is("captured_at", null);

    await service
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", jobId)
      .in("status", ["picked_up", "completed"]);
  }

  // If transfer already exists, treat as paid.
  if (assignment.transfer_id) {
    if (assignment.payout_status !== "paid") {
      await service.from("job_assignments").update({ payout_status: "paid" }).eq("id", assignment.id);
    }
    return { ok: true as const, payout: "paid" as const, assignmentId: assignment.id as string, transferId: assignment.transfer_id as string };
  }

  // Attempt payout (transfer) if not already done.
  const { data: removerProfile } = await service
    .from("profiles")
    .select("id,stripe_connect_account_id,stripe_connect_payouts_enabled")
    .eq("id", assignment.remover_id)
    .single();

  if (!removerProfile?.stripe_connect_account_id || !removerProfile.stripe_connect_payouts_enabled) {
    await service.from("job_assignments").update({ payout_status: "held" }).eq("id", assignment.id);
    return { ok: true as const, payout: "held" as const, assignmentId: assignment.id as string };
  }

  // Create transfer to connected account.
  const transfer = await stripeClient.transfers.create(
    {
      amount: assignment.payout_cents,
      currency: "usd",
      destination: removerProfile.stripe_connect_account_id,
      transfer_group: `job_${jobId}`,
      metadata: { job_id: jobId, assignment_id: assignment.id },
    },
    { idempotencyKey: `transfer:${assignment.id}` }
  );

  await service
    .from("job_assignments")
    .update({ transfer_id: transfer.id, payout_status: "paid" })
    .eq("id", assignment.id);

  // Increment remover stats (best-effort).
  try {
    await service.rpc("increment_completed_jobs_count", { p_remover_id: assignment.remover_id });
  } catch {
    // best-effort
  }

  return { ok: true as const, payout: "paid" as const, assignmentId: assignment.id as string, transferId: transfer.id };
}

