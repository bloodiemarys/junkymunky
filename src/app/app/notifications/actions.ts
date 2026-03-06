"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(input: { id: string }) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("user_id", profile.id)
    .is("read_at", null);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/app/notifications");
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/app/notifications");
  return { ok: true as const };
}

