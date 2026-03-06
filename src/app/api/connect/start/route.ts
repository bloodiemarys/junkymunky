import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in?next=/app/remover/onboarding", env().APP_URL));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, stripe_connect_account_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return NextResponse.redirect(new URL("/app/remover/onboarding", env().APP_URL));
  }

  const stripeClient = stripe();
  const e = env();

  let accountId: string | null = profile.stripe_connect_account_id ?? null;
  if (!accountId) {
    const acct = await stripeClient.accounts.create({
      type: "express",
      country: "US",
      email: user.email ?? undefined,
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

  return NextResponse.redirect(accountLink.url);
}

