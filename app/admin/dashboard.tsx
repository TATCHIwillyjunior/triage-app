"use client";

import { useMemo, useState } from "react";

export type SmokeTestRun = {
  timestamp: string;
  model: string;
  strategy?: string | null;
  categoryAccuracy: number | null;
  priorityAccuracy: number | null;
  categoryMismatches: number;
  priorityMismatches: number;
  decisionModelCategoryAccuracy?: number | null;
  decisionModelPriorityAccuracy?: number | null;
  decisionModelCategoryMismatches?: number | null;
  decisionModelPriorityMismatches?: number | null;
  latency: number;
  cost: number;
  sampleSize: number;
  dataset: string;
};

type StrategyKey = "llm" | "dm" | "dm-llm";
type MetricKey =
  | "categoryAccuracy"
  | "priorityAccuracy"
  | "decisionModelCategoryAccuracy"
  | "decisionModelPriorityAccuracy";

const strategyLabels: Record<StrategyKey, string> = {
  llm: "LLM",
  dm: "Decision Model",
  "dm-llm": "DM + LLM",
};

function getStrategy(run: SmokeTestRun): string {
  return run.strategy || "llm";
}

function formatAccuracy(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

function formatLatency(milliseconds: number): string {
  return milliseconds < 1000
    ? `${milliseconds} ms`
    : `${(milliseconds / 1000).toFixed(1)} s`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function strategyMetric(
  runs: SmokeTestRun[],
  strategy: StrategyKey,
  metric: MetricKey
): { accuracy: number | null; samples: number } {
  const useDecisionModel =
    metric === "decisionModelCategoryAccuracy" ||
    metric === "decisionModelPriorityAccuracy";
  const relevantRuns = runs.filter(
    (run) =>
      getStrategy(run) === strategy &&
      run.dataset === "100" &&
      (!useDecisionModel || strategy === "dm-llm")
  );

  let correct = 0;
  let evaluated = 0;

  for (const run of relevantRuns) {
    const accuracy = run[metric];
    if (accuracy === null || accuracy === undefined) continue;
    const mismatchKey =
      metric === "categoryAccuracy" ||
      metric === "decisionModelCategoryAccuracy"
        ? metric === "categoryAccuracy"
          ? "categoryMismatches"
          : "decisionModelCategoryMismatches"
        : metric === "priorityAccuracy"
          ? "priorityMismatches"
          : "decisionModelPriorityMismatches";
    const mismatches = run[mismatchKey] ?? 0;
    correct += Math.max(0, run.sampleSize - mismatches);
    evaluated += run.sampleSize;
  }

  return {
    accuracy: evaluated === 0 ? null : (correct / evaluated) * 100,
    samples: evaluated,
  };
}

function accuracyBar(value: number | null, label: string) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className="admin-bar-cell" aria-label={`${label}: ${formatAccuracy(value)}`}>
      <div className="admin-bar-track">
        <span style={{ width: `${width}%` }} />
      </div>
      <strong>{formatAccuracy(value)}</strong>
    </div>
  );
}

