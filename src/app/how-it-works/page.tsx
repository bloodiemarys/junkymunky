import Link from "next/link";
import {
  ArrowRight,
  Package,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  MessageSquare,
  Clock,
  Star,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const posterSteps = [
  {
    number: "01",
    icon: Package,
    title: "Post your job",
    desc: "Upload clear photos of your junk, describe what needs to go, add your location and preferred pickup window. Takes about 2 minutes.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Get bids & chat",
    desc: "Vetted removers browse open jobs and bid on yours. Compare price, earliest pickup time, and remover ratings. Message them to confirm details.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Accept a bid & authorize payment",
    desc: "Once you accept, your card is authorized into secure escrow. You won't be charged until pickup is confirmed — or auto-captured after 72 hours.",
  },
  {
    number: "04",
    icon: CheckCircle,
    title: "Pickup & release funds",
    desc: "Your remover updates status: en route → arrived → picked up. You confirm the pickup to release funds. Disputes freeze the release.",
  },
];

const removerSteps = [
  {
    number: "01",
    icon: Truck,
    title: "Complete onboarding",
    desc: "Agree to our remover liability terms and set up your profile. Real accountability through ratings.",
  },
  {
    number: "02",
    icon: Package,
    title: "Browse & bid on jobs",
    desc: "Browse open jobs near you. Bid your price and earliest pickup time. Your bid is a commitment — accept jobs you can actually complete.",
  },
  {
    number: "03",
    icon: DollarSign,
    title: "Complete the job",
    desc: "Pick up the junk, update status in the app as you go. Once the poster confirms, payment is released to your Stripe account.",
  },
  {
    number: "04",
    icon: Star,
    title: "Build your reputation",
    desc: "Great ratings mean more job visibility. Consistently high ratings unlock priority placement.",
  },
];

const faqs = [
  {
    q: "When exactly is my payment charged?",
    a: "Your card is authorized (held) when you accept a bid. It's only captured (charged) when you confirm pickup — or automatically after 72 hours if no action is taken.",
  },
  {
    q: "What if the remover doesn't show up?",
    a: "If the remover doesn't show, open a dispute before confirming. Our team reviews it and ensures you're not charged for unperformed work.",
  },
  {
    q: "Can the price change after I accept a bid?",
    a: "A remover may request a price adjustment before starting the job. You can accept or decline. If declined, the job is canceled and you owe nothing.",
  },
  {
    q: "How do removers get paid?",
    a: "Removers connect a Stripe account during onboarding. Funds are transferred after poster confirmation, minus our platform fee.",
  },
  {
    q: "What items are not allowed?",
    a: "Hazardous waste, asbestos, medical waste, explosives, illegal drugs, or anything unsafe to transport. See our Safety Policy for the full list.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white text-brand-navy">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="hero-bg relative overflow-hidden">
          <div className="dot-grid absolute inset-0 opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:px-6 md:py-24">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand-green-bright">
              The JunkyMunky Process
            </p>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Junk removal, finally done right.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
              A transparent, escrow-protected marketplace connecting you with vetted
              removers. No surprises. No hidden charges. Just junk — gone.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="gold">
                <Link href="/app/post">Post a Job Free <ArrowRight className="ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline-white">
                <Link href="/browse">Browse Open Jobs</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* For Posters */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="mb-12">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">For Homeowners & Businesses</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">How posting a job works</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {posterSteps.map((step) => (
              <div key={step.number} className="card-lift group rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-light transition-colors group-hover:bg-brand-green">
                  <step.icon className="h-5 w-5 text-brand-green transition-colors group-hover:text-white" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">{step.number}</span>
                <h3 className="mt-1 font-bold text-brand-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For Removers */}
        <section className="bg-brand-cream">
          <div className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
            <div className="mb-12">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">For Removers</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">How earning on JunkyMunky works</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {removerSteps.map((step) => (
                <div key={step.number} className="card-lift group rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy/10 transition-colors group-hover:bg-brand-navy">
                    <step.icon className="h-5 w-5 text-brand-navy transition-colors group-hover:text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">{step.number}</span>
                  <h3 className="mt-1 font-bold text-brand-navy">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Button asChild>
                <Link href="/app/remover/onboarding">Become a remover <ArrowRight className="ml-1" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Escrow explained */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Payment protection</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy md:text-4xl">How escrow keeps you safe</h2>
              <p className="mt-4 text-zinc-500">
                We use Stripe&apos;s manual capture (payment hold) to protect both posters and removers.
              </p>
              <ul className="mt-6 flex flex-col gap-4">
                {[
                  { step: "Bid accepted", detail: "Your card is authorized. Funds are held — not yet charged." },
                  { step: "Remover en route", detail: "Remover confirms they're on the way. Status updates in real time." },
                  { step: "Pickup complete", detail: "Remover marks job picked up. You confirm to release funds." },
                  { step: "Auto-capture", detail: "If no action after 72 hours, payment captures automatically." },
                ].map(({ step, detail }) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green text-xs font-bold text-white">✓</div>
                    <div>
                      <p className="font-semibold text-brand-navy text-sm">{step}</p>
                      <p className="text-sm text-zinc-500">{detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-brand-cream p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-brand-navy">Escrow Timeline</p>
                  <p className="text-xs text-zinc-500">Powered by Stripe</p>
                </div>
              </div>
              <ol className="relative border-l-2 border-brand-green-light pl-6 flex flex-col gap-5">
                {[
                  { label: "Bid accepted", time: "Day 0", active: true },
                  { label: "Payment authorized", time: "Day 0", active: true },
                  { label: "Remover en route", time: "Day 1", active: true },
                  { label: "Pickup confirmed", time: "Day 1", active: false },
                  { label: "Funds released", time: "After confirm", active: false },
                ].map(({ label, time, active }) => (
                  <li key={label} className="relative flex items-center gap-3">
                    <div className={`absolute -left-[29px] flex h-4 w-4 items-center justify-center rounded-full border-2 ${active ? "border-brand-green bg-brand-green" : "border-zinc-300 bg-white"}`}>
                      {active && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-medium ${active ? "text-brand-navy" : "text-zinc-400"}`}>{label}</span>
                      <span className="text-xs text-zinc-400">{time}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-brand-green-light p-3">
                <Clock className="h-4 w-4 text-brand-green shrink-0" />
                <p className="text-xs text-brand-green font-medium">
                  Auto-capture triggers 72 hours after remover marks picked up, if no action taken.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-brand-cream">
          <div className="mx-auto max-w-4xl px-4 py-20 md:px-6 md:py-28">
            <div className="mb-12 text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">FAQ</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy">Common questions</h2>
            </div>
            <div className="flex flex-col gap-4">
              {faqs.map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-brand-navy">{q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-brand-green">
          <div className="dot-grid absolute inset-0 opacity-20" />
          <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:px-6 md:py-20">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Ready to post your first job?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              Free to post. No subscription. Pay only when your junk is gone.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" variant="gold">
                <Link href="/app/post">Post a Job Free <ArrowRight className="ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline-white">
                <Link href="/sign-up">Create Account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
