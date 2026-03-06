import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "poster" | "remover" | "admin";
  full_name: string | null;
  stripe_customer_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_details_submitted?: boolean;
  stripe_connect_charges_enabled?: boolean;
  stripe_connect_payouts_enabled?: boolean;
};

export async function requireUser(options?: { redirectTo?: string }) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect(options?.redirectTo ?? "/sign-in");
  }
  return data.user;
}

export async function requireProfile() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, stripe_customer_id, stripe_connect_account_id, stripe_connect_details_submitted, stripe_connect_charges_enabled, stripe_connect_payouts_enabled"
    )
    .eq("id", user.id)
    .single();
  if (error || !data) {
    redirect("/sign-in");
  }
  return data as Profile;
}

export async function requireAdmin() {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/app");
  return profile;
}

