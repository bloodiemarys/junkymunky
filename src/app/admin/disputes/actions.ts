"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { stripe } from "@/lib/stripe/server";
import { captureAndPayoutJob } from "@/lib/payments/capture";
import { auditAdminAction } from "@/lib/admin/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function adminResolveDisputeAction(input: { disputeId: string; resolution: "capture" | "refund" | "cancel" | "note"; adminNotes?: string }) {
  const admin = await requireAdmin();
  const service = createSupabaseServiceClient();
  const stripeClient = stripe();

  const { data: dispute, error } = await service
    .from("disputes")
    .select("id,job_id,status")
    .eq("id", input.disputeId)
    .single();
  if (error || !dispute) throw new Error("Dispute not found.");

  if (input.resolution === "capture") {
    await captureAndPayoutJob(dispute.job_id);
    await service.from("disputes").update({ status: "resolved", admin_notes: input.adminNotes ?? null }).eq("id", dispute.id);
    await service.from("jobs").update({ status: "completed" }).eq("id", dispute.job_id);
    await auditAdminAction({
      adminId: admin.id,
      action: "resolve_dispute_capture",
      entityType: "dispute",
      entityId: dispute.id,
      metadata: { job_id: dispute.job_id },
    });
  } else if (input.resolution === "refund") {
    const { data: assignment } = await service
      .from("job_assignments")
      .select("id,payment_intent_id")
      .eq("job_id", dispute.job_id)
      .maybeSingle();
    if (!assignment) throw new Error("Assignment not found.");
    const pi = await stripeClient.paymentIntents.retrieve(assignment.payment_intent_id);
    if (pi.status === "requires_capture") {
      await stripeClient.paymentIntents.cancel(pi.id, undefined, { idempotencyKey: `admin_cancel:${pi.id}` });
    } else if (pi.status === "succeeded") {
      const latestCharge = (pi.latest_charge as string | null) ?? null;
      if (!latestCharge) throw new Error("Missing charge to refund.");
      await stripeClient.refunds.create({ charge: latestCharge }, { idempotencyKey: `admin_refund:${latestCharge}` });
    }
    await service.from("job_assignments").update({ canceled_at: new Date().toISOString(), payout_status: "refunded" }).eq("id", assignment.id);
    await service.from("disputes").update({ status: "resolved", admin_notes: input.adminNotes ?? null }).eq("id", dispute.id);
    await service.from("jobs").update({ status: "canceled" }).eq("id", dispute.job_id);
    await auditAdminAction({
      adminId: admin.id,
      action: "resolve_dispute_refund",
      entityType: "dispute",
      entityId: dispute.id,
      metadata: { job_id: dispute.job_id, payment_intent_id: assignment.payment_intent_id },
    });
  } else if (input.resolution === "cancel") {
    await service.from("disputes").update({ status: "resolved", admin_notes: input.adminNotes ?? null }).eq("id", dispute.id);
    await service.from("jobs").update({ status: "canceled" }).eq("id", dispute.job_id);
    await auditAdminAction({
      adminId: admin.id,
      action: "resolve_dispute_cancel",
      entityType: "dispute",
      entityId: dispute.id,
      metadata: { job_id: dispute.job_id },
    });
  } else {
    await service.from("disputes").update({ admin_notes: input.adminNotes ?? null }).eq("id", dispute.id);
    await auditAdminAction({
      adminId: admin.id,
      action: "dispute_note",
      entityType: "dispute",
      entityId: dispute.id,
      metadata: { job_id: dispute.job_id },
    });
  }

  revalidatePath("/admin/disputes");
  revalidatePath(`/app/jobs/${dispute.job_id}`);
  return { ok: true as const };
}

