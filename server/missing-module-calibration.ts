import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { MissingModuleEvaluation } from "../src/types";
import { parseAcceptanceYaml } from "./default-rules";

const labelManifestSchema = z.object({
  version: z.literal(1),
  reviews: z.array(z.object({
    review: z.string().trim().min(1),
    labels: z.array(z.object({
      frameId: z.string().trim().min(1),
      designParentFigmaNodeId: z.string().trim().min(1),
      regionIndex: z.number().int().nonnegative().optional(),
      label: z.enum(["correct", "false_positive"])
    })).min(1)
  })).min(1)
});

export interface MissingModuleCalibrationThresholds {
  minimumHorizontalOverlapRatio: number;
  maximumResidualRatio: number;
}

export interface MissingModuleCalibrationMetrics {
  accuracy: number;
  balancedAccuracy: number;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
}

export interface MissingModuleCalibrationResult {
  sampleCount: number;
  groupCount: number;
  current: {
    thresholds: MissingModuleCalibrationThresholds;
    metrics: MissingModuleCalibrationMetrics;
  };
  candidate: {
    thresholds: MissingModuleCalibrationThresholds;
    metrics: MissingModuleCalibrationMetrics;
  };
  candidateYaml: string;
  recommendation: {
    accepted: boolean;
    reasons: string[];
  };
}

export interface MissingModuleCalibrationOptions {
  horizontalOverlapCandidates?: number[];
  residualRatioCandidates?: number[];
}

