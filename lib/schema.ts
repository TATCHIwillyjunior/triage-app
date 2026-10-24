import { z } from "zod";

export const TriageRequestSchema = z.object({
  subject: z.string().min(1),
  description: z.string().min(1),
});

export const TriageResponseSchema = z.object({
  category: z.enum([
    "billing",
    "technical_bug",
    "account",
    "feature_request",
  ]),

  priority: z.enum([
    "low",
    "medium",
    "high",
  ]),

  summary: z.string(),

  suggested_action: z.string(),
});