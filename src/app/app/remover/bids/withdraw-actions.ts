"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function withdrawBidAction(input: { bidId: string }) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: bid, error: bidErr } = await supabase
    .from("bids")
    .select("id,remover_id,status,job_id")
    .eq("id", input.bidId)
    .single();
  if (bidErr || !bid) return { ok: false as const, error: "Bid not found." };
  if (bid.remover_id !== profile.id && profile.role !== "admin") return { ok: false as const, error: "Not allowed." };
  if (bid.status !== "active") return { ok: false as const, error: "Bid cannot be withdrawn." };

  const { error } = await supabase.from("bids").update({ status: "withdrawn" }).eq("id", bid.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/app/remover/bids");
  revalidatePath(`/app/jobs/${bid.job_id}`);
  return { ok: true as const };
}

