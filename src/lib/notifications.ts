import "server-only";

import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type NotificationType =
  | "job_created"
  | "bid_received"
  | "bid_accepted"
  | "message_received"
  | "job_status_changed"
  | "dispute_opened"
  | "reminder_confirm_pickup"
  | "price_adjustment_requested"
  | "price_adjustment_responded";

export async function notifyUser(args: {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  email?: { subject: string; html: string; text?: string };
}) {
  const service = createSupabaseServiceClient();
  await service.from("notifications").insert({
    user_id: args.userId,
    type: args.type,
    payload: args.payload,
  });

  if (args.email) {
    const e = env();
    // If email is not configured, skip silently.
    if (!e.RESEND_API_KEY || !e.EMAIL_FROM) return;
    const { data } = await service.auth.admin.getUserById(args.userId);
    const to = data.user?.email;
    if (!to) return;
    await sendEmail({ to, ...args.email });
  }
}

export async function notifyAdmins(args: {
  type: NotificationType;
  payload: Record<string, unknown>;
  email?: { subject: string; html: string; text?: string };
}) {
  const service = createSupabaseServiceClient();
  const { data: admins } = await service.from("profiles").select("id").eq("role", "admin").limit(50);
  for (const a of admins ?? []) {
    await notifyUser({ userId: a.id, type: args.type, payload: args.payload, email: args.email });
  }
}

