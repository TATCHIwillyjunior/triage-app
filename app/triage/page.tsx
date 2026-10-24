"use client";

import { useState } from "react";
import type { Strategy } from "../../lib/strategy";

type TriageResult = {
  category: string;
  priority: string;
  summary: string;
  suggestedAction: string;
};

type Usage = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
};

export default function TriagePage() {
  const [ticket, setTicket] = useState("");
  const [strategy, setStrategy] = useState<"llm" | "dm" | "dm-llm">("llm");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [decisionModelResult, setDecisionModelResult] =
    useState<TriageResult | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [version, setVersion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitTicket() {
    if (isSubmitting || !ticket.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setDecisionModelResult(null);
    setUsage(null);
    setVersion("");

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket, strategy }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        const detail =
          typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Unable to classify this ticket.";

        throw new Error(detail);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("triage" in data) ||
        !("version" in data) ||
        !("usage" in data)
      ) {
        throw new Error("The server returned an invalid triage result.");
      }

      setResult(data.triage as TriageResult);
      setVersion(data.version as string);
      setUsage(data.usage as Usage | null);
      if (
        "decisionModel" in data &&
        typeof data.decisionModel === "object" &&
        data.decisionModel !== null
      ) {
        setDecisionModelResult(data.decisionModel as TriageResult);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to classify this ticket."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="triage-page">
      <div className="triage-shell">
        <a className="triage-back-link" href="/">
          <span aria-hidden="true">←</span> Support chat
        </a>

        <header className="triage-header">
          <div className="triage-eyebrow">
            <span className="triage-eyebrow-mark" aria-hidden="true">
              ✦
            </span>
            AI-ASSISTED SUPPORT
          </div>
          <h1>Ticket triage</h1>
          <p>
            Turn a support request into clear, actionable next steps for your
            team.
          </p>
        </header>

        <section className="triage-card" aria-labelledby="ticket-heading">
          <div className="triage-card-heading">
            <div>
              <span className="triage-step">01</span>
              <div>
                <h2 id="ticket-heading">Describe the issue</h2>
                <p>Include the details that will help us route it correctly.</p>
              </div>
            </div>
            <span className="triage-version-badge">
              {strategy === "dm"
                ? "DECISION MODEL"
                : strategy === "dm-llm"
                  ? "DM + LLM"
                  : "TRIAGE V2"}
            </span>
          </div>
          <label className="triage-label" htmlFor="strategy">
            Classification strategy
          </label>
          <select
            className="triage-strategy-select"
            id="strategy"
            value={strategy}
            onChange={(event) =>
              setStrategy(event.target.value as Strategy)
            }
            disabled={isSubmitting}
          >
            <option value="llm">LLM (Gemini)</option>
            <option value="dm">Decision Model (rules)</option>
            <option value="dm-llm">Decision Model + LLM</option>
          </select>

          <label className="triage-label" htmlFor="ticket">
            Support ticket
          </label>
          <textarea
            className="triage-textarea"
            id="ticket"
            value={ticket}
            onChange={(event) => setTicket(event.target.value)}
            placeholder="For example: I can't access my account after resetting my password. I need help before my meeting this afternoon."
            rows={7}
            disabled={isSubmitting}
          />
          <div className="triage-input-footer">
            <span>Your ticket is analyzed to suggest a category and priority.</span>
            <span>{ticket.length} characters</span>
          </div>

          <div className="triage-form-footer">
            <p>Results are suggestions. Your team makes the final call.</p>
            <button
              className="triage-submit"
              type="button"
              onClick={submitTicket}
              disabled={isSubmitting || !ticket.trim()}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="triage-button-spinner" aria-hidden="true" />
                  Analyzing ticket…
                </>
              ) : (
                <>
                  Classify ticket <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </div>
        </section>

        {isSubmitting && (
          <section
            className="triage-loading-card"
            role="status"
            aria-live="polite"
            aria-label="Ticket classification in progress"
          >
            <div className="triage-loading-visual" aria-hidden="true">
              <span className="triage-loading-orbit triage-orbit-one" />
              <span className="triage-loading-orbit triage-orbit-two" />
              <span className="triage-loading-center">✦</span>
            </div>
            <div className="triage-loading-copy">
              <span className="triage-loading-kicker">WORKING ON IT</span>
              <h2>Finding the right route</h2>
              <p>
                Reviewing the ticket and preparing a suggested category,
                priority, and action.
              </p>
              <div className="triage-progress-track" aria-hidden="true">
                <span />
              </div>
              <span className="triage-loading-note">
                This can take a little longer when the AI service is busy.
              </span>
            </div>
            <div className="triage-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </section>
        )}

        {error && (
          <section className="triage-error" role="alert">
            <span className="triage-error-mark" aria-hidden="true">
              !
            </span>
            <div>
              <h2>We couldn’t classify this ticket</h2>
              <p>{error}</p>
              <span>You can try again in a moment.</span>
            </div>
          </section>
        )}

        {result && (
          <section className="triage-result-card" aria-live="polite">
            <div className="triage-result-heading">
              <div>
                <span className="triage-step">02</span>
                <div>
                  <h2>Triage result</h2>
                  <p>Suggested handling for this support request.</p>
                </div>
              </div>
              <span className="triage-result-version">{version}</span>
            </div>

            <div className="triage-result-grid">
              <div className="triage-result-item">
                <span>Category</span>
                <strong>{result.category.replaceAll("_", " ")}</strong>
              </div>
              <div className="triage-result-item">
                <span>Priority</span>
                <strong className={`triage-priority triage-priority-${result.priority}`}>
                  {result.priority}
                </strong>
              </div>
              <div className="triage-result-item triage-result-wide">
                <span>Summary</span>
                <p>{result.summary}</p>
              </div>
              <div className="triage-result-item triage-result-wide">
                <span>Suggested action</span>
                <p>{result.suggestedAction}</p>
              </div>
            </div>

            {decisionModelResult && (
              <div className="triage-comparison">
                <h3>Decision Model comparison</h3>
                <p>
                  The displayed triage above is the LLM prediction. This
                  separate result shows the rule-based model prediction.
                </p>
                <div className="triage-comparison-values">
                  <span>
                    <strong>Category:</strong>{" "}
                    {decisionModelResult.category.replaceAll("_", " ")}
                  </span>
                  <span>
                    <strong>Priority:</strong>{" "}
                    {decisionModelResult.priority}
                  </span>
                </div>
              </div>
            )}

            {usage && (
              <div className="triage-usage" aria-label="Model token usage">
                <div className="triage-usage-heading">
                  <span className="triage-usage-icon" aria-hidden="true">
                    #
                  </span>
                  <div>
                    <h3>Model usage</h3>
                    <p>Tokens used for this classification</p>
                  </div>
                </div>
                <dl className="triage-usage-metrics">
                  <div>
                    <dt>Input Tokens</dt>
                    <dd>{usage.promptTokenCount}</dd>
                  </div>
                  <div>
                    <dt>Output Tokens</dt>
                    <dd>{usage.candidatesTokenCount}</dd>
                  </div>
                  <div>
                    <dt>Total Tokens</dt>
                    <dd>{usage.totalTokenCount}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
