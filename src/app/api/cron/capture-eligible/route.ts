import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { captureAndPayoutJob } from "@/lib/payments/capture";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) return true; // allow if not configured (dev)
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data: rows, error } = await service
    .from("job_assignments")
    .select("job_id,capture_deadline_at,captured_at,canceled_at, jobs!inner(id,status)")
    .is("captured_at", null)
    .is("canceled_at", null)
    .not("capture_deadline_at", "is", null)
    .lt("capture_deadline_at", now)
    .eq("jobs.status", "picked_up")
    .limit(100);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: Array<{ jobId: string; ok: boolean; error?: string }> = [];
  for (const row of rows ?? []) {
    try {
      await captureAndPayoutJob(row.job_id);
      results.push({ jobId: row.job_id, ok: true });
    } catch (e) {
      results.push({ jobId: row.job_id, ok: false, error: e instanceof Error ? e.message : "capture_failed" });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

