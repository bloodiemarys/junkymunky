"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function reportJobAction(input: { jobId: string; type: "illegal_or_hazardous" | "spam" | "harassment" | "other"; notes?: string }) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("reports").insert({
    job_id: input.jobId,
    reporter_id: profile.id,
    type: input.type,
    notes: input.notes ?? null,
  });
  if (error) return { ok: false as const, error: error.message };

  // Mark job flagged (best-effort) so it surfaces in moderation.
  await supabase.from("jobs").update({ is_flagged: true, flagged_reason: "user_report", flagged_at: new Date().toISOString() }).eq("id", input.jobId);

  revalidatePath(`/browse/${input.jobId}`);
  revalidatePath("/admin/moderation");
  return { ok: true as const };
}

