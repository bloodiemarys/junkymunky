"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { captureAndPayoutJob } from "@/lib/payments/capture";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateBidSchema } from "@/lib/validation";

export async function createBidAction(input: unknown) {
  const profile = await requireProfile();
  const parsed = CreateBidSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.message };

  const v = parsed.data;
  const supabase = await createSupabaseServerClient();

  // Basic checks (RLS will enforce too)
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,status,reusable_ok,poster_id,title")
    .eq("id", v.job_id)
    .single();
  if (jobErr || !job) return { ok: false as const, error: "Job not found." };
  if (job.status !== "open") return { ok: false as const, error: "This job is not accepting bids." };

  // Block bidding if the remover has not confirmed their liability.
  const { data: rp } = await supabase
    .from("remover_profiles")
    .select("liability_confirmed_at")
    .eq("remover_id", profile.id)
    .maybeSingle();
  if (!rp?.liability_confirmed_at) {
    return {
      ok: false as const,
      error: "You must confirm the liability statement in your remover profile before bidding.",
    };
  }

  const { error } = await supabase.from("bids").insert({
    job_id: v.job_id,
    remover_id: profile.id,
    amount_cents: v.amount_cents,
    message: v.message ?? null,
    eta_timestamp: v.eta_timestamp ? new Date(v.eta_timestamp).toISOString() : null,
    can_keep_reusables_ack: v.can_keep_reusables_ack,
  });
  if (error) return { ok: false as const, error: error.message };

  await notifyUser({
    userId: job.poster_id,
    type: "bid_received",
    payload: { job_id: job.id, amount_cents: v.amount_cents, remover_id: profile.id },
    email: {
      subject: "New bid on your JunkyMunky job",
      html: `<p>You received a new bid on <b>${job.title}</b>.</p><p>Bid: <b>$${(v.amount_cents / 100).toFixed(
        2
      )}</b></p>`,
      text: `You received a new bid on ${job.title}. Bid: $${(v.amount_cents / 100).toFixed(2)}`,
    },
  });

  revalidatePath(`/app/jobs/${v.job_id}`);
  return { ok: true as const };
}

export async function confirmPickedUpAndCaptureAction(input: { jobId: string }) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,poster_id,status")
    .eq("id", input.jobId)
    .single();
  if (jobErr || !job) return { ok: false as const, error: "Job not found." };
  if (job.poster_id !== profile.id && profile.role !== "admin") return { ok: false as const, error: "Not allowed." };
  if (job.status !== "picked_up") return { ok: false as const, error: "Job is not marked as picked up yet." };

  try {
    await captureAndPayoutJob(input.jobId);
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Capture failed." };
  }

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/app/jobs");
  return { ok: true as const };
}

export async function openDisputeAction(input: { jobId: string; reason: string }) {
  const profile = await requireProfile();
  if (!input.reason || input.reason.trim().length < 5) {
    return { ok: false as const, error: "Please provide a reason (5+ characters)." };
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service.rpc("open_dispute", {
    p_job_id: input.jobId,
    p_reason: input.reason.trim(),
  });
  if (error || !data) return { ok: false as const, error: error?.message ?? "Failed to open dispute." };

  await notifyAdmins({
    type: "dispute_opened",
    payload: { job_id: input.jobId, opened_by: profile.id },
    email: {
      subject: "Dispute opened on JunkyMunky",
      html: `<p>A dispute was opened for job <b>${input.jobId}</b>.</p><p>Opened by: ${profile.id}</p>`,
      text: `A dispute was opened for job ${input.jobId}. Opened by: ${profile.id}`,
    },
  });

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/admin/disputes");
  return { ok: true as const, disputeId: data as string, openedBy: profile.id };
}

export async function cancelJobAsPosterAction(input: { jobId: string }) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,poster_id,status")
    .eq("id", input.jobId)
    .single();
  if (jobErr || !job) return { ok: false as const, error: "Job not found." };
  if (job.poster_id !== profile.id && profile.role !== "admin") return { ok: false as const, error: "Not allowed." };

  if (job.status === "open") {
    const { error } = await supabase.from("jobs").update({ status: "canceled" }).eq("id", input.jobId);
    if (error) return { ok: false as const, error: error.message };
  } else if (job.status === "accepted") {
    // Cancel authorization + assignment, then cancel job.
    const service = createSupabaseServiceClient();
    const { data: assignment } = await service
      .from("job_assignments")
      .select("id,payment_intent_id,canceled_at")
      .eq("job_id", input.jobId)
      .maybeSingle();
    if (!assignment) return { ok: false as const, error: "Assignment not found." };

    if (!assignment.canceled_at) {
      const stripeClient = stripe();
      await stripeClient.paymentIntents.cancel(assignment.payment_intent_id, undefined, {
        idempotencyKey: `cancel_pi:${assignment.payment_intent_id}`,
      });

      await service
        .from("job_assignments")
        .update({ canceled_at: new Date().toISOString(), payout_status: "canceled" })
        .eq("id", assignment.id)
        .is("canceled_at", null);
    }

    const { error } = await supabase.from("jobs").update({ status: "canceled" }).eq("id", input.jobId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    return { ok: false as const, error: "This job cannot be canceled at this stage." };
  }

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/app/jobs");
  return { ok: true as const };
}

