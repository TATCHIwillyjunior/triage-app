"use client";

import { useState } from "react";

type SmokeTestRow = {
  ticketId: string;
  expectedCategory?: string;
  predictedCategory: string;
  expectedPriority?: string;
  predictedPriority: string;
};

type SmokeTestResult = {
  dataset: "100" | "500";
  sampleSize: number;
  results: SmokeTestRow[];
  categoryMismatches: number;
  priorityMismatches: number;
  categoryAccuracy: number | null;
  priorityAccuracy: number | null;
  latency: number;
};

function isSmokeTestResult(value: unknown): value is SmokeTestResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "dataset" in value &&
    (value.dataset === "100" || value.dataset === "500") &&
    "sampleSize" in value &&
    typeof value.sampleSize === "number" &&
    "results" in value &&
    Array.isArray(value.results) &&
    "categoryMismatches" in value &&
    typeof value.categoryMismatches === "number" &&
    "priorityMismatches" in value &&
    typeof value.priorityMismatches === "number" &&
    "categoryAccuracy" in value &&
    (typeof value.categoryAccuracy === "number" ||
      value.categoryAccuracy === null) &&
    "priorityAccuracy" in value &&
    (typeof value.priorityAccuracy === "number" ||
      value.priorityAccuracy === null) &&
    "latency" in value &&
    typeof value.latency === "number" &&
    value.results.every(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        "ticketId" in row &&
        typeof row.ticketId === "string" &&
        "predictedCategory" in row &&
        typeof row.predictedCategory === "string" &&
        "predictedPriority" in row &&
        typeof row.predictedPriority === "string"
    )
  );
}

function getErrorMessage(payload: unknown, status: number): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return `The smoke test failed (HTTP ${status}). Please try again.`;
}

