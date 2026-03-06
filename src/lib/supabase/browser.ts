import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // NEXT_PUBLIC_* vars are bundled at build time and safe to access directly in browser code.
  // Do NOT call env() here — it validates server-only secrets that don't exist on the client.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

