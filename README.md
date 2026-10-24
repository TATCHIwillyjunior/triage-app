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

### Classification strategies

The triage page and smoke-test runner support three strategies:

- **LLM (`llm`):** uses the configured Gemini model. This is the default.
- **Decision Model (`dm`):** applies deterministic keyword rules locally and
  makes no LLM request. The rule model returns category, priority, a
  ticket-derived summary, and a category-based suggested action.
- **Decision Model + LLM (`dm-llm`):** runs both approaches. The LLM prediction
  is the primary triage result; the rule-model category and priority are
  returned separately for comparison. If the LLM request fails, the combined
  strategy reports the error rather than silently substituting the DM result.

The rule-based model is intentionally transparent and inexpensive, but its
keyword heuristics are not a substitute for a trained classifier or human
review. Its category and priority rules should be evaluated and refined using
the labelled dataset.

### Smoke-test runner

Open `/smoke-test` to evaluate a random ticket sample. Choose one of the
available datasets, classification strategy, and a sample size from 1 to 100:

- **100 labelled tickets:** compares predicted categories and priorities with
  expected labels and reports accuracy and mismatch counts.
- **500 unlabelled tickets:** displays predictions without accuracy scores
  because expected labels are not available.

The results include per-ticket expected and predicted labels when available,
category and priority mismatch counts, accuracy percentages for the labelled
dataset, and total run latency. The page displays a progress state while the
model processes tickets and provides a readable error with retry guidance if
a run fails. It safely handles empty or non-JSON responses as well as JSON
error responses. For `dm-llm`, it reports the LLM prediction as the primary
accuracy result and separately shows Decision Model accuracy and per-ticket
predictions.

The smoke-test API validates the dataset and sample size, processes tickets
sequentially, and writes completed run summaries to
`data/smoke-test-runs.json`. A run that fails during model evaluation returns
an error rather than a successful-looking partial result.

### Smoke-test history

The `/admin` route is an evaluation dashboard for reviewing the smoke-test
history saved in `data/smoke-test-runs.json`. It reads and validates the
history on the server, then renders a responsive dashboard with the following
sections:

- **Overview metrics:** total recorded runs, total labelled ticket
  evaluations, average latency across all runs, and summed logged cost.
- **Strategy performance:** one row each for LLM, Decision Model, and DM +
  LLM. It summarizes category and priority accuracy from labelled-dataset
  runs, the number of labelled samples, and average run latency by strategy.
- **Hybrid Decision Model comparison:** separately summarizes the DM
  category and priority accuracy from DM + LLM runs.
- **Run history:** a detailed table of the available recorded fields:
  timestamp, strategy, model, dataset, sample size, primary category accuracy
  and mismatch count, primary priority accuracy and mismatch count, hybrid DM
  category and priority accuracy and mismatch counts, latency, and logged
  cost.
- **History controls:** text search across model, strategy, dataset, and
  timestamp, plus filters for strategy and dataset. The table is horizontally
  scrollable on smaller screens.

Accuracy summaries are calculated from aggregate sample and mismatch counts
for labelled runs; the log does not retain ticket IDs or individual
predictions. Unlabelled runs are excluded from accuracy summaries. Legacy
records without a strategy are treated as LLM runs. The current smoke-test
logger stores `cost: 0` as a placeholder, so the cost cards and columns show
recorded values, not measured Gemini charges.

