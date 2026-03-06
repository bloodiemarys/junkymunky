import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id,role,full_name,phone,created_at,stripe_connect_account_id,stripe_connect_payouts_enabled")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Profiles and Connect status.</p>

      <div className="mt-8 grid gap-3">
        {(users ?? []).map((u) => (
          <Card key={u.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{u.full_name ?? u.id}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge>{u.role}</Badge>
                  {u.stripe_connect_account_id ? (
                    <Badge variant={u.stripe_connect_payouts_enabled ? "success" : "warning"}>
                      Connect {u.stripe_connect_payouts_enabled ? "enabled" : "pending"}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
              <div>User ID: {u.id}</div>
              {u.phone ? <div>Phone: {u.phone}</div> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

