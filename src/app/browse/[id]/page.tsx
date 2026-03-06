import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportJobAction } from "./actions";

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  const { data: job, error } = await supabase
    .from("jobs")
    .select("id,title,description,category,size,reusable_ok,status,city,state,zip,created_at,is_flagged")
    .eq("id", id)
    .single();

  if (error || !job || job.status !== "open" || job.is_flagged) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Job</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          This job is not available.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/browse">Back to browse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {job.city}, {job.state} {job.zip} • {job.category} • {job.size}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge>{job.status}</Badge>
          {job.reusable_ok ? <Badge variant="success">Reusable</Badge> : null}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
          {job.description}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Report this job</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Report illegal/hazardous items, spam, or unsafe behavior. Reports are reviewed by admins.
          </p>
          {user ? (
            <form
              action={async (formData: FormData) => {
                "use server";
                const type = String(formData.get("type") ?? "other") as
                  | "illegal_or_hazardous"
                  | "spam"
                  | "harassment"
                  | "other";
                const notes = String(formData.get("notes") ?? "");
                await reportJobAction({ jobId: job.id, type, notes: notes || undefined });
              }}
              className="grid gap-3"
            >
              <select
                name="type"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                defaultValue="illegal_or_hazardous"
              >
                <option value="illegal_or_hazardous">Illegal / hazardous</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="other">Other</option>
              </select>
              <textarea
                name="notes"
                className="min-h-[80px] w-full rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Optional details…"
              />
              <Button type="submit" variant="outline">
                Submit report
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline">
              <Link href={`/sign-in?next=${encodeURIComponent(`/browse/${job.id}`)}`}>Sign in to report</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href={`/sign-in?next=${encodeURIComponent(`/app/jobs/${job.id}`)}`}>
            Sign in to bid
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/browse">Back to browse</Link>
        </Button>
      </div>
    </div>
  );
}

