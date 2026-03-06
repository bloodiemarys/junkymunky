import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; limit?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;
  const limit = Math.min(Number(params.limit) || 100, 500);

  let query = supabase
    .from("admin_audit_log")
    .select("id,admin_id,action,entity_type,entity_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.action) {
    query = query.eq("action", params.action);
  }
  if (params.entity) {
    query = query.eq("entity_type", params.entity);
  }

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Admin overrides and resolutions. Filter by action or entity type.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild variant={params.action ? "outline" : "secondary"} size="sm">
          <Link href={params.entity ? `/admin/audit?entity=${params.entity}` : "/admin/audit"}>
            All actions
          </Link>
        </Button>
        {["force_capture_and_payout", "cancel_and_refund", "remove_job", "retry_payout", "resolve_dispute_capture", "resolve_dispute_refund", "resolve_dispute_cancel", "dispute_note"].map(
          (a) => (
            <Button key={a} asChild variant={params.action === a ? "secondary" : "outline"} size="sm">
              <Link
                href={
                  params.entity
                    ? `/admin/audit?action=${a}&entity=${params.entity}`
                    : `/admin/audit?action=${a}`
                }
              >
                {a.replace(/_/g, " ")}
              </Link>
            </Button>
          )
        )}
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Entity:</span>
        {["job", "dispute"].map((e) => (
          <Button key={e} asChild variant={params.entity === e ? "secondary" : "outline"} size="sm">
            <Link href={params.action ? `/admin/audit?action=${params.action}&entity=${e}` : `/admin/audit?entity=${e}`}>
              {e}
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-8 grid gap-3">
        {(rows ?? []).map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{r.action}</CardTitle>
                <Badge variant="default">{r.entity_type}</Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Admin: {r.admin_id.slice(0, 8)}… • {new Date(r.created_at).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              {r.entity_id ? (
                <div>
                  ID:{" "}
                  {r.entity_type === "job" ? (
                    <Link href={`/app/jobs/${r.entity_id}`} className="underline">
                      {r.entity_id}
                    </Link>
                  ) : (
                    r.entity_id
                  )}
                </div>
              ) : null}
              {r.metadata && Object.keys(r.metadata as Record<string, unknown>).length > 0 ? (
                <pre className="max-h-32 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                  {JSON.stringify(r.metadata, null, 2)}
                </pre>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
