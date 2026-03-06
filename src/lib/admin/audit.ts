import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function auditAdminAction(args: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const service = createSupabaseServiceClient();
  await service.from("admin_audit_log").insert({
    admin_id: args.adminId,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId ?? null,
    metadata: args.metadata ?? {},
  });
}

