"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { captureAndPayoutJob } from "@/lib/payments/capture";
import { auditAdminAction } from "@/lib/admin/audit";

export async function adminRetryHeldPayoutAction(input: { jobId: string }) {
  const admin = await requireAdmin();
  await captureAndPayoutJob(input.jobId);
  await auditAdminAction({
    adminId: admin.id,
    action: "retry_payout",
    entityType: "job",
    entityId: input.jobId,
  });
  revalidatePath("/admin/payments");
  revalidatePath(`/app/jobs/${input.jobId}`);
  return { ok: true as const };
}

