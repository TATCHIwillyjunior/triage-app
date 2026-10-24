# Support ticket triage app

A Next.js application for experimenting with AI-assisted IT support workflows.
It includes a conversational support demo, a structured ticket-triage feature,
and a smoke-test runner for checking model classifications against sample
ticket data.

The triage workflow sends a ticket to a configured language model (LLM), asks
for a structured classification, validates the returned JSON, and displays the
suggested category, priority, summary, and action. The project is intended for
learning and evaluation; model output should be reviewed by a human support
team before action is taken.

## Gemini API integration

The application currently uses the **Google Gemini API** through Google's
`@google/genai` JavaScript SDK. Both the chat and ticket-triage server routes
send model requests through the shared Gemini client in `lib/llm.ts`.

Configure a Gemini API key and the Gemini model name in `.env.local` before
using the model-backed features. `LLM_API_KEY` is passed to the Google GenAI
client as the Gemini API key, and `LLM_MODEL` selects the Gemini model used
for generation. The API key is used on the server and must not be exposed in
browser code or committed to source control.

## Features

### Support chat

The home page (`/`) provides a conversational interface. It keeps the current
conversation in page state and sends the message history to `/api/chat`. The
chat endpoint maps assistant messages to the model's conversation role and
returns a generated answer. The interface disables sending while a request is
in progress and displays request errors.

### Structured ticket triage

Open `/triage` to submit a support ticket. The current prompt version is
`triage-v2`. Each result contains:

- **Category:** `billing`, `technical_bug`, `account`, or `feature_request`
- **Priority:** `low`, `medium`, or `high`
- **Summary:** a short description of the issue
- **Suggested action:** a recommended next step for the support team

The model is asked to return JSON. The server parses and validates that
response against a Zod schema before returning it to the page. The result view
shows the prompt version, classification, summary, and suggested action.

The result also includes model token usage when the provider supplies usage
metadata. The page displays **Input Tokens**, **Output Tokens**, and **Total
Tokens** as separate, clearly labelled values.

The triage page includes a loading state while the model is working, inline
error feedback if a request fails, and a responsive layout for smaller screens.
Provider errors, including temporary model unavailability or high demand, are
converted to a useful error message so the user can try again.

### Smoke-test runner

Open `/smoke-test` to evaluate a random ticket sample. Choose one of the
available datasets and a sample size from 1 to 100:

- **100 labelled tickets:** compares predicted categories and priorities with
  expected labels and reports accuracy and mismatch counts.
- **500 unlabelled tickets:** displays predictions without accuracy scores
  because expected labels are not available.

The results include per-ticket expected and predicted labels when available,
category and priority mismatch counts, accuracy percentages for the labelled
dataset, and total run latency. The page displays a progress state while the
model processes tickets and provides a readable error with retry guidance if
a run fails. It safely handles empty or non-JSON responses as well as JSON
error responses.

The smoke-test API validates the dataset and sample size, processes tickets
sequentially, and writes completed run summaries to
`data/smoke-test-runs.json`. A run that fails during model evaluation returns
an error rather than a successful-looking partial result.

### Smoke-test history

The `/admin` page displays saved smoke-test run summaries in reverse
chronological order, including model, dataset, sample count, accuracy,
mismatches, latency, and the cost field recorded by the runner.

## Run locally

