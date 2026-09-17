import type {
  AcceptanceConfig,
  EvidenceConfidence,
  PageAlignmentAnchorStats,
  PageAlignmentConfidenceLevels,
  PageAlignmentScoreBreakdown
} from "../src/types";

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function pageAlignmentConfidenceLevel(
  score: number,
  levels: PageAlignmentConfidenceLevels
): EvidenceConfidence["level"] {
  return ([
    { level: "high" as const, min: levels.highMin },
    { level: "medium" as const, min: levels.mediumMin },
    { level: "low" as const, min: levels.lowMin }
  ].find((candidate) => score >= candidate.min)?.level ?? "low");
}

export function scorePageAlignmentConfidence(input: {
  baseScore: number;
  anchorStats: PageAlignmentAnchorStats;
  eligibleAnchorCount: number;
  positionTolerancePx: number;
  config: AcceptanceConfig["pageAlignment"]["confidence"];
}): PageAlignmentScoreBreakdown {
  const { weights, levels } = input.config;
  const component = (value: number, weight: number) => ({
    value: round(value, 4),
    weight: round(weight, 4),
    contribution: round(value * weight, 4)
  });
  if (input.anchorStats.candidateCount === 0) {
    return {
      anchorEvidenceApplied: false,
      baseScoreCap: round(input.baseScore, 4),
      weightedScore: 0,
      finalScore: round(input.baseScore, 2),
      components: {
        stabilityCoverage: component(0, weights.stabilityCoverage),
        anchorSufficiency: component(0, weights.anchorSufficiency),
        inlierRatio: component(0, weights.inlierRatio),
        residualQuality: component(0, weights.residualQuality),
        dynamicCleanliness: component(0, weights.dynamicCleanliness),
        structuralSupport: component(0, weights.structuralSupport)
      },
      levelThresholds: { ...levels }
    };
  }

  const nonDynamicCandidateCount = Math.max(
    1,
    input.anchorStats.candidateCount - input.anchorStats.dynamicExcludedCount
  );
  const stabilityCoverage = Math.min(
    1,
    input.anchorStats.stableCount / nonDynamicCandidateCount
  );
  const anchorSufficiency = Math.min(1, input.eligibleAnchorCount / 3);
  const inlierRatio = input.eligibleAnchorCount > 0
    ? Math.min(1, input.anchorStats.inlierCount / input.eligibleAnchorCount)
    : 0;
  const hasMajorityConsensus = input.eligibleAnchorCount > 0 &&
    input.anchorStats.inlierCount > input.eligibleAnchorCount / 2;
  const residualQuality = input.anchorStats.residualPx === null || !hasMajorityConsensus
    ? 0
    : 1 - Math.min(
        1,
        input.anchorStats.residualPx / Math.max(1, input.positionTolerancePx)
      );
  const dynamicCleanliness = 1 - Math.min(
    1,
    input.anchorStats.dynamicExcludedCount / input.anchorStats.candidateCount
  );
  const structuralSupport = Math.min(1, input.anchorStats.structuralAnchorCount / 2);
  const components = {
    stabilityCoverage: component(stabilityCoverage, weights.stabilityCoverage),
    anchorSufficiency: component(anchorSufficiency, weights.anchorSufficiency),
    inlierRatio: component(inlierRatio, weights.inlierRatio),
    residualQuality: component(residualQuality, weights.residualQuality),
    dynamicCleanliness: component(dynamicCleanliness, weights.dynamicCleanliness),
    structuralSupport: component(structuralSupport, weights.structuralSupport)
  };
  const weightedScore = Object.values(components).reduce(
    (sum, item) => sum + item.contribution,
    0
  );
  return {
    anchorEvidenceApplied: true,
    baseScoreCap: round(input.baseScore, 4),
    weightedScore: round(weightedScore, 4),
    finalScore: round(Math.min(input.baseScore, weightedScore), 2),
    components,
    levelThresholds: { ...levels }
  };
}
