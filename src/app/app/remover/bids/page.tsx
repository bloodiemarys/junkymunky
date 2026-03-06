import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withdrawBidAction } from "./withdraw-actions";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function RemoverBidsPage() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: bids, error } = await supabase
    .from("bids")
    .select("id,job_id,amount_cents,status,created_at,eta_timestamp,message")
    .eq("remover_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My bids</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My bids</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Track bids you’ve placed.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/remover/jobs">Browse jobs</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-3">
        {(bids ?? []).map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{money(b.amount_cents)}</CardTitle>
                <Badge>{b.status}</Badge>
              </div>
              {b.eta_timestamp ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Earliest pickup: {new Date(b.eta_timestamp).toLocaleString()}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-3">
              {b.message ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {b.message}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/app/jobs/${b.job_id}`}>Open job</Link>
                </Button>
                {b.status === "active" ? (
                  <form
                    action={async () => {
                      "use server";
                      await withdrawBidAction({ bidId: b.id });
                    }}
                  >
                    <Button type="submit" variant="outline" size="sm">
                      Withdraw
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

