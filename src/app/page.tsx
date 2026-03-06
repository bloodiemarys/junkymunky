import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Star,
  ShieldCheck,
  Truck,
  Clock,
  DollarSign,
  Recycle,
  CheckCircle,
  Sofa,
  Refrigerator,
  Hammer,
  Trash2,
  Leaf,
  Building2,
  Package,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/* ─── Data ─────────────────────────────────────────────────────────────────── */
const services = [
  { icon: Sofa,         label: "Furniture Removal",      desc: "Sofas, beds, dressers — we haul it." },
  { icon: Refrigerator, label: "Appliance Removal",      desc: "Fridges, washers, dryers, and more." },
  { icon: Hammer,       label: "Construction Debris",    desc: "Drywall, lumber, demo waste — gone." },
  { icon: Trash2,       label: "Full Cleanouts",         desc: "Garage, attic, estate, or office." },
  { icon: Leaf,         label: "Yard Waste",             desc: "Branches, clippings, and green debris." },
  { icon: Building2,    label: "Commercial Junk",        desc: "Retail, office, and storage cleanouts." },
  { icon: Package,      label: "Curbside Pickup",        desc: "Already out front? Fast pickup available." },
  { icon: Recycle,      label: "Donation & Reuse",       desc: "We route reusable items to good homes." },
];

const steps = [
  {
    number: "01",
    title: "Post your job",
    desc: "Upload photos, describe the junk, set your location and pickup window. Takes 2 minutes.",
    icon: Package,
  },
  {
    number: "02",
    title: "Get competitive bids",
    desc: "Vetted removers bid on your job. Compare price, timing, and ratings.",
    icon: DollarSign,
  },
  {
    number: "03",
    title: "Accept & authorize",
    desc: "Pick the best bid. Your payment is held in escrow — not charged until pickup is confirmed.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Junk gone, funds released",
    desc: "Remover updates status en route → arrived → picked up. You confirm. Funds release.",
    icon: CheckCircle,
  },
];

const testimonials = [
  {
    quote: "JunkyMunky made clearing my mom's house after the move unbelievably easy. Had 3 bids within an hour.",
    name: "Rachel T.",
    role: "Homeowner, Austin TX",
    stars: 5,
  },
  {
    quote: "As a property manager I deal with cleanouts constantly. JunkyMunky is the only platform that gives me real competition on every job.",
    name: "Marcus L.",
    role: "Property Manager, Denver CO",
    stars: 5,
  },
  {
    quote: "Loved knowing my money was protected in escrow. Didn't pay until the truck was gone and the garage was spotless.",
    name: "Priya S.",
    role: "Homeowner, Seattle WA",
    stars: 5,
  },
];

