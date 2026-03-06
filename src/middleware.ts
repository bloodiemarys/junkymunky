import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Routes that require Supabase session management.
const PROTECTED_PREFIXES = ["/app", "/admin"];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Redirect www → apex (canonical domain). 301 so browsers + crawlers cache it.
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
    return NextResponse.redirect(url, { status: 301 });
  }

  // Only run Supabase session refresh on protected routes so public pages stay fast.
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation files)
     * - favicon.ico
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
