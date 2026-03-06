// Cron: recalculate abuse scores for all removers with metrics.
// Suggested schedule: daily at 3am UTC.
// Vercel cron: {"path": "/api/cron/recalculate-abuse-scores", "schedule": "0 3 * * *"}

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const e = env();
  const authHeader = request.headers.get("authorization");
  if (e.CRON_SECRET && authHeader !== `Bearer ${e.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const service = createSupabaseServiceClient();

  // Load all remover IDs that have a metrics row.
  const { data: metrics, error } = await service
    .from("remover_metrics")
    .select("remover_id")
    .limit(1000);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let processed = 0;
  let failed = 0;

  for (const m of metrics ?? []) {
    try {
      await service.rpc("recalculate_abuse_score", { p_remover_id: m.remover_id });
      processed++;
    } catch (err) {
      console.error(`Failed to recalculate abuse score for remover ${m.remover_id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, processed, failed });
}
