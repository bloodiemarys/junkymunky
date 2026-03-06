import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const now = Date.now();
  const soon = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Find assignments approaching deadline where job is picked_up and not captured.
  const { data: assignments, error } = await service
    .from("job_assignments")
    .select("job_id,capture_deadline_at,captured_at,canceled_at,poster_id")
    .is("captured_at", null)
    .is("canceled_at", null)
    .not("capture_deadline_at", "is", null)
    .gt("capture_deadline_at", nowIso)
    .lt("capture_deadline_at", soon)
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const results: Array<{ jobId: string; ok: boolean; error?: string }> = [];
  for (const a of assignments ?? []) {
    try {
      const { data: job } = await service
        .from("jobs")
        .select("id,status,title")
        .eq("id", a.job_id)
        .single();
      if (!job || job.status !== "picked_up") continue;

      const { data: user } = await service.auth.admin.getUserById(a.poster_id);
      const email = user.user?.email;
      if (!email) continue;

      await sendEmail({
        to: email,
        subject: "Confirm pickup on JunkyMunky",
        html: `<p>Your remover marked your job "<b>${job.title}</b>" as picked up.</p>
<p>Please confirm pickup to release escrow, otherwise it will auto-capture after 72 hours.</p>`,
        text: `Your remover marked "${job.title}" as picked up. Please confirm pickup to release escrow.`,
      });

      await service.from("notifications").insert({
        user_id: a.poster_id,
        type: "reminder_confirm_pickup",
        payload: { job_id: a.job_id, capture_deadline_at: a.capture_deadline_at },
      });

      results.push({ jobId: a.job_id, ok: true });
    } catch (e) {
      results.push({ jobId: a.job_id, ok: false, error: e instanceof Error ? e.message : "remind_failed" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

