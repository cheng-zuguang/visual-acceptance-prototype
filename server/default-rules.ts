import * as yaml from "js-yaml";
import type { Locale } from "../src/locale";
import type { AcceptanceConfig, Severity } from "../src/types";

export const DEFAULT_RULES_YAML = `# PROTOTYPE — 视觉验收规则，可根据误报与漏报持续调整
viewport: auto

thresholds:
  visual_similarity_min: 0.95
  pixel_threshold: 0.10
  position_tolerance_px: 4
  size_tolerance_px: 4
  font_size_tolerance_px: 1
  color_delta_e: 3
  match_confidence_min: 0.72
  high_confidence_min: 0.86

page_alignment:
  missing_module:
    minimum_horizontal_overlap_ratio: 0.50
    maximum_residual_ratio: 0.15
  confidence:
    weights:
      stability_coverage: 0.25
      anchor_sufficiency: 0.20
      inlier_ratio: 0.30
      residual_quality: 0.15
      dynamic_cleanliness: 0.05
      structural_support: 0.05
    levels:
      high_min: 0.86
      medium_min: 0.72
      low_min: 0

rules:
  visual_similarity: error
  position: error
  size: error
  content: error
  typography: error
  alignment: error
  color: warning
  decoration: warning
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning

# CSS 选择器：截图和 DOM 分析时同时忽略
ignore: []

capture:
  timeout_ms: 30000
  settle_ms: 500
  samples: 3
  sample_interval_ms: 750
  # wait_for_selector: "[data-page-ready]"
`;

export const DEFAULT_RULES_YAML_EN = `# PROTOTYPE — visual acceptance rules; tune as false positives and false negatives are discovered
viewport: auto

thresholds:
  visual_similarity_min: 0.95
  pixel_threshold: 0.10
  position_tolerance_px: 4
  size_tolerance_px: 4
  font_size_tolerance_px: 1
  color_delta_e: 3
  match_confidence_min: 0.72
  high_confidence_min: 0.86

page_alignment:
  missing_module:
    minimum_horizontal_overlap_ratio: 0.50
    maximum_residual_ratio: 0.15
  confidence:
    weights:
      stability_coverage: 0.25
      anchor_sufficiency: 0.20
      inlier_ratio: 0.30
      residual_quality: 0.15
      dynamic_cleanliness: 0.05
      structural_support: 0.05
    levels:
      high_min: 0.86
      medium_min: 0.72
      low_min: 0

rules:
  visual_similarity: error
  position: error
  size: error
  content: error
  typography: error
  alignment: error
  color: warning
  decoration: warning
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning

# CSS selectors ignored by both screenshots and DOM analysis
ignore: []

capture:
  timeout_ms: 30000
  settle_ms: 500
  samples: 3
  sample_interval_ms: 750
  # wait_for_selector: "[data-page-ready]"
`;

export function defaultRulesYaml(locale: Locale): string {
  return locale === "en" ? DEFAULT_RULES_YAML_EN : DEFAULT_RULES_YAML;
}

