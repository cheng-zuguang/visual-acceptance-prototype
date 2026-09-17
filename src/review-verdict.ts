import type { ElementMatchingEvidence, ReviewVerdict } from "./types";

/** Shared by single-page reports, batch execution and artifact adapters. */
export function reviewVerdict(input: {
  summary: { errors: number; pending: number };
  matching: ElementMatchingEvidence;
}): ReviewVerdict {
  if (input.summary.errors > 0) return "failed";
  if (input.summary.pending > 0 || input.matching.designCoverage?.actualItems?.length ||
    input.matching.designCoverage?.items.length === 0 ||
    input.matching.designCoverage?.items.some(item => item.status === "unverified" || item.reviewStatus === "pending")) return "needs_review";
  return "passed";
}
