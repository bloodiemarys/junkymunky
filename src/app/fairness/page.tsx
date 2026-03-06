import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Fairness & Trust Policy | JunkyMunky",
  description:
    "How JunkyMunky ensures fair pricing, safe practices, and accountability for every junk removal job.",
};

export default function FairnessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Fairness & Trust Policy</h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          JunkyMunky is built on transparency. Here's exactly how we protect both posters and
          removers.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Price adjustments — before pickup only</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              If a remover arrives and finds the job is materially different from the posted
              description or photos (more items, access issues, unlisted materials), they may request
              a price adjustment — but <strong>only before starting pickup</strong>.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>Adjustments require a structured reason and photo evidence.</li>
              <li>The poster receives an immediate notification with the full comparison.</li>
              <li>The poster has 2 hours to accept or decline.</li>
              <li>If declined, the job is canceled and the authorization is released.</li>
              <li>If no response within 2 hours, the job auto-cancels.</li>
            </ul>
            <p>
              <strong>Once pickup begins, the price is permanently locked.</strong> No surprise price
              hikes mid-job — ever.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evidence required for every adjustment</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              Removers cannot request a price change without uploading a photo that documents the
              discrepancy. This protects posters from unsubstantiated claims and creates a record
              for any disputes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform monitors for abuse</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              JunkyMunky tracks adjustment request patterns for every remover. Removers who
              repeatedly have adjustments declined, accrue disputes, or cancel late are automatically
              flagged and may have their job visibility reduced or their account suspended.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
              <li>
                <strong>Normal tier</strong> — no restrictions.
              </li>
              <li>
                <strong>Reduced tier</strong> — lower search ranking.
              </li>
              <li>
                <strong>Suspended tier</strong> — not visible in job listings.
              </li>
            </ul>
            <p>
              Abuse scoring is calculated automatically and reviewed by our admin team. False
              patterns are corrected on appeal.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environmental responsibility</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              Every remover on JunkyMunky must confirm — at signup and before each job — that they
              will comply with all applicable local, state, and federal laws regarding waste handling
              and disposal.
            </p>
            <p>
              <strong>JunkyMunky is not responsible for disposal methods, environmental
              violations, illegal dumping, or damages caused during service.</strong> Removers are
              independently responsible for lawful transport and disposal of all materials.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Poster responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              When posting a job, posters attest that their items do not include hazardous, illegal,
              medical, or otherwise restricted materials. Accurate photos and descriptions lead to
              accurate bids and a smooth pickup.
            </p>
            <p>
              Deliberately misrepresenting job contents to avoid a higher bid is a violation of our
              Terms of Service and may result in account suspension.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escrow & payment safety</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              Payments are authorized — not charged — when a bid is accepted. Funds are only
              captured after the poster confirms pickup or after the 72-hour auto-capture window.
            </p>
            <p>
              If a job is canceled before pickup starts, the authorization is released immediately
              with no charge to the poster.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/browse">Browse jobs</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/how-it-works">How it works</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/safety">Safety</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
