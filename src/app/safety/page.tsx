import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  Flag,
  Scale,
  CheckCircle,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const banned = [
  "Hazardous waste (hazmat)",
  "Asbestos",
  "Medical waste / needles",
  "Explosives / ammunition",
  "Illegal drugs",
  "Radioactive materials",
  "Anything illegal or unsafe to transport",
];

const allowed = [
  "Furniture & appliances",
  "Construction debris (non-hazardous)",
  "Yard waste & green debris",
  "Electronics (non-CRT)",
  "Clothing & household goods",
  "Mattresses & box springs",
  "Cardboard & general trash",
  "Moving boxes & packing materials",
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-white text-brand-navy">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="hero-bg relative overflow-hidden">
          <div className="dot-grid absolute inset-0 opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:px-6 md:py-24">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-green-bright">
              Safety First
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              A platform you can trust.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
              JunkyMunky is built for legal, non-hazardous junk and reusable items
              only. We take safety seriously — for posters, removers, and communities.
            </p>
          </div>
        </section>

        {/* What's allowed / not */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Acceptable Items</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
              What can and can&apos;t be posted
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Allowed */}
            <div className="rounded-2xl border border-brand-green-light bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green-light">
                  <CheckCircle className="h-4 w-4 text-brand-green" />
                </div>
                <h3 className="font-bold text-brand-navy">Allowed items</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {allowed.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Banned */}
            <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50">
                  <XCircle className="h-4 w-4 text-red-500" />
                </div>
                <h3 className="font-bold text-brand-navy">Not allowed</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {banned.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-zinc-400">
            Jobs posted with prohibited items may be removed and accounts may be suspended.
          </p>
        </section>

        {/* Safety pillars */}
        <section className="bg-brand-cream">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">How we protect you</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
                Safety built into every step
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Escrow protection",
                  desc: "Funds are held — not charged — until pickup is confirmed. You're never charged for unperformed work.",
                },
                {
                  icon: Flag,
                  title: "Job reporting",
                  desc: "Any listing can be reported from its detail page. Suspicious jobs are routed to admin moderation immediately.",
                },
                {
                  icon: AlertTriangle,
                  title: "Keyword monitoring",
                  desc: "Automated checks flag listings containing prohibited items, hazardous material language, or suspicious patterns.",
                },
                {
                  icon: Scale,
                  title: "Dispute resolution",
                  desc: "Raise a dispute before confirming pickup. Our team reviews it and freezes payment release during investigation.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card-lift rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-light">
                    <Icon className="h-5 w-5 text-brand-green" />
                  </div>
                  <h3 className="font-semibold text-brand-navy">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Remover accountability */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Remover accountability</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
                Trust scores keep quality high
              </h2>
              <p className="mt-4 text-zinc-500">
                Every remover on JunkyMunky is accountable through our fairness &amp; trust system.
                Bad actors are automatically restricted — no manual intervention needed.
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  "Removers agree to liability terms before bidding on any job",
                  "Every completed job earns a rating from the poster",
                  "Declined price adjustments, disputes, and late cancellations increase an abuse score",
                  "High abuse scores automatically reduce job visibility or suspend the remover",
                  "Admins can manually set visibility tiers or suspend accounts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                    <p className="text-sm text-zinc-600">{item}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild variant="outline">
                  <Link href="/fairness">Read our Fairness & Trust Policy <ArrowRight className="ml-1" /></Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-brand-cream p-8">
              <h3 className="font-bold text-brand-navy mb-4">Remover Trust Tiers</h3>
              <div className="flex flex-col gap-3">
                {[
                  { tier: "Normal", color: "bg-brand-green", desc: "Full visibility. Standard abuse score." },
                  { tier: "Reduced", color: "bg-brand-gold", desc: "Reduced job visibility. Abuse score ≥ 6." },
                  { tier: "Suspended", color: "bg-red-400", desc: "No access. Abuse score ≥ 12 or admin action." },
                ].map(({ tier, color, desc }) => (
                  <div key={tier} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                    <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${color}`} />
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{tier}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-400">
                Abuse score = declined adjustments × 2 + disputes × 3 + late cancellations × 2
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-brand-green">
          <div className="dot-grid absolute inset-0 opacity-20" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:px-6 md:py-20">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Safe, simple junk removal starts here.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Post a job free. No charge until your junk is confirmed gone.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="gold">
                <Link href="/app/post">Post a Job Free <ArrowRight className="ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline-white">
                <Link href="/how-it-works">How it works</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
