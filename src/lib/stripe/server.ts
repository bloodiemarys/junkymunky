import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/env";

let cached: Stripe | null = null;

export function stripe() {
  if (cached) return cached;
  const e = env();
  cached = new Stripe(e.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
  return cached;
}

