# Support ticket triage app

This repository is the starting point for an educational project in which
computer science students will build a support ticket triage application. The
planned application will use a large language model (LLM) from the backend to
help analyze incoming support requests and support the triage process.

The codebase is intentionally a basic skeleton. It provides a small chat
interface and server endpoint as a first step: students can validate the
connection between the application and an LLM provider before building the
full triage workflow.

## Current status

The chat client keeps the current conversation in the page and sends its
message history to `/api/chat`. The server maps assistant messages to the
Google GenAI `model` role, sends the conversation to Google GenAI, and returns
the generated response. Configure `LLM_API_KEY` and `LLM_MODEL` in your local
environment before using the chat. The example variable names are listed in
`.env.example`.

The chat integration is an intermediate step toward the complete support
ticket triage feature. Triage V1 is available at `/triage` and
`/api/triage`. It classifies one ticket into a category and priority, with a
short summary and suggested action. The versioned prompt returns plain text;
structured JSON output and schema validation are not part of this version.
The triage page shows loading and request-error states, and displays the
prompt version returned by the API.

### Triage experiments

Initial manual experiments using Gemini 2.5 Flash are recorded in
[`EXPERIMENTS.md`](./EXPERIMENTS.md). The log includes three sample tickets
with expected category and priority outputs, plus two issues found during
testing: a prompt-injection case and an overly verbose response for a long
ticket. The prompt was strengthened to treat ticket content as data and
shortened to request concise output. The revised prompt should be retested
against both cases before considering them resolved.

## Project checklist

### Completed

- [x] Created the chat interface and connected it to the `/api/chat` endpoint.
- [x] Added JSON parsing error handling and validation that chat requests
  contain a `messages` array.
- [x] Added a Google GenAI client configured with `LLM_API_KEY`.
- [x] Updated the chat endpoint to send conversation history to Google GenAI
  using `LLM_MODEL` and return the generated response.
- [x] Updated the chat interface to retain user/assistant messages across
  turns and show request errors.
- [x] Added Triage V1 with a versioned prompt, a ticket classification API,
  and a page for submitting and viewing plain-text results.
- [x] Logged initial manual triage experiments and recorded prompt-injection
  and response-length issues in `EXPERIMENTS.md`.
- [x] Upgraded Next.js to the patched 16.4.3 release.
- [x] Added labelled and unlabelled sample ticket datasets for development
  and evaluation.

### To do

- [ ] Validate each conversation entry on the server, including its role and
  text, before sending it to the LLM.
- [ ] Handle LLM provider failures in the chat and triage APIs with clear
  error responses.
- [ ] Test triage end to end with sample tickets and evaluate results against
  the labelled dataset.
- [ ] Retest the prompt-injection and long-ticket cases after prompt changes,
  and record the results.
- [ ] Increment the prompt version when prompt behavior changes so experiment
  results can be tied to the exact prompt used.
- [ ] Add structured JSON output and schema validation in the next version.

## Sample data

The `data/` folder contains two support-ticket datasets:

- **500 unlabelled tickets** in
  [`support_tickets_500.csv`](./data/support_tickets_500.csv) and
  [`support_tickets_500.json`](./data/support_tickets_500.json), for exploring
  and developing the triage workflow.
- **100 labelled tickets** in
  [`support_tickets_100_labelled.csv`](./data/support_tickets_100_labelled.csv)
  and
  [`support_tickets_100_labelled.json`](./data/support_tickets_100_labelled.json).
  These include triage annotations such as category, priority, and whether a
  ticket needs human review, making them useful for testing and evaluating
  triage approaches.

## Run locally

Requires Node.js 20.9 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3033 and send a message. Both `npm run dev` and
`npm run start` use port 3033.

Open http://localhost:3033/triage to submit a ticket for classification.

The Send button is disabled when the message is empty or contains only spaces,
and while a request is in progress.

The client posts the conversation as an array of objects with a `role` (`user`
or `assistant`) and `text` field:

```json
{
  "messages": [
    { "role": "user", "text": "I need help with my account." },
    { "role": "assistant", "text": "I can help with that." },
    { "role": "user", "text": "I cannot reset my password." }
  ]
}
```

The App Router handler in `app/api/chat/route.ts` returns
`{ "answer": "..." }` with the generated response. Invalid JSON and requests
without a `messages` array return HTTP 400 with an `error`. Individual message
entries are not yet validated by the server.

The triage page posts `{ "ticket": "..." }` to `/api/triage`. The endpoint
returns `{ "version": "triage-v1", "result": "..." }`; `result` is plain-text
classification output. Invalid JSON and missing or blank tickets return HTTP
400 with an `error`.

## Checks

```sh
npm run typecheck
npm run build
```
