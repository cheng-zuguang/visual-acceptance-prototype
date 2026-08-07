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

rules:
  visual_similarity: error
  missing_element: error
  extra_element: warning
  position: error
  size: error
  content: error
  typography: error
  color: warning
  decoration: warning
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning

# CSS 选择器：截图和 DOM 分析时同时忽略
ignore: []

# 未能匹配时仍必须判失败的 Figma node id
critical_figma_nodes: []

capture:
  timeout_ms: 10000
  settle_ms: 500
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

rules:
  visual_similarity: error
  missing_element: error
  extra_element: warning
  position: error
  size: error
  content: error
  typography: error
  color: warning
  decoration: warning
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning

# CSS selectors ignored by both screenshots and DOM analysis
ignore: []

# Figma node IDs that must fail the gate when unmatched
critical_figma_nodes: []

capture:
  timeout_ms: 10000
  settle_ms: 500
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
    missing_element: "error",
    extra_element: "warning",
    position: "error",
    size: "error",
    content: "error",
    typography: "error",
    color: "warning",
    decoration: "warning",
    broken_image: "error",
    horizontal_overflow: "error",
    clipped_text: "warning"
  },
  ignore: [],
  criticalFigmaNodes: [],
  capture: { timeoutMs: 10_000, settleMs: 500 }
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

function severity(value: unknown, fallback: Severity | "ignore"): Severity | "ignore" {
  return ["error", "warning", "pending", "info", "ignore"].includes(String(value))
    ? (value as Severity | "ignore")
    : fallback;
}

export function parseAcceptanceYaml(source?: string): AcceptanceConfig {
  if (!source?.trim()) return structuredClone(DEFAULT_CONFIG);

  const parsed = record(yaml.load(source));
  const thresholds = record(parsed.thresholds);
  const rulesInput = record(parsed.rules);
  const capture = record(parsed.capture);

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
    ignore: Array.isArray(parsed.ignore)
      ? parsed.ignore.filter((value): value is string => typeof value === "string")
      : [],
    criticalFigmaNodes: Array.isArray(parsed.critical_figma_nodes)
      ? parsed.critical_figma_nodes.filter((value): value is string => typeof value === "string")
      : [],
    capture: {
      timeoutMs: finiteNumber(capture.timeout_ms, DEFAULT_CONFIG.capture.timeoutMs, 1000, 60_000),
      settleMs: finiteNumber(capture.settle_ms, DEFAULT_CONFIG.capture.settleMs, 0, 5000),
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
