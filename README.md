# Support ticket triage app

This project is a Next.js prototype for triaging support tickets with a large
language model (LLM). The app combines a basic chat demo with a ticket
classification workflow that assigns a category, priority, summary, and
suggested action to a free-text support request.

The main goal is to test how a model can turn noisy support tickets into a
structured triage result that an internal support team can act on.

## Current capabilities

- Chat page at `/` for a simple conversational demo.
- Triage page at `/triage` for submitting a single support ticket.
- `/api/triage` endpoint that validates the request and invokes the LLM.
- Versioned prompt handling for reproducible prompt testing.
- Structured JSON output validation with Zod before returning results.
- Display of token usage metadata returned by the model.
- Error handling for invalid payloads and failed model responses.

## Triage V2

The current triage implementation uses `triage-v2` and expects the model to
return JSON matching this schema:

```json
{
  "category": "technical_bug",
  "priority": "high",
  "summary": "VPN unavailable for remote employees",
  "suggestedAction": "Escalate to infrastructure team"
}
```

Allowed categories:

- `billing`
- `technical_bug`
- `account`
- `feature_request`

Allowed priorities:

- `low`
- `medium`
- `high`

The server validates the returned object with a Zod schema before sending it
back to the client. The API response includes:

```json
{
  "version": "triage-v2",
  "triage": {
    "category": "technical_bug",
    "priority": "high",
    "summary": "VPN unavailable for remote employees",
    "suggestedAction": "Escalate to infrastructure team"
  },
  "usage": {
    "promptTokenCount": 123,
    "candidatesTokenCount": 45,
    "totalTokenCount": 168
  }
}
```

## Project structure

- `app/page.tsx` — simple support chat interface
- `app/triage/page.tsx` — ticket triage UI
- `app/api/chat/route.ts` — chat endpoint
- `app/api/triage/route.ts` — triage endpoint
- `lib/triage.ts` — model call and schema validation
- `lib/prompt.ts` — prompt version and prompt text
- `lib/schema.ts` — Zod schema for triage output
- `data/` — labelled and unlabelled sample ticket datasets
- `EXPERIMENTS.md` — manual prompt experiments and observations

## Sample data

The `data/` folder contains both development and evaluation datasets:

- 500 unlabelled tickets for exploring prompt ideas and iterating on the
  classification workflow
- 100 labelled tickets with expected category/priority labels for evaluating
  output quality

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Then open:

- http://localhost:3033/ for the chat demo
- http://localhost:3033/triage for the triage workflow

Set the required environment variables before running the app. An example is
provided in `.env.example`:

```bash
LLM_API_KEY=your_key_here
LLM_MODEL=gemini-2.5-flash
```

## API usage

### Chat request

The chat page posts a conversation payload shaped like this:

```json
{
  "messages": [
    { "role": "user", "text": "I need help with my account." },
    { "role": "assistant", "text": "I can help with that." },
    { "role": "user", "text": "I cannot reset my password." }
  ]
}
```

The endpoint returns:

```json
{
  "answer": "..."
}
```

### Triage request

The triage page posts:

```json
{
  "ticket": "I cannot access my VPN from home. Please help urgently."
}
```

The endpoint validates the request, calls the LLM, validates the JSON schema,
and returns structured triage output with usage metadata.

## Validation checks

```bash
npm run typecheck
npm run build
```

## Notes

This project is designed as a teaching and experimentation project. The triage
prompt and evaluation set remain important areas for iterative improvements,
particularly around edge cases, prompt injection attempts, and response
consistency on long tickets.
