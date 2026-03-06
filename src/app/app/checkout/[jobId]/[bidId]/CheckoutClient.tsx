"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createPaymentIntentForBidAction, finalizeAuthorizedAssignmentAction } from "./actions";

function InnerCheckoutForm({
  jobId,
  bidId,
  paymentIntentId,
}: {
  jobId: string;
  bidId: string;
  paymentIntentId: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const res = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (res.error) throw res.error;

      const pi = res.paymentIntent;
      if (!pi) throw new Error("Missing payment result.");
      if (pi.status !== "requires_capture") {
        throw new Error(`Authorization failed (status: ${pi.status}).`);
      }

      const finalized = await finalizeAuthorizedAssignmentAction({
        jobId,
        bidId,
        paymentIntentId,
      });
      if (!finalized.ok) throw new Error(finalized.error);

      toast.success("Payment authorized. Job accepted.");
      window.location.href = `/app/jobs/${jobId}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || !elements || submitting} size="lg">
        {submitting ? "Authorizing…" : "Authorize payment"}
      </Button>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        This is an authorization hold. You will be charged when pickup is confirmed (or in 72 hours).
      </p>
    </form>
  );
}

export function CheckoutClient({ jobId, bidId }: { jobId: string; bidId: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  async function start() {
    setLoading(true);
    try {
      const res = await createPaymentIntentForBidAction({ jobId, bidId });
      if (!res.ok) throw new Error(res.error);
      setClientSecret(res.clientSecret);
      setPaymentIntentId(res.paymentIntentId);
      setPublishableKey(res.publishableKey);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authorize escrow</CardTitle>
        <CardDescription>
          Your card is authorized now and captured only after pickup confirmation (or auto-capture in 72 hours).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!clientSecret || !stripePromise || !paymentIntentId ? (
          <Button onClick={start} disabled={loading} size="lg">
            {loading ? "Starting…" : "Continue to payment"}
          </Button>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <InnerCheckoutForm jobId={jobId} bidId={bidId} paymentIntentId={paymentIntentId} />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
}