If no history file exists, the dashboard shows an empty state with a link to
start a smoke test. Invalid JSON, malformed records, or file read failures
produce an explicit load-error state rather than silently showing empty
history.

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
   - Admin dashboard and smoke-test history:
     [http://localhost:3033/admin](http://localhost:3033/admin)

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
response-processing failures return a JSON error response. The optional
`strategy` field accepts `"llm"`, `"dm"`, or `"dm-llm"`; omitted strategy
defaults to `"llm"`. The response includes a `decisionModel` field for the
combined strategy, containing the rule-based category, priority, summary, and
suggested action.

### `POST /api/smoke-test`

Request:

```json
{
  "dataset": "100",
  "sampleSize": 10,
  "strategy": "dm-llm"
}
```

`dataset` must be `"100"` or `"500"`. `sampleSize` must be an integer from 1
through 100. `strategy` must be `"llm"`, `"dm"`, or `"dm-llm"`. Invalid JSON
or invalid values return HTTP 400 with an `error` field. A successful response
includes the selected strategy, per-ticket predictions, mismatch counts,
accuracy values (or `null` for the unlabelled dataset), and latency in
milliseconds. For hybrid runs, separate Decision Model accuracy and mismatch
values are included alongside the primary LLM metrics.

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
  admin/page.tsx           Load and validate smoke-test history
  admin/dashboard.tsx      Admin dashboard, filters, summaries, and tables
  smoke-test/page.tsx      Smoke-test configuration and results
  triage/page.tsx          Ticket triage form and result display
  page.tsx                 Support chat
  globals.css              Shared and feature-specific styles
lib/
  llm.ts                   Google Gemini API client configuration
  decision-model.ts        Local deterministic category/priority rules
  classifier.ts            LLM, DM, and hybrid strategy dispatcher
  prompt.ts                Triage prompt and prompt version
  schema.ts                Zod triage result schema
  triage.ts                Model invocation and response validation
data/                      Sample datasets and smoke-test history
LLM-DM-report.md           Decision Model research and comparison report
```

## Validation

Run the TypeScript check and production build from the project directory:

```bash
npm run typecheck
npm run build
```

## Project checklist

Checked items are implemented in the current codebase. They do not necessarily
mean that model quality has been independently verified against every
possible ticket or provider condition.

### Completed

- [x] Connect the chat and ticket-triage server routes to the Google Gemini
  API through the shared `@google/genai` client.
- [x] Add a support chat page that retains the current conversation and shows
  request progress and errors.
- [x] Add the `/triage` page and `/api/triage` endpoint for submitting a
  support ticket.
- [x] Introduce the versioned `triage-v2` prompt and define the supported
  category and priority values.
- [x] Request structured JSON triage output and validate it with the Zod
  schema before returning it to the client.
- [x] Display the triage category, priority, summary, suggested action, and
  prompt version.
- [x] Display model usage as separate **Input Tokens**, **Output Tokens**, and
  **Total Tokens** values when Gemini returns usage metadata.
- [x] Add triage loading feedback and readable errors, including a message for
  temporary Gemini rate-limit or availability failures.
- [x] Add the deterministic, rule-based Decision Model with category,
  priority, summary, and suggested action output.
- [x] Add a classifier dispatcher for LLM, Decision Model, and combined
  Decision Model + LLM strategies.
- [x] Add strategy selection to the triage and smoke-test pages and validate
  strategy values in both API routes.
- [x] Run both models for the combined strategy, display the LLM result as
  primary, and expose Decision Model predictions for comparison.
- [x] Add labelled and unlabelled sample ticket datasets.
- [x] Add a smoke-test page to sample tickets, show predictions, and compare
  classifications against labelled expected values.
- [x] Validate smoke-test dataset and sample-size inputs on the server.
- [x] Return readable smoke-test API errors and handle empty or malformed
  client responses without an unhandled JSON parsing rejection.
- [x] Record completed smoke-test summaries, including the selected strategy,
  and provide an admin dashboard that shows strategy and all recorded
  evaluation fields.
- [x] Add dashboard overview metrics and labelled-data weighted performance
  comparisons for each strategy, including hybrid Decision Model results.
- [x] Add searchable and filterable run-history tables with legacy-log
  handling, responsive overflow, empty states, and explicit data-load errors.
- [x] Backfill the known strategy (`llm`) for existing LLM-only smoke-test
  history entries.
- [x] Create `LLM-DM-report.md` to document the model choice, methodology,
  logged LLM results, and remaining evaluation work.
- [x] Document local setup, Gemini configuration, application routes, API
  payloads, sample data, and validation commands in this README.
- [x] Pass the project TypeScript check and production build during
  implementation.

### Remaining

- [ ] Validate every chat message on the server, including its role and text,
  before sending conversation history to Gemini.
- [ ] Add explicit Gemini provider-failure handling to `/api/chat`, matching
  the clear JSON errors returned by the triage endpoints.
- [ ] Run and record end-to-end smoke tests against the labelled dataset;
  inspect individual category and priority mismatches for all three
  strategies.
- [ ] Retest prompt-injection and long-ticket cases against the current
  `triage-v2` prompt and record the actual outcomes in `EXPERIMENTS.md`.
- [ ] Increment `PROMPT_VERSION` and update experiment records whenever prompt
  behavior changes.
- [ ] Consider progress reporting for each ticket in larger smoke-test runs;
  processing is currently sequential and a run may take a while.
- [ ] Replace the smoke-test history's placeholder cost value with measured
  Gemini usage/cost data, if reliable pricing information is available.
- [ ] Review and evaluate model output with a human; the labelled dataset and
  prompt do not guarantee correct decisions for every support request.
