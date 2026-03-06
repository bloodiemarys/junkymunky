import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

export function createSupabaseBrowserClient() {
  const e = env();
  return createBrowserClient(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

