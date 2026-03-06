import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only run on protected routes — public pages bypass the proxy entirely.
  matcher: ["/app/:path*", "/admin/:path*"],
};
