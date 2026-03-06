"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function submitRatingAction(input: {
  jobId: string;
  rateeId: string;
  score: number;
  comment?: string;
}) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  if (!Number.isInteger(input.score) || input.score < 1 || input.score > 5) {
    return { ok: false as const, error: "Score must be 1–5." };
  }

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id,status,poster_id")
    .eq("id", input.jobId)
    .single();
  if (jobErr || !job) return { ok: false as const, error: "Job not found." };
  if (job.status !== "completed") return { ok: false as const, error: "Ratings are available after completion." };

  const { error } = await supabase.from("ratings").insert({
    job_id: input.jobId,
    rater_id: profile.id,
    ratee_id: input.rateeId,
    score: input.score,
    comment: input.comment?.trim() ? input.comment.trim() : null,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/app/jobs/${input.jobId}`);
  return { ok: true as const };
}

