"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { notifyUser } from "@/lib/notifications";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateAssignmentJobStatusAction(input: { jobId: string; status: "en_route" | "arrived" | "picked_up" }) {
  await requireProfile();
  const supabase = await createSupabaseServerClient();

  // Update job status (RLS + DB transition trigger enforce assigned remover + valid transitions).
  const { error } = await supabase
    .from("jobs")
    .update({ status: input.status })
    .eq("id", input.jobId);

  if (error) return { ok: false as const, error: error.message };

  // Notify poster
  const service = createSupabaseServiceClient();
  const { data: job } = await service.from("jobs").select("id,poster_id,title").eq("id", input.jobId).maybeSingle();
  if (job?.poster_id) {
    await notifyUser({
      userId: job.poster_id,
      type: "job_status_changed",
      payload: { job_id: input.jobId, status: input.status },
      email: {
        subject: "Job status update on JunkyMunky",
        html: `<p>Your job <b>${job.title}</b> status is now: <b>${input.status}</b>.</p>`,
        text: `Your job ${job.title} status is now: ${input.status}.`,
      },
    });
  }

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/app/remover/assignments");
  return { ok: true as const };
}

export async function cancelAssignmentAsRemoverAction(input: { jobId: string }) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  // Cancel authorization hold immediately if still authorized (manual capture).
  const service = createSupabaseServiceClient();
  const { data: assignment } = await service
    .from("job_assignments")
    .select("id,remover_id,payment_intent_id,canceled_at")
    .eq("job_id", input.jobId)
    .maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  if (assignment.remover_id !== profile.id && profile.role !== "admin") {
    return { ok: false as const, error: "Not allowed." };
  }

  if (!assignment.canceled_at) {
    const stripeClient = stripe();
    await stripeClient.paymentIntents.cancel(assignment.payment_intent_id, undefined, {
      idempotencyKey: `cancel_pi:${assignment.payment_intent_id}`,
    });

    await service
      .from("job_assignments")
      .update({ canceled_at: new Date().toISOString(), payout_status: "canceled" })
      .eq("id", assignment.id)
      .is("canceled_at", null);
  }

  const { error } = await supabase.from("jobs").update({ status: "canceled" }).eq("id", input.jobId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/app/jobs/${input.jobId}`);
  revalidatePath("/app/remover/assignments");
  return { ok: true as const };
}

