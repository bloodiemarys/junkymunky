import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200/60 bg-white/60 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-950/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/admin" className="font-semibold tracking-tight">
            Admin • JunkyMunky
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/admin/jobs">Jobs</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/users">Users</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/payments">Payments</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/disputes">Disputes</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/audit">Audit</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/admin/adjustments">Adjustments</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/moderation">Moderation</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app">Back to app</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

