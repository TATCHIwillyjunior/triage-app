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

The chat client sends messages to `/api/chat`. The server validates the
request, sends the message to Google GenAI, and returns the generated response.
Configure `LLM_API_KEY` and `LLM_MODEL` in your local environment before using
the chat. The example variable names are listed in `.env.example`.

The chat integration is an intermediate step toward the complete support
ticket triage feature. The triage route is still a placeholder.

## Project checklist

### Completed

- [x] Created the chat interface and connected it to the `/api/chat` endpoint.
- [x] Added request validation for malformed JSON and empty or non-string
  messages.
- [x] Added a Google GenAI client configured with `LLM_API_KEY`.
- [x] Updated the chat endpoint to generate a response using `LLM_MODEL`
  instead of echoing the submitted message.
- [x] Added labelled and unlabelled sample ticket datasets for development
  and evaluation.

### To do

- [ ] Implement the support-ticket triage workflow in the triage route.
- [ ] Use the ticket datasets to test and evaluate triage results.
- [ ] Decide how to handle and present LLM provider errors in the chat UI.

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

The Send button is disabled when the message is empty or contains only spaces,
and while a request is in progress.

The client posts `{ "message": "your text" }` to `/api/chat`. The App Router
handler in `app/api/chat/route.ts` returns `{ "answer": "..." }` with the
generated response. Invalid JSON or an empty/non-string message returns HTTP
400 with an `error`.

## Checks

```sh
npm run typecheck
npm run build
```
