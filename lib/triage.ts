import { llm } from "./llm";
import { TRIAGE_PROMPT } from "./prompt";
import { TriageResponseSchema } from "./schema";

export async function triageTicket(
  ticket: string
) {
  const response =
    await llm.models.generateContent({
      model: process.env.LLM_MODEL!,
      contents: `
${TRIAGE_PROMPT}

<ticket>
${ticket}
</ticket>
`,
    });

  const text = response.text ?? "";

  const parsed = JSON.parse(text);

  return TriageResponseSchema.parse(
    parsed
  );
}