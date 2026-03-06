import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const [{ count: jobsOpen }, { count: disputesOpen }, { count: flagged }] = await Promise.all([
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("is_flagged", true),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Monitor jobs, payments, disputes, and moderation.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Open jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{jobsOpen ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Open disputes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{disputesOpen ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Flagged jobs</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{flagged ?? 0}</CardContent>
        </Card>
      </div>
    </div>
  );
}

