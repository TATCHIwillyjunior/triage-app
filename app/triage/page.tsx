"use client";

import { useState } from "react";

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
  const [result, setResult] = useState<TriageResult | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [version, setVersion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitTicket() {
    if (isSubmitting || !ticket.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setUsage(null);
    setVersion("");

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket,
        }),
      });

      const data: unknown = await response.json();
      console.log(data);

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
        throw new Error(
          "The server returned an invalid triage result."
        );
      }

      setResult(data.triage as TriageResult);
      setVersion(data.version as string);
      setUsage(data.usage as Usage);

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to classify this ticket."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Triage V2</h1>

      <label htmlFor="ticket">
        Support Ticket
      </label>

      <textarea
        id="ticket"
        value={ticket}
        onChange={(e) =>
          setTicket(e.target.value)
        }
        rows={10}
        disabled={isSubmitting}
      />

      <button
        onClick={submitTicket}
        disabled={
          isSubmitting || !ticket.trim()
        }
      >
        {isSubmitting
          ? "Classifying..."
          : "Classify Ticket"}
      </button>

      {error && (
        <p role="alert">
          {error}
        </p>
      )}

      {result && (
        <section aria-live="polite">
          <h2>Triage Result</h2>

          <p>
            Prompt Version: {version}
          </p>

          <p>
            <strong>Category:</strong>{" "}
            {result.category}
          </p>

          <p>
            <strong>Priority:</strong>{" "}
            {result.priority}
          </p>

          <p>
            <strong>Summary:</strong>{" "}
            {result.summary}
          </p>

          <p>
            <strong>Suggested Action:</strong>{" "}
            {result.suggestedAction}
          </p>
        </section>
      )}

      {usage && (
        <section aria-label="Token usage">
          <h3>Token Usage</h3>

          <p>
            <strong>Input Tokens:</strong>{" "}
            {usage.promptTokenCount}
          </p>

          <p>
            <strong>Output Tokens:</strong>{" "}
            {usage.candidatesTokenCount}
          </p>

          <p>
            <strong>Total Tokens:</strong>{" "}
            {usage.totalTokenCount}
          </p>
        </section>
      )}
    </main>
  );
}