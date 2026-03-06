"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { RequestPriceAdjustmentSchema, RespondToPriceAdjustmentSchema } from "@/lib/validation";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

// ─── Start Pickup ─────────────────────────────────────────────────────────────
// Sets started_at on the assignment, permanently locking the price.

export async function startPickupAction(input: { jobId: string }) {
  const profile = await requireProfile();
  const service = createSupabaseServiceClient();

  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,remover_id,started_at,canceled_at")
    .eq("job_id", input.jobId)
    .maybeSingle();

  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  if (assignment.remover_id !== profile.id) return { ok: false as const, error: "Not allowed." };
  if (assignment.canceled_at) return { ok: false as const, error: "Assignment is canceled." };

  if (!assignment.started_at) {
    const { error } = await service
      .from("job_assignments")
      .update({ started_at: new Date().toISOString() })
      .eq("id", assignment.id)
      .is("started_at", null);
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/app/remover/assignments");
  return { ok: true as const };
}

// ─── Request Price Adjustment ─────────────────────────────────────────────────

export async function requestPriceAdjustmentAction(input: unknown) {
  const profile = await requireProfile();
  const parsed = RequestPriceAdjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const v = parsed.data;
  const service = createSupabaseServiceClient();

  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,remover_id,amount_cents,started_at,canceled_at")
    .eq("id", v.assignment_id)
    .eq("job_id", v.job_id)
    .maybeSingle();

  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  if (assignment.remover_id !== profile.id) return { ok: false as const, error: "Not allowed." };
  if (assignment.canceled_at) return { ok: false as const, error: "Assignment is canceled." };
  if (assignment.started_at) {
    return { ok: false as const, error: "Price is locked — adjustment not allowed after pickup has started." };
  }
  if (v.requested_amount_cents <= assignment.amount_cents) {
    return { ok: false as const, error: "Requested amount must be greater than the original amount." };
  }

  const { data: existing } = await service
    .from("price_adjustments")
    .select("id")
    .eq("job_id", v.job_id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return { ok: false as const, error: "A pending adjustment already exists for this job." };
  }

  const difference = v.requested_amount_cents - assignment.amount_cents;

  const { data: adj, error: insErr } = await service
    .from("price_adjustments")
    .insert({
      job_id: v.job_id,
      assignment_id: v.assignment_id,
      remover_id: profile.id,
      original_amount_cents: assignment.amount_cents,
      requested_amount_cents: v.requested_amount_cents,
      difference_cents: difference,
      reason: v.reason,
      message: v.message ?? null,
      evidence_photo_url: v.evidence_photo_url,
    })
    .select("id")
    .single();

  if (insErr || !adj) return { ok: false as const, error: insErr?.message ?? "Failed to create adjustment." };

  // Track metric.
  await service.rpc("increment_adjustment_requests", { p_remover_id: profile.id });

  // Notify poster.
  const { data: job } = await service.from("jobs").select("poster_id,title").eq("id", v.job_id).maybeSingle();
  if (job?.poster_id) {
    await notifyUser({
      userId: job.poster_id,
      type: "price_adjustment_requested",
      payload: {
        job_id: v.job_id,
        adjustment_id: adj.id,
        original_amount_cents: assignment.amount_cents,
        requested_amount_cents: v.requested_amount_cents,
        reason: v.reason,
      },
      email: {
        subject: `Price adjustment requested for "${job.title}"`,
        html: `<p>Your remover has requested a price adjustment for job <b>${job.title}</b>.</p>
<p><b>Original:</b> ${money(assignment.amount_cents)}<br/>
<b>Requested:</b> ${money(v.requested_amount_cents)}<br/>
<b>Reason:</b> ${v.reason.replace(/_/g, " ")}</p>
<p>Log in to review and respond. You have 2 hours before the request expires and the job auto-cancels.</p>`,
        text: `Remover requested a price adjustment for "${job.title}". Original: ${money(assignment.amount_cents)}, Requested: ${money(v.requested_amount_cents)}, Reason: ${v.reason}. Respond within 2 hours.`,
      },
    });
  }

  revalidatePath(`/app/jobs/${v.job_id}`);
  revalidatePath("/app/remover/assignments");
  return { ok: true as const, adjustmentId: adj.id };
}

// ─── Respond to Price Adjustment (Poster) ─────────────────────────────────────

export async function respondToPriceAdjustmentAction(input: unknown) {
  const profile = await requireProfile();
  const parsed = RespondToPriceAdjustmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const { adjustment_id, action } = parsed.data;
  const service = createSupabaseServiceClient();

  const { data: adj } = await service
    .from("price_adjustments")
    .select("id,job_id,assignment_id,remover_id,original_amount_cents,requested_amount_cents,difference_cents,status,expires_at")
    .eq("id", adjustment_id)
    .maybeSingle();

  if (!adj) return { ok: false as const, error: "Adjustment not found." };
  if (adj.status !== "pending") return { ok: false as const, error: "Adjustment is no longer pending." };
  if (new Date(adj.expires_at) < new Date()) return { ok: false as const, error: "Adjustment has expired." };

  const { data: job } = await service
    .from("jobs")
    .select("id,poster_id,title,status")
    .eq("id", adj.job_id)
    .maybeSingle();
  if (!job) return { ok: false as const, error: "Job not found." };
  if (job.poster_id !== profile.id) return { ok: false as const, error: "Not allowed." };

  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,payment_intent_id,amount_cents,started_at,canceled_at")
    .eq("id", adj.assignment_id)
    .maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  if (assignment.canceled_at) return { ok: false as const, error: "Assignment is already canceled." };
  if (assignment.started_at) return { ok: false as const, error: "Job already started; price is locked." };

  const now = new Date().toISOString();
  const stripeClient = stripe();

  if (action === "decline") {
    await stripeClient.paymentIntents.cancel(assignment.payment_intent_id, undefined, {
      idempotencyKey: `cancel_adj_decline:${assignment.payment_intent_id}`,
    });

    await service
      .from("price_adjustments")
      .update({ status: "declined", resolved_at: now })
      .eq("id", adjustment_id);

    await service
      .from("job_assignments")
      .update({ canceled_at: now, payout_status: "canceled" })
      .eq("id", assignment.id);

    await service.from("jobs").update({ status: "canceled" }).eq("id", adj.job_id);

    await service.rpc("increment_declined_adjustments", { p_remover_id: adj.remover_id });

    await notifyUser({
      userId: adj.remover_id,
      type: "price_adjustment_responded",
      payload: { job_id: adj.job_id, adjustment_id, action: "decline" },
      email: {
        subject: `Price adjustment declined — job canceled`,
        html: `<p>The poster declined your price adjustment for <b>${job.title}</b>. The job has been canceled and the authorization released.</p>`,
        text: `The poster declined your price adjustment for "${job.title}". Job canceled.`,
      },
    });

    revalidatePath(`/app/jobs/${adj.job_id}`);
    revalidatePath("/app/remover/assignments");
    return { ok: true as const, action: "declined" as const };
  }

  // action === "accept" — create supplemental PaymentIntent for the difference.
  const originalPi = await stripeClient.paymentIntents.retrieve(assignment.payment_intent_id);
  const customerId = typeof originalPi.customer === "string" ? originalPi.customer : undefined;
  const paymentMethodId = typeof originalPi.payment_method === "string" ? originalPi.payment_method : undefined;

  let supplementalPiId: string | null = null;
  if (adj.difference_cents > 0 && customerId && paymentMethodId) {
    const supplementalPi = await stripeClient.paymentIntents.create(
      {
        amount: adj.difference_cents,
        currency: "usd",
        customer: customerId,
        capture_method: "manual",
        confirm: true,
        payment_method: paymentMethodId,
        transfer_group: `job_${adj.job_id}`,
        metadata: {
          job_id: adj.job_id,
          assignment_id: adj.assignment_id,
          type: "adjustment",
          adjustment_id,
        },
      },
      { idempotencyKey: `adj_pi:${adjustment_id}` }
    );
    supplementalPiId = supplementalPi.id;
  }

  await service
    .from("price_adjustments")
    .update({ status: "accepted", resolved_at: now, supplemental_payment_intent_id: supplementalPiId })
    .eq("id", adjustment_id);

  // Recalculate totals with 15% platform fee on new amount.
  const newTotal = adj.requested_amount_cents;
  const newFee = Math.round(newTotal * 0.15);
  const newPayout = newTotal - newFee;

  await service
    .from("job_assignments")
    .update({ amount_cents: newTotal, platform_fee_cents: newFee, payout_cents: newPayout })
    .eq("id", assignment.id);

  await service.rpc("increment_accepted_adjustments", { p_remover_id: adj.remover_id });

  await notifyUser({
    userId: adj.remover_id,
    type: "price_adjustment_responded",
    payload: { job_id: adj.job_id, adjustment_id, action: "accept" },
    email: {
      subject: `Price adjustment accepted for "${job.title}"`,
      html: `<p>The poster accepted your adjustment for <b>${job.title}</b>. New total: <b>${money(newTotal)}</b>.</p>`,
      text: `The poster accepted your adjustment for "${job.title}". New total: ${money(newTotal)}.`,
    },
  });

  revalidatePath(`/app/jobs/${adj.job_id}`);
  revalidatePath("/app/remover/assignments");
  return { ok: true as const, action: "accepted" as const };
}
