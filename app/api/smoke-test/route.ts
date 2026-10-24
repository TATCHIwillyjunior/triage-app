import tickets100 from "../../../data/support_tickets_100_labelled.json";
import tickets500 from "../../../data/support_tickets_500.json";
import { classify, isStrategy } from "../../../lib/classifier";
import type { Strategy } from "../../../lib/strategy";
import { TriageError } from "../../../lib/triage";
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
  strategy: Strategy;
};

type SmokeTestRow = {
  ticketId: string;
  expectedCategory?: string;
  expectedPriority?: string;
  predictedCategory: string;
  predictedPriority: string;
  decisionModelCategory?: string;
  decisionModelPriority?: string;
};

type Accuracy = {
  mismatches: number;
  accuracy: number | null;
};

function randomSample<T>(items: T[], count: number): T[] {
  return [...items]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function isSmokeTestRequest(value: unknown): value is SmokeTestRequest {
  if (
    typeof value !== "object" ||
    value === null ||
    !("dataset" in value) ||
    !("sampleSize" in value) ||
    !("strategy" in value)
  ) {
    return false;
  }

  return (
    (value.dataset === "100" || value.dataset === "500") &&
    typeof value.sampleSize === "number" &&
    Number.isInteger(value.sampleSize) &&
    value.sampleSize >= 1 &&
    value.sampleSize <= 100 &&
    isStrategy(value.strategy)
  );
}

function calculateAccuracy(
  rows: SmokeTestRow[],
  expectedKey: "expectedCategory" | "expectedPriority",
  predictedKey: "predictedCategory" | "predictedPriority"
): Accuracy {
  const labelledRows = rows.filter((row) => expectedKey in row);
  const mismatches = labelledRows.filter(
    (row) => row[expectedKey] !== row[predictedKey]
  ).length;

  return {
    mismatches,
    accuracy:
      labelledRows.length === 0
        ? null
        : Number(
            (
              ((labelledRows.length - mismatches) / labelledRows.length) *
              100
            ).toFixed(2)
          ),
  };
}

async function readExistingRuns(
  logFile: string
): Promise<Record<string, unknown>[]> {
  let content: string;

  try {
    content = await fs.readFile(logFile, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The smoke-test history file contains invalid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("The smoke-test history file must contain a JSON array.");
  }

  return parsed as Record<string, unknown>[];
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
            "Choose a valid dataset, sample size from 1 to 100, and classification strategy.",
        },
        { status: 400 }
      );
    }

    const startedAt = Date.now();
    const { dataset, sampleSize, strategy } = body;
    const selectedTickets =
      dataset === "100"
        ? randomSample(tickets100 as Ticket100[], sampleSize)
        : randomSample(tickets500 as Ticket500[], sampleSize);

    const results: SmokeTestRow[] = [];

    for (const ticket of selectedTickets) {
      const classification = await classify(
        `${ticket.subject}\n\n${ticket.body}`,
        strategy
      );

      const row: SmokeTestRow = {
        ticketId: ticket.ticket_id,
        predictedCategory: classification.triage.category,
        predictedPriority: classification.triage.priority,
      };

      if (
        dataset === "100" &&
        "category" in ticket &&
        typeof ticket.category === "string" &&
        "priority" in ticket &&
        typeof ticket.priority === "string"
      ) {
        row.expectedCategory = ticket.category;
        row.expectedPriority = ticket.priority;
      }

      if (classification.decisionModel) {
        row.decisionModelCategory = classification.decisionModel.category;
        row.decisionModelPriority = classification.decisionModel.priority;
      }

      results.push(row);
    }

    const category = calculateAccuracy(
      results,
      "expectedCategory",
      "predictedCategory"
    );
    const priority = calculateAccuracy(
      results,
      "expectedPriority",
      "predictedPriority"
    );
    const decisionModelCategory =
      strategy === "dm-llm"
        ? calculateAccuracy(
            results.map((row) => ({
              ...row,
              predictedCategory: row.decisionModelCategory ?? "",
            })),
            "expectedCategory",
            "predictedCategory"
          )
        : null;
    const decisionModelPriority =
      strategy === "dm-llm"
        ? calculateAccuracy(
            results.map((row) => ({
              ...row,
              predictedPriority: row.decisionModelPriority ?? "",
            })),
            "expectedPriority",
            "predictedPriority"
          )
        : null;
    const latency = Date.now() - startedAt;

    const logFile = path.join(
      process.cwd(),
      "data",
      "smoke-test-runs.json"
    );
    const existingRuns = await readExistingRuns(logFile);

    existingRuns.push({
      timestamp: new Date().toISOString(),
      model:
        strategy === "dm"
          ? "not-used"
          : process.env.LLM_MODEL ?? "unconfigured",
      strategy,
      categoryAccuracy: category.accuracy,
      priorityAccuracy: priority.accuracy,
      categoryMismatches: category.mismatches,
      priorityMismatches: priority.mismatches,
      decisionModelCategoryAccuracy: decisionModelCategory?.accuracy ?? null,
      decisionModelPriorityAccuracy: decisionModelPriority?.accuracy ?? null,
      decisionModelCategoryMismatches:
        decisionModelCategory?.mismatches ?? null,
      decisionModelPriorityMismatches:
        decisionModelPriority?.mismatches ?? null,
      latency,
      cost: 0,
      sampleSize,
      dataset,
    });

    await fs.writeFile(logFile, JSON.stringify(existingRuns, null, 2));

    return Response.json({
      dataset,
      sampleSize,
      strategy,
      results,
      categoryMismatches: category.mismatches,
      priorityMismatches: priority.mismatches,
      categoryAccuracy: category.accuracy,
      priorityAccuracy: priority.accuracy,
      decisionModelCategoryMismatches:
        decisionModelCategory?.mismatches ?? null,
      decisionModelPriorityMismatches:
        decisionModelPriority?.mismatches ?? null,
      decisionModelCategoryAccuracy: decisionModelCategory?.accuracy ?? null,
      decisionModelPriorityAccuracy: decisionModelPriority?.accuracy ?? null,
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
