"use server";

import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/auth";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LIABILITY_VERSION } from "./constants";

export async function becomeRemoverAction(input: {
  company_name?: string;
  service_radius_miles?: number;
  vehicle_type?: string;
  bio?: string;
  liability_confirmed?: boolean;
}) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  if (!input.liability_confirmed) {
    return { ok: false as const, error: "You must confirm the liability statement to become a remover." };
  }

  // Role transition poster->remover is allowed by DB trigger.
  const { error: roleErr } = await supabase
    .from("profiles")
    .update({ role: "remover" })
    .eq("id", profile.id);
  if (roleErr) return { ok: false as const, error: roleErr.message };

  const { error: rpErr } = await supabase.from("remover_profiles").upsert({
    remover_id: profile.id,
    company_name: input.company_name ?? null,
    service_radius_miles: input.service_radius_miles ?? 25,
    vehicle_type: input.vehicle_type ?? null,
    bio: input.bio ?? null,
    liability_confirmed_at: new Date().toISOString(),
    liability_version: LIABILITY_VERSION,
  });
  if (rpErr) return { ok: false as const, error: rpErr.message };

  revalidatePath("/app");
  revalidatePath("/app/remover/onboarding");
  return { ok: true as const };
}

export async function createConnectOnboardingLinkAction() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const stripeClient = stripe();
  const e = env();

  // Create Connect account if missing.
  let accountId = profile.stripe_connect_account_id;
  if (!accountId) {
    const acct = await stripeClient.accounts.create({
      type: "express",
      country: "US",
      email: (await supabase.auth.getUser()).data.user?.email ?? undefined,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { supabase_user_id: profile.id },
    });
    accountId = acct.id;
    await supabase.from("profiles").update({ stripe_connect_account_id: accountId }).eq("id", profile.id);
  }

  const accountLink = await stripeClient.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${e.APP_URL}/app/remover/onboarding?refresh=1`,
    return_url: `${e.APP_URL}/app/remover/onboarding?return=1`,
  });

  return { ok: true as const, url: accountLink.url };
}

