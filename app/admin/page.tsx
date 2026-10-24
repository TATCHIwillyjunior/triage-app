import fs from "fs/promises";
import path from "path";
import AdminDashboard, { type SmokeTestRun } from "./dashboard";

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === "number";
}

function isSmokeTestRun(value: unknown): value is SmokeTestRun {
  if (typeof value !== "object" || value === null) return false;

  return (
    "timestamp" in value &&
    typeof value.timestamp === "string" &&
    "model" in value &&
    typeof value.model === "string" &&
    "categoryAccuracy" in value &&
    isNullableNumber(value.categoryAccuracy) &&
    "priorityAccuracy" in value &&
    isNullableNumber(value.priorityAccuracy) &&
    "categoryMismatches" in value &&
    typeof value.categoryMismatches === "number" &&
    "priorityMismatches" in value &&
    typeof value.priorityMismatches === "number" &&
    "latency" in value &&
    typeof value.latency === "number" &&
    "cost" in value &&
    typeof value.cost === "number" &&
    "sampleSize" in value &&
    typeof value.sampleSize === "number" &&
    "dataset" in value &&
    typeof value.dataset === "string" &&
    (!("strategy" in value) ||
      typeof value.strategy === "string" ||
      value.strategy === null) &&
    (!("decisionModelCategoryAccuracy" in value) ||
      isNullableNumber(value.decisionModelCategoryAccuracy)) &&
    (!("decisionModelPriorityAccuracy" in value) ||
      isNullableNumber(value.decisionModelPriorityAccuracy)) &&
    (!("decisionModelCategoryMismatches" in value) ||
      isNullableNumber(value.decisionModelCategoryMismatches)) &&
    (!("decisionModelPriorityMismatches" in value) ||
      isNullableNumber(value.decisionModelPriorityMismatches))
  );
}

async function loadSmokeTestRuns(): Promise<SmokeTestRun[]> {
  const logFile = path.join(
    process.cwd(),
    "data",
    "smoke-test-runs.json"
  );

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
    throw new Error("Smoke-test history contains invalid JSON.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isSmokeTestRun)) {
    throw new Error("Smoke-test history contains an invalid run record.");
  }

  return parsed;
}

export default async function AdminPage() {
  try {
    const runs = await loadSmokeTestRuns();
    return <AdminDashboard runs={runs} />;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load smoke-test history.";

    return (
      <main className="admin-page">
        <section className="admin-load-error" role="alert">
          <span className="admin-error-mark" aria-hidden="true">!</span>
          <div>
            <h1>Dashboard data could not be loaded</h1>
            <p>{message}</p>
            <p>
              Check <code>data/smoke-test-runs.json</code> and refresh this page.
            </p>
          </div>
        </section>
      </main>
    );
  }
}
