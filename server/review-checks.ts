import type { AcceptanceConfig, ActualEvidenceElement, PropertyReviewCheck } from "../src/types";

/** Records actual predicate evaluations, including success and unavailable evidence. */
export function reviewCheckRecorder(config: AcceptanceConfig) {
  const byDesign = new Map<string, PropertyReviewCheck[]>();
  return {
    byDesign,
    record(input: {
      figmaNodeId: string; actualElement: ActualEvidenceElement; confidence: number;
      property: string; rule: keyof AcceptanceConfig["rules"];
      expected?: string | number; actual?: string | number; tolerance?: number;
      differs: boolean; exemption?: string; pendingReason?: string;
    }) {
      const { property, rule, expected, actual, tolerance } = input;
      const status: PropertyReviewCheck["status"] = expected === undefined ? "not-applicable"
        : config.rules[rule] === "ignore" ? "not-run"
        : input.actualElement.visuallyObscured ? "pending"
        : input.exemption ? "exempt"
        : input.pendingReason || actual === undefined || input.confidence < config.thresholds.highConfidenceMin ? "pending"
        : input.differs ? "difference" : "passed";
      const check: PropertyReviewCheck = { property, rule, expected, actual, tolerance, status,
        selector: input.actualElement.selector, actualBox: { ...input.actualElement.box },
        reason: status === "exempt" ? input.exemption! : status === "pending" ? input.actualElement.visuallyObscured ? "state-obscured: text is blurred in the captured visual state" : input.pendingReason ?? "evidence-insufficient"
          : status === "not-applicable" ? "no-design-constraint" : status === "not-run" ? "rule-disabled" : "measured" };
      byDesign.set(input.figmaNodeId, [...(byDesign.get(input.figmaNodeId) ?? []), check]);
    }
  };
}
