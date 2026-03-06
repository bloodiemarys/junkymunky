import { z } from "zod";

export const JobSizeSchema = z.enum(["small", "medium", "large", "cubic_yards"]);

export const CreateJobSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(20).max(4000),
  category: z.string().min(2).max(80),
  size: JobSizeSchema,
  estimated_cubic_yards: z.coerce.number().min(0).max(999).optional(),
  reusable_ok: z.boolean().default(false),

  address_line1: z.string().min(3).max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(30),
  zip: z.string().min(3).max(20),
  location_instructions: z.string().max(2000).optional(),

  preferred_window_start: z.string().optional(),
  preferred_window_end: z.string().optional(),

  policy_accepted: z.literal(true),
});

export const CreateBidSchema = z.object({
  job_id: z.string().uuid(),
  amount_cents: z.coerce.number().int().min(100),
  message: z.string().max(2000).optional(),
  eta_timestamp: z.string().optional(),
  can_keep_reusables_ack: z.boolean().default(false),
});

export const AdjustmentReasonEnum = z.enum([
  "size_mismatch",
  "access_issue",
  "unlisted_items",
  "hazardous_items",
  "other",
]);

export const RequestPriceAdjustmentSchema = z.object({
  job_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  requested_amount_cents: z.coerce.number().int().min(100),
  reason: AdjustmentReasonEnum,
  message: z.string().max(2000).optional(),
  evidence_photo_url: z.string().min(1, "Evidence photo is required"),
});

export const RespondToPriceAdjustmentSchema = z.object({
  adjustment_id: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});

