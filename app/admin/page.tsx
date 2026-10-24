import fs from "fs/promises";
import path from "path";

type SmokeTestRun = {
  timestamp: string;
  model: string;
  categoryAccuracy: number | null;
  priorityAccuracy: number | null;
  categoryMismatches: number;
  priorityMismatches: number;
  latency: number;
  cost: number;
  sampleSize: number;
  dataset: string;
};

export default async function AdminPage() {
  const logFile = path.join(
    process.cwd(),
    "data",
    "smoke-test-runs.json"
  );

  let runs: SmokeTestRun[] = [];

  try {
    const file = await fs.readFile(
      logFile,
      "utf8"
    );

    runs = JSON.parse(file);
  } catch {
    runs = [];
  }

  runs.reverse();

  return (
    <main
      style={{
        padding: "2rem",
      }}
    >
      <h1>Smoke Test Logs</h1>

      {runs.length === 0 ? (
        <p>No smoke tests have been run yet.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>Date</th>
              <th>Model</th>
              <th>Dataset</th>
              <th>Sample</th>
              <th>Category Accuracy</th>
              <th>Priority Accuracy</th>
              <th>Category Mismatches</th>
              <th>Priority Mismatches</th>
              <th>Latency (ms)</th>
              <th>Cost</th>
            </tr>
          </thead>

          <tbody>
            {runs.map((run, index) => (
              <tr key={index}>
                <td>{run.timestamp}</td>
                <td>{run.model}</td>
                <td>{run.dataset}</td>
                <td>{run.sampleSize}</td>
                <td>
                  {run.categoryAccuracy ?? "-"}%
                </td>
                <td>
                  {run.priorityAccuracy ?? "-"}%
                </td>
                <td>
                  {run.categoryMismatches}
                </td>
                <td>
                  {run.priorityMismatches}
                </td>
                <td>{run.latency}</td>
                <td>${run.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}