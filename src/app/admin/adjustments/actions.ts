"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { auditAdminAction } from "@/lib/admin/audit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/server";

// ─── Admin: force-resolve an adjustment ──────────────────────────────────────

export async function adminForceResolveAdjustmentAction(input: {
  adjustmentId: string;
  action: "accept" | "decline";
  reason: string;
}) {
  const admin = await requireAdmin();
  const service = createSupabaseServiceClient();

  const { data: adj } = await service
    .from("price_adjustments")
    .select("id,job_id,assignment_id,remover_id,original_amount_cents,requested_amount_cents,difference_cents,status")
    .eq("id", input.adjustmentId)
    .maybeSingle();
  if (!adj) return { ok: false as const, error: "Adjustment not found." };
  if (adj.status !== "pending") return { ok: false as const, error: "Adjustment is not pending." };

  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,payment_intent_id,amount_cents,canceled_at")
    .eq("id", adj.assignment_id)
    .maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  const now = new Date().toISOString();
  const stripeClient = stripe();

  if (input.action === "decline") {
    if (!assignment.canceled_at) {
      await stripeClient.paymentIntents.cancel(assignment.payment_intent_id, undefined, {
        idempotencyKey: `admin_cancel_adj:${assignment.payment_intent_id}`,
      });
      await service
        .from("job_assignments")
        .update({ canceled_at: now, payout_status: "canceled" })
        .eq("id", assignment.id);
    }
    await service
      .from("price_adjustments")
      .update({ status: "declined", resolved_at: now })
      .eq("id", input.adjustmentId);
    await service.from("jobs").update({ status: "canceled" }).eq("id", adj.job_id);
    await service.rpc("increment_declined_adjustments", { p_remover_id: adj.remover_id });
  } else {
    await service
      .from("price_adjustments")
      .update({ status: "accepted", resolved_at: now })
      .eq("id", input.adjustmentId);
    const newTotal = adj.requested_amount_cents;
    const newFee = Math.round(newTotal * 0.15);
    const newPayout = newTotal - newFee;
    await service
      .from("job_assignments")
      .update({ amount_cents: newTotal, platform_fee_cents: newFee, payout_cents: newPayout })
      .eq("id", assignment.id);
    await service.rpc("increment_accepted_adjustments", { p_remover_id: adj.remover_id });
  }

  await auditAdminAction({
    adminId: admin.id,
    action: `force_adjustment_${input.action}`,
    entityType: "price_adjustment",
    entityId: input.adjustmentId,
    metadata: { reason: input.reason },
  });

  revalidatePath("/admin/adjustments");
  revalidatePath(`/app/jobs/${adj.job_id}`);
  return { ok: true as const };
}

// ─── Admin: force price lock override ────────────────────────────────────────

export async function adminForcePriceLockAction(input: {
  jobId: string;
  reason: string;
}) {
  const admin = await requireAdmin();
  const service = createSupabaseServiceClient();

  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,started_at")
    .eq("job_id", input.jobId)
    .maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  if (!assignment.started_at) {
    await service
      .from("job_assignments")
      .update({ started_at: new Date().toISOString() })
      .eq("id", assignment.id);
  }

  await auditAdminAction({
    adminId: admin.id,
    action: "force_price_lock",
    entityType: "job",
    entityId: input.jobId,
    metadata: { reason: input.reason },
  });

  revalidatePath("/admin/adjustments");
  revalidatePath(`/app/jobs/${input.jobId}`);
  return { ok: true as const };
}

// ─── Admin: update remover visibility tier ────────────────────────────────────

export async function adminSetVisibilityTierAction(input: {
  removerId: string;
  tier: "normal" | "reduced" | "suspended";
  reason: string;
}) {
  const admin = await requireAdmin();
  const service = createSupabaseServiceClient();

  await service
    .from("remover_profiles")
    .update({
      visibility_tier: input.tier,
      is_flagged: input.tier !== "normal",
    })
    .eq("remover_id", input.removerId);

  await auditAdminAction({
    adminId: admin.id,
    action: "set_visibility_tier",
    entityType: "remover_profile",
    entityId: input.removerId,
    metadata: { tier: input.tier, reason: input.reason },
  });

  revalidatePath("/admin/adjustments");
  revalidatePath("/admin/users");
  return { ok: true as const };
}