export default function AdminDashboard({ runs }: { runs: SmokeTestRun[] }) {
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [datasetFilter, setDatasetFilter] = useState("all");
  const [search, setSearch] = useState("");

  const sortedRuns = useMemo(
    () =>
      [...runs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [runs]
  );

  const visibleRuns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedRuns.filter((run) => {
      const matchesStrategy =
        strategyFilter === "all" || getStrategy(run) === strategyFilter;
      const matchesDataset =
        datasetFilter === "all" || run.dataset === datasetFilter;
      const matchesSearch =
        !query ||
        [
          run.model,
          run.dataset,
          getStrategy(run),
          run.timestamp,
        ].some((field) => field.toLowerCase().includes(query));
      return matchesStrategy && matchesDataset && matchesSearch;
    });
  }, [datasetFilter, search, sortedRuns, strategyFilter]);

  const labelledRuns = sortedRuns.filter(
    (run) =>
      run.dataset === "100" &&
      run.categoryAccuracy !== null &&
      run.priorityAccuracy !== null
  );
  const labelledSamples = labelledRuns.reduce(
    (total, run) => total + run.sampleSize,
    0
  );
  const totalLatency = sortedRuns.reduce((total, run) => total + run.latency, 0);
  const averageLatency =
    sortedRuns.length === 0 ? 0 : totalLatency / sortedRuns.length;
  const totalCost = sortedRuns.reduce((total, run) => total + run.cost, 0);
  const latestRun = sortedRuns[0];
  const strategies: StrategyKey[] = ["llm", "dm", "dm-llm"];

  return (
    <main className="admin-page">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <a className="admin-brand" href="/admin">
            <span className="admin-brand-mark">S</span>
            <span>
              <strong>SupportOps</strong>
              <small>TRIAGE CONSOLE</small>
            </span>
          </a>

          <span className="admin-nav-label">WORKSPACE</span>
          <nav className="admin-nav" aria-label="Admin navigation">
            <a className="admin-nav-item admin-nav-active" href="/admin">
              <span aria-hidden="true">▦</span> Overview
            </a>
            <a className="admin-nav-item" href="/smoke-test">
              <span aria-hidden="true">◉</span> Smoke tests
            </a>
            <a className="admin-nav-item" href="/triage">
              <span aria-hidden="true">✳</span> Ticket triage
            </a>
            <a className="admin-nav-item" href="/">
              <span aria-hidden="true">↗</span> Support chat
            </a>
          </nav>

          <div className="admin-sidebar-footer">
            <span className="admin-live-dot" />
            Local evaluation workspace
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div className="admin-breadcrumb">
              Workspace <span>/</span> <strong>Overview</strong>
            </div>
            <div className="admin-topbar-right">
              <span className="admin-env-badge">DEVELOPMENT</span>
              <span className="admin-avatar" aria-label="Administrator">A</span>
            </div>
          </header>

          <div className="admin-content">
            <section className="admin-page-heading">
              <div>
                <p className="admin-eyebrow">MODEL EVALUATION</p>
                <h1>Smoke test overview</h1>
                <p>
                  Monitor classification quality, compare strategies, and
                  review every recorded evaluation run.
                </p>
              </div>
              <a className="admin-primary-link" href="/smoke-test">
                <span aria-hidden="true">＋</span> New smoke test
              </a>
            </section>

            <section className="admin-stat-grid" aria-label="Key metrics">
              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Total runs</span>
                  <span className="admin-stat-icon admin-icon-blue">▦</span>
                </div>
                <strong>{runs.length}</strong>
                <small>All recorded evaluation runs</small>
              </article>
              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Labelled tickets evaluated</span>
                  <span className="admin-stat-icon admin-icon-violet">◫</span>
                </div>
                <strong>{labelledSamples.toLocaleString()}</strong>
                <small>Across runs using labelled data</small>
              </article>
              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Average run latency</span>
                  <span className="admin-stat-icon admin-icon-amber">◷</span>
                </div>
                <strong>
                  {runs.length === 0 ? "—" : formatLatency(averageLatency)}
                </strong>
                <small>Across {runs.length} total runs</small>
              </article>
              <article className="admin-stat-card">
                <div className="admin-stat-top">
                  <span>Logged cost</span>
                  <span className="admin-stat-icon admin-icon-green">$</span>
                </div>
                <strong>${totalCost.toFixed(2)}</strong>
                <small>Recorded values; current logger uses $0</small>
              </article>
            </section>

            <section className="admin-panel" aria-labelledby="strategy-title">
              <div className="admin-panel-heading">
                <div>
                  <h2 id="strategy-title">Strategy performance</h2>
                  <p>
                    Weighted labelled-run accuracy from recorded smoke tests.
                    Hybrid DM metrics show the rule-model comparison.
                  </p>
                </div>
                <span className="admin-panel-tag">LABELLED DATA ONLY</span>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table admin-performance-table">
                  <thead>
                    <tr>
                      <th scope="col">Strategy</th>
                      <th scope="col">Runs</th>
                      <th scope="col">Labelled samples</th>
                      <th scope="col">Category accuracy</th>
                      <th scope="col">Priority accuracy</th>
                      <th scope="col">Average latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((strategy) => {
                      const strategyRuns = labelledRuns.filter(
                        (run) => getStrategy(run) === strategy
                      );
                      const cat = strategyMetric(
                        sortedRuns,
                        strategy,
                        "categoryAccuracy"
                      );
                      const pri = strategyMetric(
                        sortedRuns,
                        strategy,
                        "priorityAccuracy"
                      );
                      const latencies = strategyRuns.map((run) => run.latency);
                      const latency =
                        latencies.length === 0
                          ? null
                          : latencies.reduce((sum, value) => sum + value, 0) /
                            latencies.length;

                      return (
                        <tr key={strategy}>
                          <th scope="row">
                            <span className={`admin-strategy-dot admin-dot-${strategy}`} />
                            {strategyLabels[strategy]}
                          </th>
                          <td>{strategyRuns.length}</td>
                          <td>{cat.samples.toLocaleString()}</td>
                          <td>{accuracyBar(cat.accuracy, "Category accuracy")}</td>
                          <td>{accuracyBar(pri.accuracy, "Priority accuracy")}</td>
                          <td>{latency === null ? "—" : formatLatency(latency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="admin-hybrid-note">
                <strong>Hybrid DM comparison</strong>
                {(() => {
                  const cat = strategyMetric(
                    sortedRuns,
                    "dm-llm",
                    "decisionModelCategoryAccuracy"
                  );
                  const pri = strategyMetric(
                    sortedRuns,
                    "dm-llm",
                    "decisionModelPriorityAccuracy"
                  );
                  return (
                    <span>
                      Decision Model accuracy on hybrid runs: category{" "}
                      {formatAccuracy(cat.accuracy)} · priority{" "}
                      {formatAccuracy(pri.accuracy)} · {cat.samples} labelled
                      samples
                    </span>
                  );
                })()}
              </div>
            </section>

            <section className="admin-panel admin-history-panel" aria-labelledby="history-title">
              <div className="admin-panel-heading admin-history-heading">
                <div>
                  <h2 id="history-title">Run history</h2>
                  <p>
                    {visibleRuns.length} of {runs.length} runs · latest run{" "}
                    {latestRun ? formatTimestamp(latestRun.timestamp) : "not yet recorded"}
                  </p>
                </div>
                <div className="admin-filters">
                  <label>
                    <span className="admin-sr-only">Search runs</span>
                    <input
                      type="search"
                      placeholder="Search model or date…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  <label>
                    <span className="admin-sr-only">Filter by strategy</span>
                    <select
                      value={strategyFilter}
                      onChange={(event) => setStrategyFilter(event.target.value)}
                    >
                      <option value="all">All strategies</option>
                      <option value="llm">LLM</option>
                      <option value="dm">Decision Model</option>
                      <option value="dm-llm">DM + LLM</option>
                    </select>
                  </label>
                  <label>
                    <span className="admin-sr-only">Filter by dataset</span>
                    <select
                      value={datasetFilter}
                      onChange={(event) => setDatasetFilter(event.target.value)}
                    >
                      <option value="all">All datasets</option>
                      <option value="100">100 labelled</option>
                      <option value="500">500 unlabelled</option>
                    </select>
                  </label>
                </div>
              </div>

              {runs.length === 0 ? (
                <div className="admin-empty">
                  <span aria-hidden="true">◷</span>
                  <h3>No smoke tests yet</h3>
                  <p>Run an evaluation to see its metrics and history here.</p>
                  <a className="admin-primary-link" href="/smoke-test">
                    Start a smoke test
                  </a>
                </div>
              ) : visibleRuns.length === 0 ? (
                <div className="admin-filter-empty">
                  No runs match these filters. Try changing your search.
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-history-table">
                    <thead>
                      <tr>
                        <th scope="col">Run date</th>
                        <th scope="col">Strategy</th>
                        <th scope="col">Model</th>
                        <th scope="col">Dataset</th>
                        <th scope="col">Sample</th>
                        <th scope="col">Category accuracy</th>
                        <th scope="col">Category errors</th>
                        <th scope="col">Priority accuracy</th>
                        <th scope="col">Priority errors</th>
                        <th scope="col">DM category</th>
                        <th scope="col">DM category errors</th>
                        <th scope="col">DM priority</th>
                        <th scope="col">DM priority errors</th>
                        <th scope="col">Latency</th>
                        <th scope="col">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRuns.map((run, index) => (
                        <tr key={`${run.timestamp}-${index}`}>
                          <td className="admin-date-cell">
                            <strong>{formatTimestamp(run.timestamp)}</strong>
                            <small>{run.timestamp}</small>
                          </td>
                          <td>
                            <span className={`admin-strategy-badge admin-badge-${getStrategy(run)}`}>
                              {strategyLabels[getStrategy(run) as StrategyKey] ??
                                getStrategy(run)}
                            </span>
                          </td>
                          <td className="admin-model-cell">
                            {run.model === "not-used" ? (
                              <span className="admin-muted">Not used</span>
                            ) : (
                              run.model
                            )}
                          </td>
                          <td>
                            <span className={`admin-dataset-badge ${run.dataset === "100" ? "admin-labelled" : "admin-unlabelled"}`}>
                              {run.dataset === "100" ? "Labelled" : "Unlabelled"}
                            </span>
                          </td>
                          <td>{run.sampleSize}</td>
                          <td>{formatAccuracy(run.categoryAccuracy)}</td>
                          <td>{run.categoryMismatches}</td>
                          <td>{formatAccuracy(run.priorityAccuracy)}</td>
                          <td>{run.priorityMismatches}</td>
                          <td>{formatAccuracy(run.decisionModelCategoryAccuracy)}</td>
                          <td>{run.decisionModelCategoryMismatches ?? "—"}</td>
                          <td>{formatAccuracy(run.decisionModelPriorityAccuracy)}</td>
                          <td>{run.decisionModelPriorityMismatches ?? "—"}</td>
                          <td>{formatLatency(run.latency)}</td>
                          <td>${run.cost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="admin-table-footnote">
                “DM category” and “DM priority” are populated for hybrid
                evaluations. Accuracy is unavailable for unlabelled runs.
                Logged cost is currently a placeholder, not measured billing.
              </div>
            </section>

            <footer className="admin-footer">
              <span>SupportOps evaluation console</span>
              <span>
                {latestRun
                  ? `Last activity ${formatTimestamp(latestRun.timestamp)}`
                  : "Waiting for first run"}
              </span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
