import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { becomeRemoverAction } from "./actions";

export default async function RemoverOnboardingPage() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: rp } = await supabase
    .from("remover_profiles")
    .select("company_name,service_radius_miles,vehicle_type,bio,liability_confirmed_at")
    .eq("remover_id", profile.id)
    .maybeSingle();

  async function onBecomeRemover(formData: FormData) {
    "use server";
    const res = await becomeRemoverAction({
      company_name: String(formData.get("company_name") ?? "") || undefined,
      service_radius_miles: formData.get("service_radius_miles")
        ? Number(formData.get("service_radius_miles"))
        : undefined,
      vehicle_type: String(formData.get("vehicle_type") ?? "") || undefined,
      bio: String(formData.get("bio") ?? "") || undefined,
      liability_confirmed: formData.get("liability_confirmed") === "on",
    });
    if (!res.ok) throw new Error(res.error);
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Remover onboarding</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Set up your profile and Stripe Connect to receive payouts.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>These details help posters trust your bids.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onBecomeRemover} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company name</label>
              <input
                name="company_name"
                defaultValue={rp?.company_name ?? ""}
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Service radius (miles)</label>
                <input
                  name="service_radius_miles"
                  type="number"
                  min="1"
                  defaultValue={rp?.service_radius_miles ?? 25}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Vehicle type</label>
                <input
                  name="vehicle_type"
                  defaultValue={rp?.vehicle_type ?? ""}
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Bio</label>
              <textarea
                name="bio"
                defaultValue={rp?.bio ?? ""}
                className="min-h-[100px] w-full rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <p className="mb-3 text-sm font-medium text-amber-900 dark:text-amber-200">
                Liability confirmation required
              </p>
              {rp?.liability_confirmed_at ? (
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✓ Confirmed on {new Date(rp.liability_confirmed_at).toLocaleDateString()}
                </p>
              ) : (
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="liability_confirmed"
                    className="mt-1 h-4 w-4 flex-shrink-0"
                    required
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    I acknowledge that I am solely responsible for the lawful transport and disposal
                    of all materials I remove. JunkyMunky is not responsible for disposal methods,
                    environmental violations, illegal dumping, or damages caused during service.
                  </span>
                </label>
              )}
            </div>

            <Button type="submit">Save & become a remover</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>
            Required to receive payouts. You can bid before completing onboarding, but payouts will be held until enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild>
            <Link href="/api/connect/start">Start Stripe onboarding</Link>
          </Button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            After finishing, return here. Your Connect status updates automatically via webhook.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

