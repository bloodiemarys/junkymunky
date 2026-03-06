import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { env } from "@/lib/env";
import { captureAndPayoutJob } from "@/lib/payments/capture";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });

  const stripeClient = stripe();
  const e = env();

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(body, sig, e.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid signature" },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const jobId = pi.metadata?.job_id;
        const bidId = pi.metadata?.bid_id;
        if (pi.status === "requires_capture" && jobId && bidId) {
          // Best-effort finalize (idempotent); OK if already finalized.
          const authorizedAt = new Date().toISOString();
          const captureDeadline = null; // set when remover marks picked_up (DB trigger)
          await service.rpc("finalize_authorized_assignment", {
            p_job_id: jobId,
            p_bid_id: bidId,
            p_payment_intent_id: pi.id,
            p_authorized_at: authorizedAt,
            p_capture_deadline_at: captureDeadline,
          });
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await service
          .from("job_assignments")
          .update({ canceled_at: new Date().toISOString(), payout_status: "canceled" })
          .eq("payment_intent_id", pi.id)
          .is("canceled_at", null);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const jobId = pi.metadata?.job_id;
        if (jobId) {
          // Mark completed + payout attempt (idempotent).
          await captureAndPayoutJob(jobId);
        }
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const piId = ch.payment_intent;
        if (piId) {
          await service
            .from("job_assignments")
            .update({ payout_status: "refunded" })
            .eq("payment_intent_id", piId);
        }
        break;
      }
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const accountId = acct.id as string;
        await service
          .from("profiles")
          .update({
            stripe_connect_details_submitted: Boolean(acct.details_submitted),
            stripe_connect_charges_enabled: Boolean(acct.charges_enabled),
            stripe_connect_payouts_enabled: Boolean(acct.payouts_enabled),
          })
          .eq("stripe_connect_account_id", accountId);

        // If payouts are now enabled, attempt to pay out any held assignments for this account.
        if (acct.payouts_enabled) {
          const { data: profile } = await service
            .from("profiles")
            .select("id")
            .eq("stripe_connect_account_id", accountId)
            .maybeSingle();
          if (!profile?.id) break;

          const { data: held } = await service
            .from("job_assignments")
            .select("job_id")
            .eq("payout_status", "held")
            .eq("remover_id", profile.id)
            .is("canceled_at", null)
            .is("transfer_id", null);

          for (const row of held ?? []) {
            try {
              await captureAndPayoutJob(row.job_id);
            } catch {
              // best-effort
            }
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

