import { llm } from "./llm";
import { TRIAGE_PROMPT } from "./prompt";

export async function triageTicket(ticket: string) {
  const response = await llm.models.generateContent({
    model: process.env.LLM_MODEL!,
    contents: `${TRIAGE_PROMPT}

Ticket:
${ticket}`,
  });

  return response.text;
}
