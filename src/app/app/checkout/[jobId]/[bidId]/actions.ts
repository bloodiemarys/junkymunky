"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { notifyUser } from "@/lib/notifications";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function createPaymentIntentForBidAction(input: {
  jobId: string;
  bidId: string;
}) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,poster_id,status,title")
    .eq("id", input.jobId)
    .single();
  if (jobErr || !job) return { ok: false as const, error: "Job not found." };
  if (job.poster_id !== profile.id && profile.role !== "admin") {
    return { ok: false as const, error: "Not allowed." };
  }
  if (job.status !== "open") {
    return { ok: false as const, error: "This job is not available for acceptance." };
  }

  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .select("id,job_id,remover_id,amount_cents,status")
    .eq("id", input.bidId)
    .eq("job_id", input.jobId)
    .single();
  if (bidErr || !bid) return { ok: false as const, error: "Bid not found." };
  if (bid.status !== "active") return { ok: false as const, error: "Bid is not active." };

  const stripeClient = stripe();
  const e = env();

  // Ensure Stripe customer exists for poster.
  let stripeCustomerId = profile.stripe_customer_id;
  if (!stripeCustomerId) {
    const created = await stripeClient.customers.create({
      metadata: { supabase_user_id: profile.id },
    });
    stripeCustomerId = created.id;
    // Persist customer id
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", profile.id);
  }

  const idempotencyKey = `pi_auth:${job.id}:${bid.id}:${profile.id}`;

  const paymentIntent = await stripeClient.paymentIntents.create(
    {
      amount: bid.amount_cents,
      currency: "usd",
      capture_method: "manual",
      confirmation_method: "automatic",
      automatic_payment_methods: { enabled: true },
      customer: stripeCustomerId,
      description: `JunkyMunky job authorization: ${job.title}`,
      transfer_group: `job_${job.id}`,
      metadata: {
        job_id: job.id,
        bid_id: bid.id,
        poster_id: profile.id,
        remover_id: bid.remover_id,
      },
    },
    { idempotencyKey }
  );

  if (!paymentIntent.client_secret) {
    return { ok: false as const, error: "Failed to create payment intent." };
  }

  return {
    ok: true as const,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    publishableKey: e.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
}

export async function finalizeAuthorizedAssignmentAction(input: {
  jobId: string;
  bidId: string;
  paymentIntentId: string;
}) {
  const profile = await requireProfile();
  const stripeClient = stripe();

  // Verify PaymentIntent is authorized and matches job/bid.
  const pi = await stripeClient.paymentIntents.retrieve(input.paymentIntentId);
  if (pi.status !== "requires_capture") {
    return { ok: false as const, error: `Payment not authorized (status: ${pi.status}).` };
  }
  if (pi.capture_method !== "manual") {
    return { ok: false as const, error: "Invalid payment capture method." };
  }
  if (pi.metadata?.job_id !== input.jobId || pi.metadata?.bid_id !== input.bidId) {
    return { ok: false as const, error: "Payment does not match this job/bid." };
  }
  if (pi.metadata?.poster_id && pi.metadata.poster_id !== profile.id && profile.role !== "admin") {
    return { ok: false as const, error: "Payment does not belong to this user." };
  }

  const authorizedAt = new Date().toISOString();
  const captureDeadline = null; // set when remover marks picked_up (DB trigger)

  // Use service role to run atomic RPC.
  const service = createSupabaseServiceClient();
  const { data: assignmentId, error } = await service.rpc("finalize_authorized_assignment", {
    p_job_id: input.jobId,
    p_bid_id: input.bidId,
    p_payment_intent_id: input.paymentIntentId,
    p_authorized_at: authorizedAt,
    p_capture_deadline_at: captureDeadline,
  });

  if (error || !assignmentId) {
    return { ok: false as const, error: error?.message ?? "Failed to finalize assignment." };
  }

  const removerId = pi.metadata?.remover_id as string | undefined;
  if (removerId) {
    await notifyUser({
      userId: removerId,
      type: "bid_accepted",
      payload: { job_id: input.jobId, bid_id: input.bidId },
      email: {
        subject: "Your bid was accepted on JunkyMunky",
        html: `<p>Your bid was accepted for job <b>${input.jobId}</b>.</p>`,
        text: `Your bid was accepted for job ${input.jobId}.`,
      },
    });
  }
  await notifyUser({
    userId: profile.id,
    type: "bid_accepted",
    payload: { job_id: input.jobId, bid_id: input.bidId, payment_intent_id: input.paymentIntentId },
  });

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/app/jobs");
  revalidatePath("/app/remover/assignments");

  return { ok: true as const, assignmentId: assignmentId as string };
}

