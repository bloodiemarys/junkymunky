"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/browse", label: "Browse jobs" },
  { href: "/safety", label: "Safety" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-brand-navy/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMobileOpen(false)}>
          <Image
            src="/logo.png"
            alt="JunkyMunky"
            width={48}
            height={48}
            className="h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            priority
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-extrabold tracking-tight text-white">
              Junky<span className="text-brand-gold">Munky</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-white/50">
              Hauling & Reuse Made Easy
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="gold">
            <Link href="/app/post">
              Post a Job <ArrowRight className="ml-0.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-brand-navy pb-4 md:hidden">
          <nav className="flex flex-col px-4 pt-3 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Button asChild variant="outline-white" size="sm">
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Sign in</Link>
              </Button>
              <Button asChild variant="gold" size="sm">
                <Link href="/app/post" onClick={() => setMobileOpen(false)}>
                  Post a Job <ArrowRight className="ml-0.5" />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