Requires Node.js 20.9 or newer.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Gemini API key through Google AI Studio, then configure the key
   and a Gemini model name in `.env.local`. The variable names are listed in
   `.env.example`:

   ```dotenv
   LLM_API_KEY=your_gemini_api_key
   LLM_MODEL=gemini-2.5-flash
   ```

   Replace the example model with a Gemini model available to your API key.
   Keep real credentials private; do not commit `.env.local`.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the app at [http://localhost:3033](http://localhost:3033).

   - Chat: [http://localhost:3033/](http://localhost:3033/)
   - Ticket triage: [http://localhost:3033/triage](http://localhost:3033/triage)
   - Smoke test: [http://localhost:3033/smoke-test](http://localhost:3033/smoke-test)
   - Smoke-test history: [http://localhost:3033/admin](http://localhost:3033/admin)

Both `npm run dev` and `npm run start` use port `3033`.

## API reference

### `POST /api/chat`

Request:

```json
{
  "messages": [
    { "role": "user", "text": "I need help with my account." },
    { "role": "assistant", "text": "I can help with that." },
    { "role": "user", "text": "I cannot reset my password." }
  ]
}
```

Successful response:

```json
{
  "answer": "..."
}
```

Invalid JSON or a missing `messages` array returns HTTP 400 with an `error`
field. Individual message entries are not yet validated by the server.

### `POST /api/triage`

Request:

```json
{
  "ticket": "I cannot access my VPN from home. Please help urgently."
}
```

Successful response:

```json
{
  "version": "triage-v2",
  "triage": {
    "category": "technical_bug",
    "priority": "high",
    "summary": "VPN unavailable",
    "suggestedAction": "Escalate to infrastructure team"
  },
  "usage": {
    "promptTokenCount": 189,
    "candidatesTokenCount": 53,
    "totalTokenCount": 242
  }
}
```

`usage` is supplied by the model provider and is displayed by the UI when
available. Invalid JSON or a missing/blank ticket returns HTTP 400. Model or
response-processing failures return a JSON error response.

### `POST /api/smoke-test`

Request:

```json
{
  "dataset": "100",
  "sampleSize": 10
}
```

`dataset` must be `"100"` or `"500"`. `sampleSize` must be an integer from 1
through 100. Invalid JSON or invalid values return HTTP 400 with an `error`
field. A successful response includes the dataset, sample size, per-ticket
results, mismatch counts, accuracy values (or `null` for the unlabelled
dataset), and latency in milliseconds.

## Sample data and prompt experiments

The `data/` directory contains:

- [`support_tickets_500.csv`](./data/support_tickets_500.csv) and
  [`support_tickets_500.json`](./data/support_tickets_500.json): unlabelled
  tickets for development and exploratory smoke tests.
- [`support_tickets_100_labelled.csv`](./data/support_tickets_100_labelled.csv)
  and
  [`support_tickets_100_labelled.json`](./data/support_tickets_100_labelled.json):
  labelled tickets for measuring category and priority accuracy.
- `smoke-test-runs.json`: summaries written by completed smoke-test runs.

[`EXPERIMENTS.md`](./EXPERIMENTS.md) records initial manual prompt experiments,
including observations about prompt injection and verbose responses. These
observations should be retested against the current prompt before treating
them as resolved.

## Project structure

```text
app/
  api/
    chat/route.ts          Chat API
    smoke-test/route.ts    Dataset sampling, evaluation, and run logging
    triage/route.ts        Ticket validation and triage API
  admin/page.tsx           Smoke-test run history
  smoke-test/page.tsx      Smoke-test configuration and results
  triage/page.tsx          Ticket triage form and result display
  page.tsx                 Support chat
  globals.css              Shared and feature-specific styles
lib/
  llm.ts                   Google Gemini API client configuration
  prompt.ts                Triage prompt and prompt version
  schema.ts                Zod triage result schema
  triage.ts                Model invocation and response validation
data/                      Sample datasets and smoke-test history
```

## Validation

Run the TypeScript check and production build from the project directory:

```bash
npm run typecheck
npm run build
```

## Current limitations and follow-up work

- Chat request validation checks for a `messages` array but does not yet
  validate every message's role and text.
- Smoke tests call the model sequentially; larger samples can take a while and
  may stop early if a provider request fails.
- Model quality depends on the selected model and prompt. Use the labelled
  dataset and review individual mismatches when evaluating prompt changes.
- The smoke-test history records a placeholder cost value; it is not a
  measured provider cost.
- Retest the prompt against adversarial ticket content and long tickets, and
  record updated observations in `EXPERIMENTS.md`.
