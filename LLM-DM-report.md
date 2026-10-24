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

The current `data/smoke-test-runs.json` contains four labelled LLM-only runs
covering 50 sampled tickets in total. Their sample-weighted accuracy is 88%
for category and 78% for priority. The runs used independently random samples;
ticket IDs, per-ticket predictions, and prompt versions were not saved.

For historical context, three early runs were:

| Recorded run (UTC) | Model | Labelled sample | Category accuracy | Priority accuracy | Latency |
|---|---|---:|---:|---:|---:|
| 2026-10-24 16:57:46 | gemini-3.5-flash-lite | 10 | 100% (0 mismatches) | 70% (3 mismatches) | 62.885 s |
| 2026-10-24 17:00:33 | gemini-3.5-flash-lite | 15 | 86.67% (2 mismatches) | 73.33% (4 mismatches) | 33.406 s |
| 2026-10-24 17:02:38 | gemini-3.5-flash-lite | 15 | 80% (3 mismatches) | 80% (3 mismatches) | 47.064 s |

One unlabelled LLM sample of 10 tickets took 14.211 seconds. Accuracy cannot
be computed for that run because the dataset does not provide expected labels.

## DM Results

The log contains seven labelled DM runs covering 70 sampled tickets. Across
those records, the sample-weighted category accuracy is 70% and priority
accuracy is 45.71%. These runs used independent random samples, and the log
does not retain ticket IDs, per-ticket predictions, or a Decision Model rule
version.

| Strategy | Sample size | Category accuracy | Priority accuracy | Latency |
|---|---:|---:|---:|---:|
| DM (all recorded labelled runs) | 70 | 70% | 45.71% | varies by run |

The results are exploratory rather than a repeatable benchmark. Some runs
were recorded while rule development was in progress, so the aggregate may
include different rule revisions. The current results indicate that the
simple rules need evaluation and refinement, particularly for priority
classification.

## DM + LLM Results

The log contains two labelled DM + LLM runs covering 20 sampled tickets. Their
LLM-primary accuracy is 85% for category and 90% for priority. The separate
Decision Model comparison accuracy is 65% for category and 40% for priority.
These runs did execute both classifiers, but used random samples that were not
matched to the LLM-only or DM-only runs. Ticket IDs and per-ticket results
were not persisted, so this is not a controlled comparison.

## Accuracy Comparison

| Strategy | Category accuracy | Priority accuracy | Comparison status |
|---|---:|---:|---|
| LLM | 88% | 78% | 4 labelled random runs; 50 tickets total |
| DM | 70% | 45.71% | 7 labelled random runs; 70 tickets total |
| DM + LLM (LLM primary) | 85% | 90% | 2 labelled random runs; 20 tickets total |
| DM result within DM + LLM runs | 65% | 40% | Same 20 hybrid tickets; not the DM-only samples |

These summaries describe existing runs and establish that each strategy has
been exercised. They are not a fair ranking: each strategy used different
randomly selected tickets, the DM rules changed during development, and logs
do not retain prompt/rule versions or individual predictions. A valid
comparison should run identical ticket IDs through every strategy, record
versions and per-ticket results, report category and priority accuracy, and
inspect individual errors (especially high-priority or ambiguous tickets).

## Analysis

The new strategy support enables direct experimentation without changing the
triage API. DM-only runs are deterministic and avoid model latency and API
usage. Gemini can interpret context beyond the current explicit keyword rules,
but introduces variable latency and may fail temporarily. The combined mode
makes disagreements visible while preserving the LLM as the primary result.

Before selecting an operational strategy:

1. Run all three strategies on the same labelled ticket IDs.
2. Persist the ticket IDs, expected labels, and predictions, then review
   category and priority mismatches per ticket.
3. Include ambiguous, urgent, multilingual, long, and prompt-injection cases.
4. Repeat evaluation after rule or prompt changes and record the model,
   prompt/rule version, sample IDs, and date.
5. Do not interpret accuracy alone as a measure of safety or support quality;
   review high-impact errors and retain human oversight.
