"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe/server";
import { captureAndPayoutJob } from "@/lib/payments/capture";
import { auditAdminAction } from "@/lib/admin/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function adminForceCaptureAndPayoutAction(input: { jobId: string }) {
  const admin = await requireAdmin();
  await captureAndPayoutJob(input.jobId);
  await auditAdminAction({
    adminId: admin.id,
    action: "force_capture_and_payout",
    entityType: "job",
    entityId: input.jobId,
  });
  revalidatePath(`/admin/jobs`);
  revalidatePath(`/app/jobs/${input.jobId}`);
  return { ok: true as const };
}

export async function adminCancelAndRefundAction(input: { jobId: string }) {
  const admin = await requireAdmin();
  const service = createSupabaseServiceClient();
  const stripeClient = stripe();

  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,payment_intent_id,canceled_at,captured_at")
    .eq("job_id", input.jobId)
    .maybeSingle();

  if (!assignment) throw new Error("Assignment not found.");

  const pi = await stripeClient.paymentIntents.retrieve(assignment.payment_intent_id);
  if (pi.status === "requires_capture") {
    await stripeClient.paymentIntents.cancel(pi.id, undefined, { idempotencyKey: `admin_cancel:${pi.id}` });
  } else if (pi.status === "succeeded") {
    const latestCharge = (pi.latest_charge as string | null) ?? null;
    if (!latestCharge) throw new Error("Missing charge to refund.");
    await stripeClient.refunds.create(
      { charge: latestCharge },
      { idempotencyKey: `admin_refund:${latestCharge}` }
    );
  }

  await service
    .from("job_assignments")
    .update({ canceled_at: new Date().toISOString(), payout_status: "refunded" })
    .eq("id", assignment.id)
    .is("canceled_at", null);

  await service.from("jobs").update({ status: "canceled" }).eq("id", input.jobId);

  await auditAdminAction({
    adminId: admin.id,
    action: "cancel_and_refund",
    entityType: "job",
    entityId: input.jobId,
    metadata: { payment_intent_id: assignment.payment_intent_id, pi_status: pi.status },
  });

  revalidatePath(`/admin/jobs`);
  revalidatePath(`/admin/payments`);
  revalidatePath(`/app/jobs/${input.jobId}`);
  return { ok: true as const };
}

export async function adminRemoveJobAction(input: { jobId: string; reason?: string }) {
  const admin = await requireAdmin();
  const service = createSupabaseServiceClient();
  await service
    .from("jobs")
    .update({
      status: "canceled",
      is_flagged: true,
      flagged_reason: input.reason ?? "admin_removed",
      flagged_at: new Date().toISOString(),
    })
    .eq("id", input.jobId);
  await auditAdminAction({
    adminId: admin.id,
    action: "remove_job",
    entityType: "job",
    entityId: input.jobId,
    metadata: { reason: input.reason ?? "admin_removed" },
  });
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/moderation");
  return { ok: true as const };
}

