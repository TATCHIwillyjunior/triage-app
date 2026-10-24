import tickets100 from "../../../data/support_tickets_100_labelled.json";
import tickets500 from "../../../data/support_tickets_500.json";
import { TriageError, triageTicket } from "../../../lib/triage";
import fs from "fs/promises";
import path from "path";

type Ticket100 = {
  ticket_id: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
};

type Ticket500 = {
  ticket_id: string;
  subject: string;
  body: string;
};

type SmokeTestRequest = {
  dataset: "100" | "500";
  sampleSize: number;
};

function randomSample<T>(items: T[], count: number): T[] {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function isSmokeTestRequest(value: unknown): value is SmokeTestRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("dataset" in value) || !("sampleSize" in value)) {
    return false;
  }

  return (
    (value.dataset === "100" || value.dataset === "500") &&
    typeof value.sampleSize === "number" &&
    Number.isInteger(value.sampleSize) &&
    value.sampleSize >= 1 &&
    value.sampleSize <= 100
  );
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "The request body must contain valid JSON." },
        { status: 400 }
      );
    }

    if (!isSmokeTestRequest(body)) {
      return Response.json(
        {
          error:
            "Choose a valid dataset and a sample size from 1 to 100.",
        },
        { status: 400 }
      );
    }

    const startedAt = Date.now();
    const { dataset, sampleSize } = body;
    const selectedTickets =
      dataset === "100"
        ? randomSample(tickets100 as Ticket100[], sampleSize)
        : randomSample(tickets500 as Ticket500[], sampleSize);

    const results: Record<string, unknown>[] = [];
    let categoryMismatches = 0;
    let priorityMismatches = 0;

    for (const ticket of selectedTickets) {
      const triageResult = await triageTicket(
        `${ticket.subject}\n\n${ticket.body}`
      );

      const row: Record<string, unknown> = {
        ticketId: ticket.ticket_id,
        predictedCategory: triageResult.triage.category,
        predictedPriority: triageResult.triage.priority,
      };

      if (
        dataset === "100" &&
        "category" in ticket &&
        "priority" in ticket
      ) {
        row.expectedCategory = ticket.category;
        row.expectedPriority = ticket.priority;

        if (ticket.category !== triageResult.triage.category) {
          categoryMismatches++;
        }
        if (ticket.priority !== triageResult.triage.priority) {
          priorityMismatches++;
        }
      }

      results.push(row);
    }

    const totalResults = results.length;
    const categoryAccuracy =
      dataset === "100"
        ? Number(
            (
              ((totalResults - categoryMismatches) / totalResults) *
              100
            ).toFixed(2)
          )
        : null;
    const priorityAccuracy =
      dataset === "100"
        ? Number(
            (
              ((totalResults - priorityMismatches) / totalResults) *
              100
            ).toFixed(2)
          )
        : null;
    const latency = Date.now() - startedAt;

    const logFile = path.join(
      process.cwd(),
      "data",
      "smoke-test-runs.json"
    );
    let existingRuns: Record<string, unknown>[] = [];

    try {
      existingRuns = JSON.parse(await fs.readFile(logFile, "utf8"));
    } catch {
      existingRuns = [];
    }

    existingRuns.push({
      timestamp: new Date().toISOString(),
      model: process.env.LLM_MODEL,
      categoryAccuracy,
      priorityAccuracy,
      categoryMismatches,
      priorityMismatches,
      latency,
      cost: 0,
      sampleSize,
      dataset,
    });

    await fs.writeFile(logFile, JSON.stringify(existingRuns, null, 2));

    return Response.json({
      dataset,
      sampleSize,
      results,
      categoryMismatches,
      priorityMismatches,
      categoryAccuracy,
      priorityAccuracy,
      latency,
    });
  } catch (error) {
    const status = error instanceof TriageError ? error.status : 500;
    const message =
      error instanceof Error
        ? error.message
        : "The smoke test could not be completed. Please try again.";

    return Response.json({ error: message }, { status });
  }
}
