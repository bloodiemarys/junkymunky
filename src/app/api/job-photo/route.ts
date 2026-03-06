import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getJobIdFromPath(path: string) {
  const first = path.split("/")[0];
  return first;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

  const jobId = getJobIdFromPath(path);
  if (!jobId) return NextResponse.json({ ok: false, error: "Bad path" }, { status: 400 });

  // Identify viewer (if logged in)
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth.user?.id ?? null;

  const service = createSupabaseServiceClient();
  const { data: job } = await service.from("jobs").select("id,status,poster_id").eq("id", jobId).maybeSingle();
  if (!job) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Access rules:
  // - If job is open: anyone may view.
  // - Else: poster, assigned remover, or admin.
  let allowed = job.status === "open";
  if (!allowed && viewerId) {
    if (viewerId === job.poster_id) {
      allowed = true;
    } else {
      const [{ data: assignment }, { data: profile }] = await Promise.all([
        service
          .from("job_assignments")
          .select("id")
          .eq("job_id", job.id)
          .eq("remover_id", viewerId)
          .is("canceled_at", null)
          .maybeSingle(),
        service.from("profiles").select("role").eq("id", viewerId).maybeSingle(),
      ]);
      if (assignment?.id) allowed = true;
      if (profile?.role === "admin") allowed = true;
    }
  }

  if (!allowed) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Ensure the object exists for that job in our mapping table.
  const { data: jp } = await service
    .from("job_photos")
    .select("storage_path")
    .eq("job_id", job.id)
    .eq("storage_path", path)
    .maybeSingle();
  if (!jp) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data, error } = await service.storage.from("job-photos").createSignedUrl(path, 60 * 30);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Failed to sign" }, { status: 500 });
  }

  // Redirect to signed URL (browser caches the signed URL separately).
  return NextResponse.redirect(data.signedUrl, { status: 302 });
}

