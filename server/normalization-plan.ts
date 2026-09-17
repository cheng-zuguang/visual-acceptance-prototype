import type {
  Box,
  DynamicNormalizationSummary,
  NormalizationStrategy
} from "../src/types";

export interface NormalizationDecision {
  textComparable: boolean;
  strategy?: NormalizationStrategy;
}

export interface NormalizationPlan {
  pixelExclusions: Array<{ designBox: Box; actualBox: Box }>;
  decisionFor(figmaNodeId: string, fingerprintKey: string): NormalizationDecision;
}

function bindingKey(figmaNodeId: string, fingerprintKey: string): string {
  return `${figmaNodeId}\u0000${fingerprintKey}`;
}

export function buildNormalizationPlan(
  summary: Pick<DynamicNormalizationSummary, "regions">
): NormalizationPlan {
  const byBinding = new Map(summary.regions.map((region) => [
    bindingKey(region.figmaNodeId, region.fingerprintKey),
    region
  ]));
  return {
    pixelExclusions: summary.regions.map(({ designBox, actualBox }) => ({ designBox, actualBox })),
    decisionFor(figmaNodeId, fingerprintKey) {
      const region = byBinding.get(bindingKey(figmaNodeId, fingerprintKey));
      return region
        ? { textComparable: false, strategy: region.strategy }
        : { textComparable: true };
    }
  };
}
