"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck, Star, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignInClient() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/app";
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back!");
      router.push(next);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-brand-cream">
      {/* Left panel — branding */}
      <div className="hero-bg relative hidden w-[45%] flex-col items-center justify-center overflow-hidden lg:flex">
        <div className="dot-grid absolute inset-0 opacity-30" />
        <div className="relative z-10 flex flex-col items-center px-10 text-center">
          <Link href="/">
            <Image src="/logo.png" alt="JunkyMunky" width={160} height={160} className="h-36 w-auto drop-shadow-2xl" />
          </Link>
          <h2 className="mt-6 text-2xl font-extrabold text-white">Welcome back.</h2>
          <p className="mt-2 max-w-xs text-sm text-white/60">
            Sign in to manage your jobs, bids, and pickups — all in one place.
          </p>
          <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
            {[
              { icon: ShieldCheck, text: "Escrow-protected payments" },
              { icon: Star,        text: "4.9★ average rating" },
              { icon: Truck,       text: "Fast local removers" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/8 px-4 py-2.5">
                <Icon className="h-4 w-4 text-brand-green-bright shrink-0" />
                <p className="text-sm text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        {/* Mobile logo */}
        <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <Image src="/logo.png" alt="JunkyMunky" width={44} height={44} className="h-10 w-auto" />
          <span className="text-lg font-extrabold text-brand-navy">
            Junky<span className="text-brand-green">Munky</span>
          </span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy">Sign in</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="font-medium text-brand-green hover:underline underline-offset-4">
                Create one free
              </Link>
            </p>
          </div>

          <form action={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-brand-navy">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-brand-navy">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
            </div>
            <Button type="submit" size="lg" disabled={loading} className="mt-1">
              {loading ? "Signing in…" : (
                <><span>Sign in</span><ArrowRight className="ml-1" /></>
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-brand-green shrink-0" />
              <p className="text-xs text-zinc-500">
                Your payment data is protected with Stripe escrow. We never store card details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
