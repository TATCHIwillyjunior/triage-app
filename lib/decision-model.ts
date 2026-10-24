import type { TriageResult } from "./schema";

type Rule = {
  category: TriageResult["category"];
  keywords: string[];
};

const categoryRules: Rule[] = [
  {
    category: "billing",
    keywords: [
      "bill",
      "billing",
      "charge",
      "charged",
      "invoice",
      "payment",
      "refund",
      "subscription",
      "renewal",
      "price",
      "pricing",
      "tax",
    ],
  },
  {
    category: "account",
    keywords: [
      "account",
      "login",
      "log in",
      "sign in",
      "password",
      "credential",
      "locked out",
      "two-factor",
      "2fa",
      "verification code",
      "user access",
      "permission",
    ],
  },
  {
    category: "feature_request",
    keywords: [
      "feature",
      "enhancement",
      "would like",
      "could you add",
      "please add",
      "integration",
      "it would be useful",
      "it would be great",
      "is it possible",
      "would it be possible",
      "do you plan",
    ],
  },
  {
    category: "technical_bug",
    keywords: [
      "bug",
      "error",
      "crash",
      "broken",
      "not working",
      "doesn't work",
      "does not work",
      "unable to",
      "can't",
      "cannot",
      "failed",
      "failure",
      "issue",
      "incorrect",
      "slow",
      "missing",
      "unavailable",
      "unexpected",
    ],
  },
];

const highPriorityTerms = [
  "urgent",
  "urgently",
  "critical",
  "emergency",
  "outage",
  "down",
  "security breach",
  "data breach",
  "compromised",
  "all users",
  "business stopped",
  "production down",
  "cannot access",
  "unable to access",
  "locked out",
];

const mediumPriorityTerms = [
  "as soon as possible",
  "blocking",
  "blocked",
  "workaround",
  "multiple users",
  "several users",
  "not working",
  "doesn't work",
  "does not work",
  "error",
  "crash",
  "failed",
  "failure",
  "slow",
  "incorrect",
];

function countMatches(text: string, keywords: string[]): number {
  return keywords.reduce(
    (total, keyword) =>
      total + (text.includes(keyword) ? 1 : 0),
    0
  );
}

function summarizeTicket(ticket: string): string {
  const normalized = ticket.replace(/\s+/g, " ").trim();
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] ?? normalized;
  const shortened =
    firstSentence.length > 180
      ? `${firstSentence.slice(0, 177).trimEnd()}...`
      : firstSentence;

  return shortened || "Support ticket submitted for review.";
}

function suggestAction(
  category: TriageResult["category"],
  priority: TriageResult["priority"]
): string {
  if (priority === "high") {
    return "Escalate promptly to the support team for immediate review.";
  }

  switch (category) {
    case "billing":
      return "Review the account and billing history, then follow up with the customer.";
    case "account":
      return "Verify the customer's identity and review account access or sign-in settings.";
    case "feature_request":
      return "Record the request and share it with the product team for consideration.";
    case "technical_bug":
      return "Gather reproduction details and route the issue to technical support.";
  }
}

export function runDecisionModel(ticket: string): TriageResult {
  const content = ticket.toLocaleLowerCase();
  const scores = categoryRules.map(({ category, keywords }) => ({
    category,
    score: countMatches(content, keywords),
  }));

  const highestScore = Math.max(...scores.map(({ score }) => score));
  const category =
    highestScore === 0
      ? "technical_bug"
      : scores.find(({ score }) => score === highestScore)!.category;

  const priority = countMatches(content, highPriorityTerms) > 0
    ? "high"
    : countMatches(content, mediumPriorityTerms) > 0
      ? "medium"
      : "low";

  return {
    category,
    priority,
    summary: summarizeTicket(ticket),
    suggestedAction: suggestAction(category, priority),
  };
}
