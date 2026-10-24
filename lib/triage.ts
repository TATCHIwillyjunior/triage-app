import { llm } from "./llm";
import { TRIAGE_PROMPT } from "./prompt";
import { TriageSchema } from "./schema";

export class TriageError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "TriageError";
  }
}

function getProviderError(error: unknown): TriageError {
  if (!(error instanceof Error)) {
    return new TriageError(
      "The AI service could not complete the request. Please try again.",
      502
    );
  }

  let providerMessage = error.message;
  let providerStatus =
    "status" in error && typeof error.status === "number"
      ? error.status
      : undefined;

  try {
    const parsed: unknown = JSON.parse(error.message);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "error" in parsed &&
      typeof parsed.error === "object" &&
      parsed.error !== null
    ) {
      const detail = parsed.error;
      if ("message" in detail && typeof detail.message === "string") {
        providerMessage = detail.message;
      }
      if ("code" in detail && typeof detail.code === "number") {
        providerStatus = detail.code;
      }
    }
  } catch {
    // The SDK may provide a regular, non-JSON error message.
  }

  if (providerStatus === 503 || providerStatus === 429) {
    return new TriageError(
      "The AI model is temporarily busy or unavailable. Please wait a moment and try again.",
      providerStatus
    );
  }

  return new TriageError(
    providerMessage || "The AI service could not complete the request. Please try again.",
    providerStatus && providerStatus >= 400 && providerStatus < 600
      ? providerStatus
      : 502
  );
}

export async function triageTicket(ticket: string) {
  let response;

  try {
    response = await llm.models.generateContent({
      model: process.env.LLM_MODEL!,
      contents: `
${TRIAGE_PROMPT}

<ticket>
${ticket}
</ticket>
`,
    });
  } catch (error) {
    throw getProviderError(error);
  }
  //console.log("Raw LLM response:", response);

  const text = response.text ?? "";

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new TriageError(
      "The AI model returned an invalid response. Please try again.",
      502
    );
  }

  const parsed = TriageSchema.safeParse(raw);
  if (!parsed.success) {
    throw new TriageError(
      "The AI model returned a response in an unexpected format. Please try again.",
      502
    );
  }

  return {
    triage: parsed.data,
    usage: response.usageMetadata,
  };
}
