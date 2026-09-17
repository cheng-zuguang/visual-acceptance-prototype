import assert from "node:assert/strict";
import test from "node:test";
import { parseAcceptanceYaml } from "./default-rules";

test("parses configurable page-alignment confidence weights and level thresholds", () => {
  const config = parseAcceptanceYaml(`
page_alignment:
  confidence:
    weights:
      stability_coverage: 2
      anchor_sufficiency: 1
      inlier_ratio: 3
      residual_quality: 2
      dynamic_cleanliness: 1
      structural_support: 1
    levels:
      high_min: 0.9
      medium_min: 0.7
      low_min: 0.2
`);

  assert.deepEqual(config.pageAlignment.confidence.weights, {
    stabilityCoverage: 0.2,
    anchorSufficiency: 0.1,
    inlierRatio: 0.3,
    residualQuality: 0.2,
    dynamicCleanliness: 0.1,
    structuralSupport: 0.1
  });
  assert.deepEqual(config.pageAlignment.confidence.levels, {
    highMin: 0.9,
    mediumMin: 0.7,
    lowMin: 0.2
  });
});

test("parses configurable missing-module geometry thresholds", () => {
  const config = parseAcceptanceYaml(`
page_alignment:
  missing_module:
    minimum_horizontal_overlap_ratio: 0.65
    maximum_residual_ratio: 0.08
`);

  assert.deepEqual(config.pageAlignment.missingModule, {
    minimumHorizontalOverlapRatio: 0.65,
    maximumResidualRatio: 0.08
  });
});
