import { triageTicket } from "../../../lib/triage";
import { PROMPT_VERSION } from "../../../lib/prompt";

export async function POST(
    request: Request
) {
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
            {
                error:
                    "Please provide a ticket.",
            },
            {
                status: 400,
            }
        );
    }

    try {
        const result =
            await triageTicket(body.ticket);

        return Response.json({
            version: PROMPT_VERSION,
            triage: result.triage,
            usage: result.usage,
        });
    } catch (error) {
        return Response.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Invalid triage response.",
            },
            {
                status: 500,
            }
        );
    }
}