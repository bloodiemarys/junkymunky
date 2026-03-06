import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-brand-navy">
      <SiteHeader />
      <main className="flex flex-col items-center justify-center px-4 py-32 text-center">
        <p className="text-7xl font-extrabold text-brand-green opacity-30">404</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/browse">Browse open jobs</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
