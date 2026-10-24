"use client";

import { useState } from "react";

export default function TriagePage() {
  const [ticket, setTicket] = useState("");
  const [result, setResult] = useState("");
  const [version, setVersion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitTicket() {
    if (isSubmitting || !ticket.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setResult("");
    setVersion("");

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticket }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        const detail =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Unable to classify this ticket. Please try again.";
        throw new Error(detail);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("result" in data) ||
        typeof data.result !== "string" ||
        !("version" in data) ||
        typeof data.version !== "string"
      ) {
        throw new Error("The server returned an invalid triage result.");
      }

      setResult(data.result);
      setVersion(data.version);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to classify this ticket. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Triage V1</h1>

      <label htmlFor="ticket">Support ticket</label>
      <textarea
        id="ticket"
        value={ticket}
        onChange={(e) => setTicket(e.target.value)}
        rows={10}
        disabled={isSubmitting}
      />

      <button
        onClick={submitTicket}
        disabled={isSubmitting || !ticket.trim()}
      >
        {isSubmitting ? "Classifying..." : "Classify Ticket"}
      </button>

      {error && <p role="alert">{error}</p>}
      {result && (
        <section aria-live="polite">
          <h2>Triage result</h2>
          <p>Prompt version: {version}</p>
          <pre>{result}</pre>
        </section>
      )}
    </main>
  );
}