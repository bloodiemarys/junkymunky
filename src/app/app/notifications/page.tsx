import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id,type,payload,read_at,created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-3 text-sm text-red-600">Failed to load: {error.message}</p>
      </div>
    );
  }

  const unread = (rows ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Updates about bids, messages, status changes, and disputes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread ? <Badge variant="warning">{unread} unread</Badge> : <Badge>All read</Badge>}
          <form
            action={async () => {
              "use server";
              await markAllNotificationsReadAction();
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {(rows ?? []).map((n) => (
          <Card key={n.id} className={n.read_at ? "opacity-80" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{n.type}</CardTitle>
                {n.read_at ? <Badge>Read</Badge> : <Badge variant="warning">New</Badge>}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              <pre className="max-h-40 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                {JSON.stringify(n.payload, null, 2)}
              </pre>
              <div className="flex flex-wrap gap-2">
                {typeof (n.payload as Record<string, unknown>)?.job_id === "string" ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/app/jobs/${(n.payload as Record<string, unknown>).job_id as string}`}>Open job</Link>
                  </Button>
                ) : null}
                {!n.read_at ? (
                  <form
                    action={async () => {
                      "use server";
                      await markNotificationReadAction({ id: n.id });
                    }}
                  >
                    <Button type="submit" variant="secondary" size="sm">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

