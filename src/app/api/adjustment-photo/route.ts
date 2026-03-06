// Serves signed URLs for adjustment evidence photos from the adjustment-evidence bucket.
// Access: poster, assigned remover, or admin.

import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getJobIdFromPath(path: string) {
  return path.split("/")[0];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) return NextResponse.json({ ok: false, error: "Missing path" }, { status: 400 });

  const jobId = getJobIdFromPath(path);
  if (!jobId) return NextResponse.json({ ok: false, error: "Bad path" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const viewerId = auth.user?.id ?? null;

  if (!viewerId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  // Check access: poster, assigned remover, or admin.
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", viewerId)
    .maybeSingle();
  const isAdmin = profile?.role === "admin";

  let allowed = isAdmin;
  if (!allowed) {
    const { data: assignment } = await service
      .from("job_assignments")
      .select("id")
      .eq("job_id", jobId)
      .or(`remover_id.eq.${viewerId},poster_id.eq.${viewerId}`)
      .is("canceled_at", null)
      .maybeSingle();
    if (assignment?.id) allowed = true;
  }

  if (!allowed) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  // Verify the path is referenced by a price_adjustment for this job.
  const { data: adj } = await service
    .from("price_adjustments")
    .select("id")
    .eq("job_id", jobId)
    .eq("evidence_photo_url", path)
    .maybeSingle();
  if (!adj) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data, error } = await service.storage
    .from("adjustment-evidence")
    .createSignedUrl(path, 60 * 30);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Failed to sign" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl, { status: 302 });
}
