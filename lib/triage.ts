import { llm } from "./llm";
import { TRIAGE_PROMPT } from "./prompt";
import { TriageSchema } from "./schema";

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
  //console.log(response);


  const text = response.text ?? "";

  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      "The model did not return valid JSON."
    );
  }

  const parsed =
    TriageSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      "The JSON does not match the schema."
    );
  }

  return {
    triage: parsed.data,
    usage: response.usageMetadata,
  };
}