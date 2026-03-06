import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Routes that require Supabase session management.
const PROTECTED_PREFIXES = ["/app", "/admin"];

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Redirect www → non-www (canonical domain).
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return NextResponse.redirect(url, { status: 301 });
  }

  // Only run session refresh on protected routes.
  // Public routes (/, /browse, /sign-in, /sign-up, /how-it-works, /safety, /fairness, etc.)
  // pass through immediately so no Supabase call is made on them.
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
