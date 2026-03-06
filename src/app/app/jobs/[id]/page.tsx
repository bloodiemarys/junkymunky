import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BidForm } from "./BidForm";
import { cancelJobAsPosterAction, confirmPickedUpAndCaptureAction, openDisputeAction } from "./actions";
import { JobMessages } from "./JobMessages";
import { submitRatingAction } from "./rating-actions";
import { StatusTimeline } from "./StatusTimeline";
import { respondToPriceAdjustmentAction } from "@/app/app/remover/assignments/adjustment-actions";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type BidRow = {
  id: string;
  remover_id: string;
  amount_cents: number;
  message: string | null;
  eta_timestamp: string | null;
  status: string;
  created_at: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select(
      "id,poster_id,title,description,category,size,estimated_cubic_yards,reusable_ok,status,address_line1,city,state,zip,location_instructions,preferred_window_start,preferred_window_end,created_at"
    )
    .eq("id", id)
    .single();
  if (jobErr || !job) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Job</h1>
        <p className="mt-3 text-sm text-red-600">Job not found or not accessible.</p>
      </div>
    );
  }

  const isPoster = job.poster_id === profile.id;

  // Pending price adjustment (poster needs to respond).
  const pendingAdjustment = isPoster
    ? await (async () => {
        const svc = createSupabaseServiceClient();
        const { data } = await svc
          .from("price_adjustments")
          .select("id,original_amount_cents,requested_amount_cents,difference_cents,reason,message,evidence_photo_url,status,expires_at,created_at")
          .eq("job_id", id)
          .eq("status", "pending")
          .maybeSingle();
        return data;
      })()
    : null;

  const [{ data: photos }, { data: bids }, { data: assignment }, { data: myBid }, { data: myRating }] = await Promise.all([
    supabase.from("job_photos").select("storage_path").eq("job_id", id).order("created_at", { ascending: true }),
    isPoster
      ? supabase
          .from("bids")
          .select("id,remover_id,amount_cents,message,eta_timestamp,status,created_at")
          .eq("job_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as BidRow[] }),
    supabase
      .from("job_assignments")
      .select("id,remover_id,poster_id,amount_cents,platform_fee_cents,payout_cents,authorized_at,capture_deadline_at,captured_at,canceled_at,payout_status")
      .eq("job_id", id)
      .maybeSingle(),
    supabase
      .from("bids")
      .select("id,status,amount_cents,created_at")
      .eq("job_id", id)
      .eq("remover_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ratings")
      .select("id")
      .eq("job_id", id)
      .eq("rater_id", profile.id)
      .maybeSingle(),
  ]);

  const canBid = !isPoster && job.status === "open";
  const canConfirmPickup = isPoster && job.status === "picked_up" && Boolean(assignment?.id) && !assignment?.captured_at;
  const canCancel = isPoster && (job.status === "open" || job.status === "accepted");
  const canDispute =
    (isPoster || assignment?.remover_id === profile.id) &&
    ["accepted", "en_route", "arrived", "picked_up"].includes(job.status);
  const canRate =
    job.status === "completed" &&
    !myRating?.id &&
    ((isPoster && assignment?.remover_id) || (!isPoster && assignment?.remover_id === profile.id));

  // Messaging: poster can message the assigned remover; before acceptance, poster can message any bidder,
  // and a remover can message the poster if they've bid.
  const defaultRecipientId =
    isPoster
      ? assignment?.remover_id ?? (bids?.[0]?.remover_id ?? null)
      : job.poster_id;

  const participantIds = Array.from(
    new Set<string>([
      ...(assignment?.remover_id ? [assignment.remover_id] : []),
      ...((bids ?? []).map((b) => b.remover_id) as string[]),
      job.poster_id,
    ])
  );
  const { data: publicProfiles } = await supabase
    .from("public_profiles")
    .select("id,display_name,company_name,role")
    .in("id", participantIds);
  type PublicProfileRow = {
    id: string;
    display_name: string | null;
    company_name: string | null;
    role: "poster" | "remover" | "admin";
  };
  const ppById = new Map<string, PublicProfileRow>();
  for (const p of (publicProfiles ?? []) as PublicProfileRow[]) ppById.set(p.id, p);

  const participants = isPoster
    ? Array.from(
        new Map(
          [
            ...(assignment?.remover_id ? [[assignment.remover_id, "Assigned remover"]] : []),
            ...((bids ?? []).map((b) => [b.remover_id, "Bidder"]) as Array<[string, string]>),
          ].map(([id2, kind]) => {
            const pp = ppById.get(id2);
            const name =
              pp?.company_name ||
              pp?.display_name ||
              `${id2.slice(0, 8)}`;
            return [
              id2,
              { id: id2, label: `${kind} • ${name}` },
            ] as const;
          })
        ).values()
      )
    : [
        {
          id: job.poster_id,
          label: `Poster • ${ppById.get(job.poster_id)?.display_name || job.poster_id.slice(0, 8)}`,
        },
      ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              {job.city}, {job.state} {job.zip} • {job.category} • {job.size}
              {job.size === "cubic_yards" && job.estimated_cubic_yards != null
                ? ` (${job.estimated_cubic_yards} yd³)`
                : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge>{job.status}</Badge>
            {job.reusable_ok ? <Badge variant="success">Reusable</Badge> : null}
          </div>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusTimeline status={job.status} />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {job.description}
          </CardContent>
        </Card>

        {job.location_instructions ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Location instructions</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {job.location_instructions}
            </CardContent>
          </Card>
        ) : null}

        {isPoster ? (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Bids</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/browse">Browse public</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(bids ?? []).length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  No bids yet. Check back soon.
                </p>
              ) : (
                (bids ?? []).map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {money(b.amount_cents)}{" "}
                          <span className="text-zinc-500 dark:text-zinc-400">• {b.status}</span>
                        </p>
                        {b.eta_timestamp ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Earliest pickup: {new Date(b.eta_timestamp).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      <Button asChild size="sm">
                        <Link href={`/app/checkout/${job.id}/${b.id}`}>Accept & authorize</Link>
                      </Button>
                    </div>
                    {b.message ? (
                      <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                        {b.message}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Price adjustment info for non-poster (remover) */}
        {!isPoster && assignment?.id && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Price adjustment policy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                If the job differs from the posted photos or description, you may request a price
                adjustment <strong>before starting pickup</strong>. Once pickup begins, the price is
                permanently locked.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pending price adjustment — poster must respond */}
        {isPoster && pendingAdjustment ? (
          <Card className="mt-4 border-amber-300 dark:border-amber-700">
            <CardHeader>
              <CardTitle className="text-amber-800 dark:text-amber-200">
                Price adjustment requested
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="grid gap-1 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
                <div className="flex justify-between">
                  <span>Original</span>
                  <span className="font-medium">{money(pendingAdjustment.original_amount_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Requested</span>
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    {money(pendingAdjustment.requested_amount_cents)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Difference</span>
                  <span className="font-medium">+{money(pendingAdjustment.difference_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Reason</span>
                  <span className="font-medium capitalize">
                    {pendingAdjustment.reason.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              {pendingAdjustment.message && (
                <p className="whitespace-pre-wrap rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
                  {pendingAdjustment.message}
                </p>
              )}
              {pendingAdjustment.evidence_photo_url && (
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">Evidence photo</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/adjustment-photo?path=${encodeURIComponent(pendingAdjustment.evidence_photo_url)}`}
                    alt="Adjustment evidence"
                    className="max-h-60 rounded-md object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Expires: {new Date(pendingAdjustment.expires_at).toLocaleString()}. If you do not
                respond, the job will auto-cancel.
              </p>
              <div className="flex gap-3">
                <form
                  action={async () => {
                    "use server";
                    await respondToPriceAdjustmentAction({
                      adjustment_id: pendingAdjustment.id,
                      action: "accept",
                    });
                  }}
                >
                  <Button type="submit" size="sm">
                    Accept adjustment
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await respondToPriceAdjustmentAction({
                      adjustment_id: pendingAdjustment.id,
                      action: "decline",
                    });
                  }}
                >
                  <Button type="submit" variant="destructive" size="sm">
                    Decline & cancel job
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ) : isPoster && assignment?.id && !["completed", "canceled", "disputed"].includes(job.status) ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Price adjustment policy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                If the job differs from what was posted, the remover may request a price adjustment
                before starting pickup. You will be notified and can accept or decline.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {canConfirmPickup ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Confirm pickup</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Confirming will capture the authorization and release payout (minus 15% platform fee).
              </p>
              <form
                action={async () => {
                  "use server";
                  await confirmPickedUpAndCaptureAction({ jobId: job.id });
                }}
              >
                <Button type="submit" size="lg">
                  Confirm picked up & release escrow
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {canCancel ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Cancel job</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              {job.status === "accepted" ? (
                <p>
                  Canceling now will cancel the authorization hold. If the remover has already started, open a dispute instead.
                </p>
              ) : (
                <p>Canceling removes the job from bidding immediately.</p>
              )}
              <form
                action={async () => {
                  "use server";
                  await cancelJobAsPosterAction({ jobId: job.id });
                }}
              >
                <Button type="submit" variant="destructive">
                  Cancel job
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {canDispute ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Open a dispute</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Disputes pause auto-capture and require admin resolution.
              </p>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const reason = String(formData.get("reason") ?? "");
                  await openDisputeAction({ jobId: job.id, reason });
                }}
                className="grid gap-3"
              >
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  className="min-h-[90px] w-full rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="Explain what happened…"
                />
                <Button type="submit" variant="outline">
                  Open dispute
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <JobMessages
              jobId={job.id}
              viewerId={profile.id}
              defaultRecipientId={defaultRecipientId}
              participants={participants}
            />
          </CardContent>
        </Card>

        {canRate ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Rate your experience</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                Ratings help build trust. You can only rate once per job.
              </p>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const score = Number(formData.get("score") ?? 0);
                  const comment = String(formData.get("comment") ?? "");
                  const rateeId = isPoster ? (assignment?.remover_id as string) : job.poster_id;
                  await submitRatingAction({ jobId: job.id, rateeId, score, comment: comment || undefined });
                }}
                className="grid gap-3"
              >
                <select
                  name="score"
                  defaultValue="5"
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Good</option>
                  <option value="3">3 - OK</option>
                  <option value="2">2 - Poor</option>
                  <option value="1">1 - Bad</option>
                </select>
                <textarea
                  name="comment"
                  className="min-h-[90px] w-full rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="Optional comment…"
                />
                <Button type="submit" variant="secondary">
                  Submit rating
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(photos ?? []).length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No photos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(photos ?? []).slice(0, 6).map((p) => (
                  <div key={p.storage_path} className="relative aspect-[1/1] overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900">
                    {/* served through access-checked signed URL redirect */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={job.title}
                      src={`/api/job-photo?path=${encodeURIComponent(p.storage_path)}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {assignment?.id ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Escrow</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center justify-between">
                <span>Authorized</span>
                <span className="font-medium">{money(assignment.amount_cents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Platform fee (15%)</span>
                <span className="font-medium">{money(assignment.platform_fee_cents)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payout</span>
                <span className="font-medium">{money(assignment.payout_cents)}</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {assignment.capture_deadline_at
                  ? `Auto-capture deadline: ${new Date(assignment.capture_deadline_at).toLocaleString()}`
                  : "Auto-capture starts after picked up is marked."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {canBid ? (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Place a bid</CardTitle>
            </CardHeader>
            <CardContent>
              {myBid?.id ? (
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Your last bid: {money(myBid.amount_cents)} ({myBid.status})
                </p>
              ) : null}
              <BidForm jobId={job.id} reusableOk={job.reusable_ok} />
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                You’ll only get paid after pickup is confirmed (or auto-captured at 72h).
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

