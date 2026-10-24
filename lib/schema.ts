import { z } from "zod";

export const TriageSchema = z.object({
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
  suggestedAction: z.string(),
});

export type TriageResult = z.infer<
  typeof TriageSchema
>;