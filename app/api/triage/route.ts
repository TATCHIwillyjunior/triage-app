import { classify, isStrategy } from "../../../lib/classifier";
import { TriageError } from "../../../lib/triage";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("ticket" in body) ||
    typeof body.ticket !== "string" ||
    !body.ticket.trim()
  ) {
    return Response.json(
      { error: "Please provide a ticket." },
      { status: 400 }
    );
  }

  const strategy =
    "strategy" in body && body.strategy !== undefined
      ? body.strategy
      : "llm";

  if (!isStrategy(strategy)) {
    return Response.json(
      { error: "Choose a valid classification strategy." },
      { status: 400 }
    );
  }

  try {
    const result = await classify(body.ticket, strategy);

    return Response.json({
      version: result.version,
      triage: result.triage,
      usage: result.usage,
      decisionModel: result.decisionModel,
    });
  } catch (error) {
    const status = error instanceof TriageError ? error.status : 500;
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to classify this ticket.",
      },
      { status }
    );
  }
}
