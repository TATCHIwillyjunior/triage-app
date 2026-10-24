import { PROMPT_VERSION } from "./prompt";
import { runDecisionModel } from "./decision-model";
import { triageTicket } from "./triage";
import type { TriageResult } from "./schema";
import type { Strategy } from "./strategy";

export type Classification = {
  version: string;
  triage: TriageResult;
  usage: Awaited<ReturnType<typeof triageTicket>>["usage"] | null;
  decisionModel?: TriageResult;
};

export function isStrategy(value: unknown): value is Strategy {
  return value === "llm" || value === "dm" || value === "dm-llm";
}

export async function classify(
  ticket: string,
  strategy: Strategy
): Promise<Classification> {
  if (strategy === "dm") {
    return {
      version: "dm-v1",
      triage: runDecisionModel(ticket),
      usage: null,
    };
  }

  if (strategy === "dm-llm") {
    const decisionModel = runDecisionModel(ticket);
    const llmResult = await triageTicket(ticket);

    return {
      version: `${PROMPT_VERSION}+dm-v1`,
      triage: llmResult.triage,
      usage: llmResult.usage ?? null,
      decisionModel,
    };
  }

  const llmResult = await triageTicket(ticket);
  return {
    version: PROMPT_VERSION,
    triage: llmResult.triage,
    usage: llmResult.usage ?? null,
  };
}
