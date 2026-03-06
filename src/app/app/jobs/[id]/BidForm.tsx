"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBidAction } from "./actions";

export function BidForm({ jobId, reusableOk }: { jobId: string; reusableOk: boolean }) {
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    const amountDollars = Number(formData.get("amount") ?? 0);
    const amountCents = Math.round(amountDollars * 100);
    const eta = String(formData.get("eta") ?? "");
    const message = String(formData.get("message") ?? "");
    const ack = formData.get("ack") === "on";

    if (!Number.isFinite(amountCents) || amountCents < 100) {
      toast.error("Enter a valid bid amount (minimum $1).");
      return;
    }
    if (reusableOk && !ack) {
      toast.error("Please acknowledge the reusable-items option.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createBidAction({
        job_id: jobId,
        amount_cents: amountCents,
        eta_timestamp: eta ? new Date(eta).toISOString() : undefined,
        message: message || undefined,
        can_keep_reusables_ack: ack,
      });
      if (!res.ok) throw new Error(res.error);
      toast.success("Bid submitted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={onSubmit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor="amount">Bid price (USD)</Label>
        <Input id="amount" name="amount" type="number" min="1" step="1" placeholder="150" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="eta">Earliest pickup</Label>
        <Input id="eta" name="eta" type="datetime-local" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea id="message" name="message" placeholder="Any questions for the poster?" />
      </div>
      {reusableOk ? (
        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="ack" className="mt-1 h-4 w-4" />
          <span>I acknowledge I may keep usable items if the poster allows it.</span>
        </label>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit bid"}
      </Button>
    </form>
  );
}

