# Decision Model Research

## Purpose

This project compares three ways to classify a support ticket:

- LLM-only, using the configured Google Gemini model.
- Decision Model (DM)-only, using deterministic local keyword rules.
- DM + LLM, running both and retaining both predictions for comparison.

The current Decision Model is a transparent baseline rather than a learned
model. It assigns category and priority from matching ticket terms, derives a
short summary from the ticket text, and selects a suggested action from the
resulting category and priority. It makes no network or LLM call.

The current rules support `billing`, `account`, `feature_request`, and
`technical_bug`, and priorities `low`, `medium`, and `high`. The rules are
intended to provide a reproducible baseline; keyword matches can miss context,
negation, ambiguous wording, multilingual tickets, and issues expressed using
unanticipated vocabulary.

## Chosen Decision Model

The implementation is in `lib/decision-model.ts`. It scores category keyword
matches and chooses the highest-scoring category. If no category keywords
match, it uses `technical_bug` as a conservative review-oriented fallback.
Priority is assigned by matching urgency and impact terms:

- A high-priority term (for example, outage, critical, or security breach)
  produces `high`.
- Otherwise, a medium-impact term (for example, blocked, error, or crash)
  produces `medium`.
- Tickets without a matching urgency or impact term receive `low`.

The rule model also returns a short ticket-derived summary and a suggested
action. The rules are deliberately easy to inspect and change. They should be
evaluated against the labelled dataset before being treated as suitable for
operational support use.

## Integration Strategy

`lib/classifier.ts` dispatches using one of three strategy values:

| Strategy | Behavior | Primary result |
|---|---|---|
| `llm` | Calls the existing Gemini triage implementation. | LLM |
| `dm` | Runs local rules only; makes no Gemini request. | Decision Model |
| `dm-llm` | Runs the Decision Model and Gemini. | LLM, with DM result returned separately |

The combined strategy does not silently fall back when Gemini fails. Returning
an error in that case makes the failure explicit and avoids presenting a
partial combined run as a complete result.

The triage page exposes the strategy selector and shows the Decision Model's
category and priority beside the primary LLM result for combined runs. The
smoke-test page applies the chosen strategy to each sampled ticket. Combined
smoke tests report accuracy separately for the LLM and the Decision Model.
Smoke-test history records the selected strategy.

## LLM Results

The following are existing LLM-only smoke-test records from
`data/smoke-test-runs.json`. The first three labelled samples were random
samples from the 100-ticket dataset; sample membership was not persisted, so
these runs cannot be treated as a fixed, repeatable benchmark.

| Recorded run (UTC) | Model | Labelled sample | Category accuracy | Priority accuracy | Latency |
|---|---|---:|---:|---:|---:|
| 2026-10-24 16:57:46 | gemini-3.5-flash-lite | 10 | 100% (0 mismatches) | 70% (3 mismatches) | 62.885 s |
| 2026-10-24 17:00:33 | gemini-3.5-flash-lite | 15 | 86.67% (2 mismatches) | 73.33% (4 mismatches) | 33.406 s |
| 2026-10-24 17:02:38 | gemini-3.5-flash-lite | 15 | 80% (3 mismatches) | 80% (3 mismatches) | 47.064 s |

One additional unlabelled sample of 10 tickets took 14.211 seconds. Accuracy
cannot be computed for that run because the dataset does not provide expected
labels.

These are historical samples from the local smoke-test log, not a controlled
comparison of all strategies. The run records do not include a prompt version
or per-ticket predictions, and should be re-run using the current workflow
before drawing conclusions about the current prompt.

## DM Results

The latest labelled DM smoke test used a random sample of 10 tickets:

| Strategy | Sample size | Category accuracy | Priority accuracy | Latency |
|---|---:|---:|---:|---:|
| DM | 10 | 50% (5 mismatches) | 40% (6 mismatches) | 2 ms |

The run is recorded in `data/smoke-test-runs.json`. An earlier exploratory
sample of 10 tickets scored 70% category and 50% priority accuracy, but used a
different random sample and preceded a small rule adjustment. These results
are not directly comparable. Sampled ticket IDs are not persisted, so these
are initial observations rather than a repeatable benchmark. The current
results indicate that the simple rules need evaluation and refinement,
particularly for priority classification.

## DM + LLM Results

No new controlled hybrid evaluation has been recorded yet. The `dm-llm`
strategy runs both classifiers and returns the LLM prediction as primary,
with the DM prediction separately available. Run this strategy on the same
labelled ticket set used for the DM-only and LLM-only runs, then record the
two sets of per-ticket predictions and metrics here.

## Accuracy Comparison

| Strategy | Category accuracy | Priority accuracy | Comparison status |
|---|---:|---:|---|
| LLM | Historical sample values: 80%–100% | Historical sample values: 70%–80% | Existing random samples; not controlled |
| DM | 50% | 40% | Latest random sample of 10; ticket IDs not persisted |
| DM + LLM (LLM primary) | Not measured | Not measured | Run both models on the same tickets |

The current data is insufficient for a fair ranking: the recorded LLM samples
are small and random, and the DM sample used different randomly selected
tickets. No hybrid run has yet been measured. A valid comparison should use
identical ticket IDs for all strategies, report both category and priority
accuracy, and inspect individual errors (especially high-priority or ambiguous
tickets).

## Analysis

The new strategy support enables direct experimentation without changing the
triage API. DM-only runs are deterministic and avoid model latency and API
usage. Gemini can interpret context beyond the current explicit keyword rules,
but introduces variable latency and may fail temporarily. The combined mode
makes disagreements visible while preserving the LLM as the primary result.

Before selecting an operational strategy:

1. Run all three strategies on the same labelled ticket IDs.
2. Record category and priority results and review mismatches per ticket.
3. Include ambiguous, urgent, multilingual, long, and prompt-injection cases.
4. Repeat evaluation after rule or prompt changes and record the model,
   prompt/rule version, sample IDs, and date.
5. Do not interpret accuracy alone as a measure of safety or support quality;
   review high-impact errors and retain human oversight.
