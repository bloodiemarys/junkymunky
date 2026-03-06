import Link from "next/link";
import Image from "next/image";
import { LogOut, Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);
  const unreadCount = count ?? 0;

  async function signOut() {
    "use server";
    const s = await createSupabaseServerClient();
    await s.auth.signOut();
  }

  return (
    <div className="min-h-screen bg-brand-cream text-brand-navy">
      <header className="sticky top-0 z-50 border-b border-brand-navy/10 bg-brand-navy/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <Link href="/app" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="JunkyMunky"
              width={40}
              height={40}
              className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="text-base font-extrabold tracking-tight text-white">
              Junky<span className="text-brand-gold">Munky</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {/* Notifications */}
            <Button asChild variant="ghost" size="sm" className="relative text-white/75 hover:bg-white/10 hover:text-white">
              <Link href="/app/notifications">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </Link>
            </Button>

            {/* Poster links */}
            {profile.role !== "remover" ? (
              <>
                <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white hidden sm:flex">
                  <Link href="/app/post">Post job</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white hidden sm:flex">
                  <Link href="/app/jobs">My jobs</Link>
                </Button>
              </>
            ) : null}

            {/* Remover links */}
            {profile.role === "remover" ? (
              <>
                <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white hidden sm:flex">
                  <Link href="/app/remover/jobs">Browse</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white hidden sm:flex">
                  <Link href="/app/remover/bids">My bids</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white hidden sm:flex">
                  <Link href="/app/remover/assignments">Assignments</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="ghost" size="sm" className="text-white/75 hover:bg-white/10 hover:text-white hidden md:flex">
                <Link href="/app/remover/onboarding">Become a remover</Link>
              </Button>
            )}

            {profile.role === "admin" ? (
              <Button asChild size="sm" variant="outline-white">
                <Link href="/admin">Admin</Link>
              </Button>
            ) : null}

            <form action={signOut}>
              <Button type="submit" size="sm" variant="ghost" className="text-white/60 hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
