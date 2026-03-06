import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-brand-navy text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <Image
                src="/logo.png"
                alt="JunkyMunky"
                width={44}
                height={44}
                className="h-10 w-auto object-contain opacity-90"
              />
              <div className="flex flex-col leading-none">
                <span className="text-base font-extrabold tracking-tight text-white">
                  Junky<span className="text-brand-gold">Munky</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                  Hauling & Reuse Made Easy
                </span>
              </div>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              The fast, fair, and modern way to get junk removed. Post a job,
              get competitive bids, and pay safely — only after your junk is gone.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Platform</h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How it works</Link></li>
              <li><Link href="/browse" className="hover:text-white transition-colors">Browse open jobs</Link></li>
              <li><Link href="/app/post" className="hover:text-white transition-colors">Post a job</Link></li>
              <li><Link href="/app/remover/onboarding" className="hover:text-white transition-colors">Become a remover</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">Company</h3>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li><Link href="/safety" className="hover:text-white transition-colors">Safety policy</Link></li>
              <li><Link href="/fairness" className="hover:text-white transition-colors">Fairness & trust</Link></li>
              <li><Link href="/sign-in" className="hover:text-white transition-colors">Sign in</Link></li>
              <li><Link href="/sign-up" className="hover:text-white transition-colors">Create account</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/30 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} JunkyMunky.com — All rights reserved.</p>
          <p>Hauling &amp; Reuse Made Easy</p>
        </div>
      </div>
    </footer>
  );
}