const trustChips = [
  { icon: ShieldCheck, label: "Escrow Protected" },
  { icon: Star,        label: "4.9★ Avg Rating" },
  { icon: Clock,       label: "Avg 4hr Response" },
  { icon: Truck,       label: "Vetted Removers" },
];

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen bg-white text-brand-navy">
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="hero-bg relative overflow-hidden">
          {/* dot grid overlay */}
          <div className="dot-grid absolute inset-0 opacity-40" />

          {/* Glow orbs */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-green opacity-10 blur-3xl" />
          <div className="pointer-events-none absolute top-32 right-10 h-64 w-64 rounded-full bg-brand-gold opacity-8 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 md:px-6 md:pb-28 md:pt-24">
            <div className="grid items-center gap-12 md:grid-cols-2">
              {/* Left: copy */}
              <div>
                {/* Badge */}
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/15 px-3.5 py-1.5 text-sm font-medium text-brand-green-bright">
                  <Zap className="h-3.5 w-3.5" />
                  The #1 Junk Removal Marketplace
                </div>

                <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl">
                  Junk Out.{" "}
                  <span className="text-brand-gold">Fast.</span>{" "}
                  Easy.{" "}
                  <span className="gradient-text-gold">Done.</span>
                </h1>

                <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">
                  Post your junk removal job in minutes. Get competitive bids from
                  vetted local removers. Pay safely — only after your junk is gone.
                </p>

                {/* CTAs */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" variant="gold" className="shadow-lg shadow-brand-gold/20">
                    <Link href="/app/post">
                      Post a Job Free <ArrowRight className="ml-1" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline-white">
                    <Link href="/browse">Browse Open Jobs</Link>
                  </Button>
                </div>

                {/* Trust chips */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {trustChips.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70"
                    >
                      <Icon className="h-3.5 w-3.5 text-brand-green-bright" />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: logo visual */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  {/* Outer glow ring */}
                  <div className="absolute inset-0 rounded-full bg-brand-green opacity-15 blur-2xl scale-110" />
                  <div className="relative rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur-sm">
                    <Image
                      src="/logo.png"
                      alt="JunkyMunky"
                      width={400}
                      height={400}
                      className="h-auto w-72 max-w-full object-contain drop-shadow-2xl md:w-80"
                      priority
                    />
                  </div>
                  {/* Floating chips */}
                  <div className="absolute -left-6 top-10 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-xl md:-left-10">
                    <ShieldCheck className="h-5 w-5 text-brand-green" />
                    <div className="leading-none">
                      <p className="text-xs font-bold text-brand-navy">Escrow Safe</p>
                      <p className="text-[10px] text-zinc-400">Pay after pickup</p>
                    </div>
                  </div>
                  <div className="absolute -right-6 bottom-12 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-xl md:-right-10">
                    <Star className="h-5 w-5 fill-brand-gold text-brand-gold" />
                    <div className="leading-none">
                      <p className="text-xs font-bold text-brand-navy">4.9 Rating</p>
                      <p className="text-[10px] text-zinc-400">1,200+ jobs done</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats bar ────────────────────────────────────────────────────── */}
        <section className="border-y border-zinc-100 bg-brand-cream">
          <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
            <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
              {[
                { value: "1,200+", label: "Jobs completed" },
                { value: "4.9★",   label: "Average rating" },
                { value: "< 4hrs", label: "Avg first bid" },
                { value: "100%",   label: "Escrow protected" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-extrabold tracking-tight text-brand-green md:text-3xl">{value}</p>
                  <p className="mt-1 text-sm text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Simple process</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
              From post to pickup in 4 steps
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-500">
              JunkyMunky makes junk removal as easy as booking a rideshare. Simple, transparent, and safe.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className="card-lift group relative rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
              >
                {/* Connector line (desktop) */}
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-10 hidden h-px w-6 -translate-y-1/2 bg-zinc-100 lg:block" style={{ right: "-24px" }} />
                )}
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-light text-brand-green transition-colors group-hover:bg-brand-green group-hover:text-white">
                  <step.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">{step.number}</span>
                <h3 className="mt-1 text-base font-bold text-brand-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button asChild size="lg">
              <Link href="/how-it-works">
                Learn more about the process <ArrowRight className="ml-1" />
              </Link>
            </Button>
          </div>
        </section>

        {/* ── Services ─────────────────────────────────────────────────────── */}
        <section className="bg-brand-cream">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">What we haul</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
                Every type of junk removal, covered
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-zinc-500">
                From single-item pickups to full estate cleanouts, JunkyMunky handles it all.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="card-lift group rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-light transition-colors group-hover:bg-brand-green">
                    <Icon className="h-5 w-5 text-brand-green transition-colors group-hover:text-white" />
                  </div>
                  <h3 className="font-semibold text-brand-navy">{label}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust / Why JunkyMunky ────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Why JunkyMunky</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">
                Built for trust.<br />Designed for ease.
              </h2>
              <p className="mt-4 text-zinc-500">
                We didn&apos;t just build another booking page. JunkyMunky is a full marketplace with escrow
                payment protection, vetted remover profiles, dispute resolution, and real-time job tracking.
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  { icon: ShieldCheck, text: "Escrow holds your payment until pickup is confirmed — you're never charged for no-shows." },
                  { icon: Star,        text: "Every remover is rated after each job. Low ratings get flagged automatically." },
                  { icon: Truck,       text: "Real-time status updates: en route → arrived → picked up → complete." },
                  { icon: Clock,       text: "24/7 dispute resolution. If something goes wrong, we step in immediately." },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green-light">
                      <Icon className="h-3.5 w-3.5 text-brand-green" />
                    </div>
                    <p className="text-sm text-zinc-600">{text}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Button asChild>
                  <Link href="/app/post">Post a Job</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/safety">Safety policy</Link>
                </Button>
              </div>
            </div>

            {/* Right: visual trust card stack */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-sm">
                {/* Card stack depth */}
                <div className="absolute inset-x-4 top-2 rounded-2xl border border-zinc-100 bg-zinc-50 h-full" />
                <div className="absolute inset-x-2 top-1 rounded-2xl border border-zinc-100 bg-zinc-50/50 h-full" />
                {/* Main card */}
                <div className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-white">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-navy">Payment Protected</p>
                        <p className="text-xs text-zinc-400">Held in escrow</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-green-light px-2.5 py-1 text-xs font-semibold text-brand-green">Active</span>
                  </div>
                  <div className="mt-4 rounded-xl bg-brand-cream p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Authorized amount</span>
                      <span className="font-bold text-brand-navy">$285.00</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-zinc-200">
                      <div className="h-1.5 w-2/3 rounded-full bg-brand-green" />
                    </div>
                    <p className="mt-1.5 text-xs text-zinc-400">Remover en route — funds release on confirmation</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {["En Route", "Arrived", "Picked Up"].map((s, i) => (
                      <div key={s} className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${i === 0 ? "bg-brand-green animate-pulse" : "bg-zinc-200"}`} />
                        <span className={`text-xs ${i === 0 ? "font-semibold text-brand-green" : "text-zinc-300"}`}>{s}</span>
                        {i < 2 && <ArrowRight className="h-3 w-3 text-zinc-200" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ─────────────────────────────────────────────────── */}
        <section className="bg-brand-navy">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green-bright">Real customers</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                People love JunkyMunky
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map(({ quote, name, role, stars }) => (
                <div
                  key={name}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:bg-white/8"
                >
                  <div className="mb-3 flex gap-1">
                    {Array.from({ length: stars }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-brand-gold text-brand-gold" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-white/80">&ldquo;{quote}&rdquo;</p>
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="text-xs text-white/40">{role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-brand-green">
          <div className="pointer-events-none absolute inset-0 dot-grid opacity-20" />
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-brand-gold/20 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4 py-20 text-center md:px-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl lg:text-5xl">
              Ready to get rid of the junk?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
              Post a job for free in 2 minutes. Get bids fast. Pay only after pickup.
              It&apos;s that simple.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="xl" variant="gold" className="shadow-xl shadow-black/20">
                <Link href="/app/post">
                  Post a Job Free <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline-white">
                <Link href="/browse">Browse Open Jobs</Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-white/50">
              No subscription. No hidden fees. Only legal, non-hazardous items.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