const DEFAULT_CONFIG: AcceptanceConfig = {
  viewport: "auto",
  thresholds: {
    visualSimilarityMin: 0.95,
    pixelThreshold: 0.1,
    positionTolerancePx: 4,
    sizeTolerancePx: 4,
    fontSizeTolerancePx: 1,
    colorDeltaE: 3,
    matchConfidenceMin: 0.72,
    highConfidenceMin: 0.86
  },
  rules: {
    visual_similarity: "error",
    position: "error",
    size: "error",
    content: "error",
    typography: "error",
    alignment: "error",
    color: "warning",
    decoration: "warning",
    broken_image: "error",
    horizontal_overflow: "error",
    clipped_text: "warning"
  },
  pageAlignment: {
    missingModule: {
      minimumHorizontalOverlapRatio: 0.5,
      maximumResidualRatio: 0.15
    },
    confidence: {
      weights: {
        stabilityCoverage: 0.25,
        anchorSufficiency: 0.2,
        inlierRatio: 0.3,
        residualQuality: 0.15,
        dynamicCleanliness: 0.05,
        structuralSupport: 0.05
      },
      levels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
    }
  },
  ignore: [],
  capture: { timeoutMs: 30_000, settleMs: 500, samples: 3, sampleIntervalMs: 750 }
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function finiteInteger(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(finiteNumber(value, fallback, min, max));
}

function severity(value: unknown, fallback: Severity | "ignore"): Severity | "ignore" {
  return ["error", "warning", "pending", "info", "ignore"].includes(String(value))
    ? (value as Severity | "ignore")
    : fallback;
}

function normalizedAlignmentWeights(input: UnknownRecord): AcceptanceConfig["pageAlignment"]["confidence"]["weights"] {
  const fallback = DEFAULT_CONFIG.pageAlignment.confidence.weights;
  const values = {
    stabilityCoverage: finiteNumber(input.stability_coverage, fallback.stabilityCoverage, 0, 1000),
    anchorSufficiency: finiteNumber(input.anchor_sufficiency, fallback.anchorSufficiency, 0, 1000),
    inlierRatio: finiteNumber(input.inlier_ratio, fallback.inlierRatio, 0, 1000),
    residualQuality: finiteNumber(input.residual_quality, fallback.residualQuality, 0, 1000),
    dynamicCleanliness: finiteNumber(input.dynamic_cleanliness, fallback.dynamicCleanliness, 0, 1000),
    structuralSupport: finiteNumber(input.structural_support, fallback.structuralSupport, 0, 1000)
  };
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return { ...fallback };
  return {
    stabilityCoverage: values.stabilityCoverage / total,
    anchorSufficiency: values.anchorSufficiency / total,
    inlierRatio: values.inlierRatio / total,
    residualQuality: values.residualQuality / total,
    dynamicCleanliness: values.dynamicCleanliness / total,
    structuralSupport: values.structuralSupport / total
  };
}

export function parseAcceptanceYaml(source?: string): AcceptanceConfig {
  if (!source?.trim()) return structuredClone(DEFAULT_CONFIG);

  const parsed = record(yaml.load(source));
  const thresholds = record(parsed.thresholds);
  const rulesInput = record(parsed.rules);
  const capture = record(parsed.capture);
  const pageAlignment = record(parsed.page_alignment);
  const missingModule = record(pageAlignment.missing_module);
  const alignmentConfidence = record(pageAlignment.confidence);
  const alignmentLevels = record(alignmentConfidence.levels);

  let viewport: AcceptanceConfig["viewport"] = "auto";
  if (parsed.viewport && parsed.viewport !== "auto") {
    const viewportInput = record(parsed.viewport);
    viewport = {
      width: finiteNumber(viewportInput.width, 1440, 320, 6000),
      height: finiteNumber(viewportInput.height, 900, 200, 6000)
    };
  }

  const rules = { ...DEFAULT_CONFIG.rules };
  for (const [name, fallback] of Object.entries(rules)) {
    rules[name] = severity(rulesInput[name], fallback);
  }
  const lowMin = finiteNumber(
    alignmentLevels.low_min,
    DEFAULT_CONFIG.pageAlignment.confidence.levels.lowMin,
    0,
    1
  );
  const mediumMin = finiteNumber(
    alignmentLevels.medium_min,
    DEFAULT_CONFIG.pageAlignment.confidence.levels.mediumMin,
    lowMin,
    1
  );
  const highMin = finiteNumber(
    alignmentLevels.high_min,
    DEFAULT_CONFIG.pageAlignment.confidence.levels.highMin,
    mediumMin,
    1
  );

  return {
    viewport,
    thresholds: {
      visualSimilarityMin: finiteNumber(
        thresholds.visual_similarity_min ?? rulesInput.visual_similarity_min,
        DEFAULT_CONFIG.thresholds.visualSimilarityMin,
        0,
        1
      ),
      pixelThreshold: finiteNumber(
        thresholds.pixel_threshold,
        DEFAULT_CONFIG.thresholds.pixelThreshold,
        0,
        1
      ),
      positionTolerancePx: finiteNumber(
        thresholds.position_tolerance_px ?? rulesInput.position_tolerance_px,
        DEFAULT_CONFIG.thresholds.positionTolerancePx,
        0,
        100
      ),
      sizeTolerancePx: finiteNumber(
        thresholds.size_tolerance_px ?? rulesInput.size_tolerance_px,
        DEFAULT_CONFIG.thresholds.sizeTolerancePx,
        0,
        100
      ),
      fontSizeTolerancePx: finiteNumber(
        thresholds.font_size_tolerance_px ?? rulesInput.font_size_tolerance_px,
        DEFAULT_CONFIG.thresholds.fontSizeTolerancePx,
        0,
        20
      ),
      colorDeltaE: finiteNumber(
        thresholds.color_delta_e ?? rulesInput.color_delta_e,
        DEFAULT_CONFIG.thresholds.colorDeltaE,
        0,
        100
      ),
      matchConfidenceMin: finiteNumber(
        thresholds.match_confidence_min,
        DEFAULT_CONFIG.thresholds.matchConfidenceMin,
        0,
        1
      ),
      highConfidenceMin: finiteNumber(
        thresholds.high_confidence_min,
        DEFAULT_CONFIG.thresholds.highConfidenceMin,
        0,
        1
      )
    },
    rules,
    pageAlignment: {
      missingModule: {
        minimumHorizontalOverlapRatio: finiteNumber(
          missingModule.minimum_horizontal_overlap_ratio,
          DEFAULT_CONFIG.pageAlignment.missingModule.minimumHorizontalOverlapRatio,
          0,
          1
        ),
        maximumResidualRatio: finiteNumber(
          missingModule.maximum_residual_ratio,
          DEFAULT_CONFIG.pageAlignment.missingModule.maximumResidualRatio,
          0,
          1
        )
      },
      confidence: {
        weights: normalizedAlignmentWeights(record(alignmentConfidence.weights)),
        levels: { highMin, mediumMin, lowMin }
      }
    },
    ignore: Array.isArray(parsed.ignore)
      ? parsed.ignore.filter((value): value is string => typeof value === "string")
      : [],
    capture: {
      timeoutMs: finiteNumber(capture.timeout_ms, DEFAULT_CONFIG.capture.timeoutMs, 1000, 60_000),
      settleMs: finiteNumber(capture.settle_ms, DEFAULT_CONFIG.capture.settleMs, 0, 5000),
      samples: finiteInteger(capture.samples, DEFAULT_CONFIG.capture.samples, 1, 5),
      sampleIntervalMs: finiteNumber(
        capture.sample_interval_ms,
        DEFAULT_CONFIG.capture.sampleIntervalMs,
        0,
        5000
      ),
      waitForSelector:
        typeof capture.wait_for_selector === "string" && capture.wait_for_selector.trim()
          ? capture.wait_for_selector.trim()
          : undefined
    }
  };
}

export function severityFor(
  config: AcceptanceConfig,
  rule: string,
  fallback: Severity = "warning"
): Severity | null {
  const value = config.rules[rule] ?? fallback;
  return value === "ignore" ? null : value;
}