export default function SmokeTestPage() {
  const [dataset, setDataset] = useState<"100" | "500">("100");
  const [sampleSize, setSampleSize] = useState(10);
  const [result, setResult] = useState<SmokeTestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSmokeTest() {
    if (running) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/smoke-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset,
          sampleSize,
        }),
      });

      const responseText = await response.text();
      let payload: unknown = null;
      if (responseText.trim()) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          if (response.ok) {
            throw new Error(
              "The server returned an invalid response. Please try again."
            );
          }
        }
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, response.status));
      }

      if (!isSmokeTestResult(payload)) {
        throw new Error(
          "The server returned an incomplete test result. Please try again."
        );
      }

      setResult(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The smoke test could not be completed. Please try again."
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="smoke-page">
      <div className="smoke-shell">
        <a className="smoke-back-link" href="/">
          <span aria-hidden="true">←</span> Support chat
        </a>

        <header className="smoke-header">
          <div className="smoke-eyebrow">
            <span className="smoke-status-dot" />
            MODEL EVALUATION
          </div>
          <h1>Smoke test runner</h1>
          <p>
            Run a quick sample of support tickets through the triage model and
            review its classification accuracy.
          </p>
        </header>

        <section className="smoke-config" aria-labelledby="config-title">
          <div className="smoke-section-heading">
            <div>
              <span className="smoke-step">01</span>
              <h2 id="config-title">Configure a run</h2>
            </div>
            <span className="smoke-muted">Usually takes a few moments</span>
          </div>

          <div className="smoke-fields">
            <div className="smoke-field">
              <label htmlFor="dataset">Ticket dataset</label>
              <select
                id="dataset"
                value={dataset}
                onChange={(event) =>
                  setDataset(event.target.value as "100" | "500")
                }
                disabled={running}
              >
                <option value="100">100 labelled tickets</option>
                <option value="500">500 unlabelled tickets</option>
              </select>
              <span className="smoke-field-hint">
                Labelled tickets include expected categories and priorities.
              </span>
            </div>

            <div className="smoke-field smoke-sample-field">
              <label htmlFor="sample-size">Tickets to sample</label>
              <div className="smoke-number-wrap">
                <input
                  id="sample-size"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={sampleSize}
                  onChange={(event) =>
                    setSampleSize(Number(event.target.value))
                  }
                  disabled={running}
                />
                <span>tickets</span>
              </div>
              <span className="smoke-field-hint">
                Choose between 1 and 100 tickets per run.
              </span>
            </div>
          </div>

          <div className="smoke-actions">
            <p>
              {dataset === "100"
                ? "Accuracy scores are calculated against labelled data."
                : "Unlabelled runs show model predictions without accuracy scores."}
            </p>
            <button
              className="smoke-run-button"
              type="button"
              onClick={runSmokeTest}
              disabled={running || !Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 100}
            >
              {running ? (
                <>
                  <span className="smoke-spinner" aria-hidden="true" />
                  Running test…
                </>
              ) : (
                <>
                  Run smoke test <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </section>

        {running && (
          <div className="smoke-running" role="status" aria-live="polite">
            <span className="smoke-spinner" aria-hidden="true" />
            <div>
              <strong>Evaluating tickets</strong>
              <p>The model is processing your sample. Keep this page open.</p>
            </div>
          </div>
        )}

        {error && (
          <section className="smoke-error" role="alert">
            <div className="smoke-error-icon" aria-hidden="true">
              !
            </div>
            <div>
              <h2>Test run could not finish</h2>
              <p>{error}</p>
              <p className="smoke-error-hint">
                Your settings are still here. You can retry when the service is
                available.
              </p>
            </div>
          </section>
        )}

        {result && (
          <section className="smoke-results" aria-labelledby="results-title">
            <div className="smoke-section-heading smoke-results-heading">
              <div>
                <span className="smoke-step">02</span>
                <h2 id="results-title">Run summary</h2>
              </div>
              <span className="smoke-run-tag">
                {result.sampleSize} tickets ·{" "}
                {result.dataset === "100" ? "labelled" : "unlabelled"}
              </span>
            </div>

            <div className="smoke-metrics">
              <article className="smoke-metric">
                <span>Category accuracy</span>
                <strong>
                  {result.categoryAccuracy === null
                    ? "—"
                    : `${result.categoryAccuracy}%`}
                </strong>
                <small>
                  {result.categoryMismatches} mismatches
                </small>
              </article>
              <article className="smoke-metric">
                <span>Priority accuracy</span>
                <strong>
                  {result.priorityAccuracy === null
                    ? "—"
                    : `${result.priorityAccuracy}%`}
                </strong>
                <small>
                  {result.priorityMismatches} mismatches
                </small>
              </article>
              <article className="smoke-metric">
                <span>Processing time</span>
                <strong>
                  {result.latency < 1000
                    ? `${result.latency} ms`
                    : `${(result.latency / 1000).toFixed(1)} s`}
                </strong>
                <small>End-to-end run duration</small>
              </article>
            </div>

            <div className="smoke-table-heading">
              <div>
                <h3>Ticket-by-ticket results</h3>
                <p>Compare expected labels with the model prediction.</p>
              </div>
              <span>{result.results.length} results</span>
            </div>
            <div className="smoke-table-wrap">
              <table className="smoke-table">
                <thead>
                  <tr>
                    <th scope="col">Ticket</th>
                    <th scope="col">Expected category</th>
                    <th scope="col">Predicted category</th>
                    <th scope="col">Expected priority</th>
                    <th scope="col">Predicted priority</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row) => (
                    <tr key={row.ticketId}>
                      <th scope="row">{row.ticketId}</th>
                      <td>{row.expectedCategory ?? "—"}</td>
                      <td>
                        <span className="smoke-value-pill">
                          {row.predictedCategory}
                        </span>
                      </td>
                      <td>{row.expectedPriority ?? "—"}</td>
                      <td>
                        <span className="smoke-value-pill">
                          {row.predictedPriority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