interface LabeledCandidate {
  frameId: string;
  label: "correct" | "false_positive";
  candidate: MissingModuleEvaluation;
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function reportsFromReview(value: unknown): JsonRecord[] {
  const root = record(value);
  if (Object.keys(record(root.source)).length > 0) return [root];
  const pages = Array.isArray(root.pages)
    ? root.pages
    : Array.isArray(root.pageResults)
      ? root.pageResults
      : [];
  return pages.map((page) => {
    const entry = record(page);
    return Object.keys(record(entry.report)).length > 0 ? record(entry.report) : entry;
  });
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Missing-module candidate is missing numeric ${name}.`);
  }
  return value;
}

function optionalFiniteNumber(value: unknown, name: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  return finiteNumber(value, name);
}

function parseCandidate(value: unknown): MissingModuleEvaluation {
  const candidate = record(value);
  const rejectionReasons = Array.isArray(candidate.rejectionReasons)
    ? candidate.rejectionReasons.filter((reason): reason is MissingModuleEvaluation["rejectionReasons"][number] =>
        typeof reason === "string"
      )
    : [];
  const topology = candidate.topology === "leading" || candidate.topology === "interior"
    ? candidate.topology
    : "unsupported";
  const designFlowGapPx = optionalFiniteNumber(candidate.designFlowGapPx, "designFlowGapPx");
  const residualPx = optionalFiniteNumber(candidate.residualPx, "residualPx");
  const residualRatio = optionalFiniteNumber(candidate.residualRatio, "residualRatio");
  const horizontalOverlapRatio = optionalFiniteNumber(
    candidate.horizontalOverlapRatio,
    "horizontalOverlapRatio"
  );
  const structurallyBlocked = topology === "unsupported" || rejectionReasons.some((reason) =>
    !["insufficient-horizontal-overlap", "residual-too-high"].includes(reason)
  );
  if (
    !structurallyBlocked &&
    [designFlowGapPx, residualPx, residualRatio, horizontalOverlapRatio].some((item) => item === undefined)
  ) {
    throw new Error(
      "Threshold-relevant missing-module candidate is missing geometry required for calibration."
    );
  }
  return {
    candidateId: String(candidate.candidateId ?? ""),
    regionIndex: finiteNumber(candidate.regionIndex, "regionIndex"),
    figmaNodeId: String(candidate.figmaNodeId ?? ""),
    designPath: Array.isArray(candidate.designPath)
      ? candidate.designPath.filter((part): part is string => typeof part === "string")
      : [],
    topology,
    ...(designFlowGapPx === undefined ? {} : { designFlowGapPx }),
    ...(residualPx === undefined ? {} : { residualPx }),
    ...(residualRatio === undefined ? {} : { residualRatio }),
    ...(horizontalOverlapRatio === undefined ? {} : { horizontalOverlapRatio }),
    published: candidate.published === true,
    rejectionReasons,
    thresholds: {
      positionTolerancePx: finiteNumber(record(candidate.thresholds).positionTolerancePx, "positionTolerancePx"),
      minimumHorizontalOverlapRatio: finiteNumber(
        record(candidate.thresholds).minimumHorizontalOverlapRatio,
        "minimumHorizontalOverlapRatio"
      ),
      maximumResidualRatio: finiteNumber(
        record(candidate.thresholds).maximumResidualRatio,
        "maximumResidualRatio"
      )
    }
  };
}

async function loadLabeledCandidates(manifestPath: string): Promise<LabeledCandidate[]> {
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifest = labelManifestSchema.parse(
    JSON.parse(await readFile(resolvedManifestPath, "utf8"))
  );
  const output: LabeledCandidate[] = [];
  for (const reviewEntry of manifest.reviews) {
    const reviewPath = path.resolve(path.dirname(resolvedManifestPath), reviewEntry.review);
    const reports = reportsFromReview(JSON.parse(await readFile(reviewPath, "utf8")));
    for (const label of reviewEntry.labels) {
      const reportsForFrame = reports.filter((report) =>
        typeof record(report.source).design === "string" &&
        String(record(report.source).design).includes(label.frameId)
      );
      const searchableReports = reportsForFrame.length > 0 ? reportsForFrame : reports;
      const matches = searchableReports.flatMap((report) => {
        const missingModules = record(record(report.matching).missingModules);
        const candidates = Array.isArray(missingModules.candidates)
          ? missingModules.candidates
          : [];
        return candidates.filter((candidateValue) => {
          const candidate = record(candidateValue);
          return candidate.figmaNodeId === label.designParentFigmaNodeId &&
            (label.regionIndex === undefined || candidate.regionIndex === label.regionIndex);
        });
      });
      if (matches.length !== 1) {
        throw new Error(
          `Missing-module label ${label.designParentFigmaNodeId}` +
          `${label.regionIndex === undefined ? "" : ` at region ${label.regionIndex}`} resolves to ${matches.length} candidates.`
        );
      }
      output.push({ frameId: label.frameId, label: label.label, candidate: parseCandidate(matches[0]) });
    }
  }
  return output;
}

const thresholdReasons = new Set<MissingModuleEvaluation["rejectionReasons"][number]>([
  "insufficient-horizontal-overlap",
  "residual-too-high"
]);

function predictsMissing(
  sample: LabeledCandidate,
  thresholds: MissingModuleCalibrationThresholds
): boolean {
  const candidate = sample.candidate;
  if (candidate.topology === "unsupported") return false;
  if (candidate.rejectionReasons.some((reason) => !thresholdReasons.has(reason))) return false;
  const allowedResidual = Math.max(
    candidate.thresholds.positionTolerancePx * 2,
    Math.abs(candidate.designFlowGapPx ?? 0) * thresholds.maximumResidualRatio
  );
  return (candidate.horizontalOverlapRatio ?? 0) >= thresholds.minimumHorizontalOverlapRatio &&
    (candidate.residualPx ?? Number.POSITIVE_INFINITY) <= allowedResidual;
}

function metricsFor(
  samples: LabeledCandidate[],
  thresholds: MissingModuleCalibrationThresholds
): MissingModuleCalibrationMetrics {
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  for (const sample of samples) {
    const predicted = predictsMissing(sample, thresholds);
    if (sample.label === "correct") {
      if (predicted) truePositive += 1;
      else falseNegative += 1;
    } else if (predicted) falsePositive += 1;
    else trueNegative += 1;
  }
  const total = samples.length;
  const positiveCount = truePositive + falseNegative;
  const negativeCount = trueNegative + falsePositive;
  const truePositiveRate = positiveCount > 0 ? truePositive / positiveCount : 0;
  const trueNegativeRate = negativeCount > 0 ? trueNegative / negativeCount : 0;
  return {
    accuracy: total > 0 ? (truePositive + trueNegative) / total : 0,
    balancedAccuracy: (truePositiveRate + trueNegativeRate) / 2,
    confusionMatrix: { truePositive, trueNegative, falsePositive, falseNegative }
  };
}

function candidateYaml(thresholds: MissingModuleCalibrationThresholds): string {
  return [
    "page_alignment:",
    "  missing_module:",
    `    minimum_horizontal_overlap_ratio: ${thresholds.minimumHorizontalOverlapRatio}`,
    `    maximum_residual_ratio: ${thresholds.maximumResidualRatio}`,
    ""
  ].join("\n");
}

export async function calibrateMissingModulesFromManifest(
  manifestPath: string,
  options: MissingModuleCalibrationOptions = {}
): Promise<MissingModuleCalibrationResult> {
  const samples = await loadLabeledCandidates(manifestPath);
  const labels = new Set(samples.map((sample) => sample.label));
  if (!labels.has("correct") || !labels.has("false_positive")) {
    throw new Error("Missing-module calibration requires both correct and false_positive labels.");
  }
  const current = parseAcceptanceYaml().pageAlignment.missingModule;
  const horizontalOverlapCandidates = options.horizontalOverlapCandidates ??
    Array.from({ length: 13 }, (_, index) => 0.3 + index * 0.05);
  const residualRatioCandidates = options.residualRatioCandidates ??
    Array.from({ length: 10 }, (_, index) => 0.05 + index * 0.05);
  const allCandidates = horizontalOverlapCandidates.flatMap((minimumHorizontalOverlapRatio) =>
    residualRatioCandidates.map((maximumResidualRatio) => ({
      minimumHorizontalOverlapRatio,
      maximumResidualRatio
    }))
  );
  const ranked = allCandidates.map((thresholds) => ({
    thresholds,
    metrics: metricsFor(samples, thresholds),
    distance: Math.abs(thresholds.minimumHorizontalOverlapRatio - current.minimumHorizontalOverlapRatio) +
      Math.abs(thresholds.maximumResidualRatio - current.maximumResidualRatio)
  })).sort((left, right) =>
    right.metrics.balancedAccuracy - left.metrics.balancedAccuracy ||
    right.metrics.accuracy - left.metrics.accuracy ||
    left.metrics.confusionMatrix.falsePositive - right.metrics.confusionMatrix.falsePositive ||
    left.distance - right.distance ||
    right.thresholds.minimumHorizontalOverlapRatio - left.thresholds.minimumHorizontalOverlapRatio ||
    left.thresholds.maximumResidualRatio - right.thresholds.maximumResidualRatio
  );
  const best = ranked[0];
  if (!best) throw new Error("No missing-module threshold candidates were provided.");
  const currentMetrics = metricsFor(samples, current);
  const groupCount = new Set(samples.map((sample) => sample.frameId)).size;
  const reasons: string[] = [];
  if (groupCount < 3) reasons.push("Calibration requires at least 3 Page/Frame groups before recommendation.");
  if (best.metrics.balancedAccuracy < currentMetrics.balancedAccuracy) {
    reasons.push("Candidate balanced accuracy is below the current configuration.");
  }
  if (
    best.metrics.confusionMatrix.falsePositive >
    currentMetrics.confusionMatrix.falsePositive
  ) {
    reasons.push("Candidate increases false positives.");
  }
  return {
    sampleCount: samples.length,
    groupCount,
    current: { thresholds: current, metrics: currentMetrics },
    candidate: { thresholds: best.thresholds, metrics: best.metrics },
    candidateYaml: candidateYaml(best.thresholds),
    recommendation: { accepted: reasons.length === 0, reasons }
  };
}
