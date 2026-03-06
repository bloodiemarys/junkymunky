import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckoutClient } from "./CheckoutClient";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ jobId: string; bidId: string }>;
}) {
  const { jobId, bidId } = await params;
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,poster_id,status,title,city,state,zip")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-3 text-sm text-red-600">Job not found.</p>
      </div>
    );
  }
  if (job.poster_id !== profile.id && profile.role !== "admin") {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-3 text-sm text-red-600">Not allowed.</p>
      </div>
    );
  }
  if (job.status !== "open") {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          This job is not available for acceptance.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={`/app/jobs/${jobId}`}>Back to job</Link>
        </Button>
      </div>
    );
  }

  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .select("id,amount_cents,status,message,eta_timestamp")
    .eq("id", bidId)
    .eq("job_id", jobId)
    .single();
  if (bidErr || !bid) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-3 text-sm text-red-600">Bid not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Authorize escrow for <span className="font-medium">{money(bid.amount_cents)}</span> •{" "}
            {job.city}, {job.state} {job.zip}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/app/jobs/${jobId}`}>Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authorization hold notice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          You are authorizing funds into escrow. You will not be charged until pickup is confirmed (or automatically
          captured 72 hours after the remover marks picked up). Disputes pause capture.
        </CardContent>
      </Card>

      <CheckoutClient jobId={jobId} bidId={bidId} />
    </div>
  );
}

