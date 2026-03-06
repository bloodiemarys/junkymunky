"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateJobSchema } from "@/lib/validation";
import { POSTER_ATTESTATION_VERSION } from "./constants";

export async function createJobAction(input: unknown) {
  const profile = await requireProfile();
  const parsed = CreateJobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.message };
  }

  const supabase = await createSupabaseServerClient();
  const v = parsed.data;

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      poster_id: profile.id,
      title: v.title,
      description: v.description,
      category: v.category,
      size: v.size,
      estimated_cubic_yards: v.size === "cubic_yards" ? v.estimated_cubic_yards ?? null : null,
      reusable_ok: v.reusable_ok,
      policy_accepted_at: new Date().toISOString(),
      poster_attestation_confirmed_at: new Date().toISOString(),
      poster_attestation_version: POSTER_ATTESTATION_VERSION,
      address_line1: v.address_line1,
      address_line2: v.address_line2 ?? null,
      city: v.city,
      state: v.state,
      zip: v.zip,
      location_instructions: v.location_instructions ?? null,
      preferred_window_start: v.preferred_window_start ? new Date(v.preferred_window_start).toISOString() : null,
      preferred_window_end: v.preferred_window_end ? new Date(v.preferred_window_end).toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "Failed to create job" };

  revalidatePath("/browse");
  revalidatePath("/app/jobs");
  return { ok: true as const, jobId: data.id as string };
}

export async function addJobPhotosAction(input: { jobId: string; storagePaths: string[] }) {
  const profile = await requireProfile();
  const jobId = input.jobId;
  const storagePaths = input.storagePaths.filter(Boolean);
  if (!jobId || storagePaths.length < 1) {
    return { ok: false as const, error: "At least one photo is required." };
  }

  const supabase = await createSupabaseServerClient();

  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("id, poster_id")
    .eq("id", jobId)
    .single();
  if (jobErr || !job) return { ok: false as const, error: "Job not found." };
  if (job.poster_id !== profile.id && profile.role !== "admin") {
    return { ok: false as const, error: "Not allowed." };
  }

  const rows = storagePaths.map((p) => ({ job_id: jobId, storage_path: p }));
  const { error } = await supabase.from("job_photos").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/browse");
  return { ok: true as const };
}

