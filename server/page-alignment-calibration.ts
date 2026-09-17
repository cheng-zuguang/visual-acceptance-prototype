import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import * as yaml from "js-yaml";
import type {
  PageAlignmentConfidenceLevels,
  PageAlignmentConfidenceWeights,
  PageAlignmentScoreBreakdown
} from "../src/types";

const COMPONENT_NAMES = [
  "stabilityCoverage",
  "anchorSufficiency",
  "inlierRatio",
  "residualQuality",
  "dynamicCleanliness",
  "structuralSupport"
] as const satisfies ReadonlyArray<keyof PageAlignmentConfidenceWeights>;
const METRIC_COMPARISON_EPSILON = 1e-12;

export type CalibrationLabel = "correct" | "false_positive";
type JsonRecord = Record<string, unknown>;

export interface PageAlignmentCalibrationOptions {
  weightStep?: number;
  thresholdStep?: number;
  validationRatio?: number;
  crossValidationFolds?: number;
  seed?: string;
  maxWeightStandardDeviation?: number;
  maxThresholdStandardDeviation?: number;
  minimumStabilityFolds?: number;
  minimumOofBalancedAccuracyDelta?: number;
  maximumOofFalsePositiveRateIncrease?: number;
}

export interface PageAlignmentConfusionMatrix {
  truePositive: number;
  trueNegative: number;
  falsePositive: number;
  falseNegative: number;
}

export interface PageAlignmentCalibrationMetrics {
  accuracy: number;
  balancedAccuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  confusionMatrix: PageAlignmentConfusionMatrix;
  levelConfusionMatrix: Record<
    CalibrationLabel,
    Record<"high" | "medium" | "low", number>
  >;
}

export interface PageAlignmentCalibrationResult {
  sampleCount: number;
  candidateConfig: {
    weights: PageAlignmentConfidenceWeights;
    levels: PageAlignmentConfidenceLevels;
  };
  candidateYaml: string;
  metrics: PageAlignmentCalibrationMetrics;
  samples: PageAlignmentCalibrationPrediction[];
  evaluation: {
    split: PageAlignmentCalibrationSplit;
    training: PageAlignmentMetricComparison;
    validation?: PageAlignmentMetricComparison;
    crossValidation: PageAlignmentCrossValidation;
  };
  recommendation: PageAlignmentCalibrationRecommendation;
  search: {
    weightStep: number;
    thresholdStep: number;
    evaluatedCandidates: number;
  };
}

export interface PageAlignmentCalibrationMetricDelta {
  accuracy: number;
  balancedAccuracy: number;
  precision: number;
  recall: number;
  specificity: number;
  confusionMatrix: PageAlignmentConfusionMatrix;
  levelConfusionMatrix: Record<
    CalibrationLabel,
    Record<"high" | "medium" | "low", number>
  >;
}

export interface PageAlignmentMetricComparison {
  current: PageAlignmentCalibrationMetrics;
  candidate: PageAlignmentCalibrationMetrics;
  delta: PageAlignmentCalibrationMetricDelta;
}

export interface PageAlignmentCrossValidationFold {
  index: number;
  trainingGroupIds: string[];
  validationGroupIds: string[];
  candidateConfig: PageAlignmentCalibrationResult["candidateConfig"];
  currentMetrics: PageAlignmentCalibrationMetrics;
  candidateMetrics: PageAlignmentCalibrationMetrics;
  delta: PageAlignmentCalibrationMetricDelta;
}

export interface PageAlignmentCrossValidation {
  strategy: "group-k-fold";
  requestedFolds: number;
  foldCount: number;
  folds: PageAlignmentCrossValidationFold[];
  currentMetrics: PageAlignmentCalibrationMetrics;
  candidateMetrics: PageAlignmentCalibrationMetrics;
  delta: PageAlignmentCalibrationMetricDelta;
  parameterStability?: PageAlignmentParameterStability;
}

export interface PageAlignmentParameterStatistics {
  mean: number;
  variance: number;
  standardDeviation: number;
  min: number;
  max: number;
  confidenceInterval95: {
    lower: number;
    upper: number;
  };
}

export interface PageAlignmentParameterStability {
  foldCount: number;
  minimumFoldCount: number;
  assessment: "stable" | "unstable" | "insufficient-folds";
  limits: {
    maxWeightStandardDeviation: number;
    maxThresholdStandardDeviation: number;
  };
  weights: Record<keyof PageAlignmentConfidenceWeights, PageAlignmentParameterStatistics>;
  thresholds: Record<"highMin" | "mediumMin", PageAlignmentParameterStatistics>;
  unstableParameters: PageAlignmentUnstableParameter[];
}

export interface PageAlignmentUnstableParameter {
  kind: "weight" | "threshold";
  name: keyof PageAlignmentConfidenceWeights | "highMin" | "mediumMin";
  standardDeviation: number;
  maximumStandardDeviation: number;
}

export interface PageAlignmentCalibrationRecommendation {
  status: "recommended" | "rejected";
  reasons: string[];
  gates: {
    parameterStability: {
      passed: boolean;
      assessment: PageAlignmentParameterStability["assessment"];
    };
    oofBalancedAccuracy: {
      evaluated: boolean;
      passed: boolean;
      current: number;
      candidate: number;
      delta: number;
      minimumDelta: number;
    };
    oofFalsePositiveRate: {
      evaluated: boolean;
      passed: boolean;
      current: number;
      candidate: number;
      delta: number;
      maximumIncrease: number;
    };
  };
}

export interface PageAlignmentCalibrationSplit {
  strategy: "page-frame-grouped";
  seed: string;
  validationRatio: number;
  trainingGroupIds: string[];
  validationGroupIds: string[];
  trainingSampleCount: number;
  validationSampleCount: number;
}

export interface PageAlignmentCalibrationPrediction {
  reviewPath: string;
  reviewId: string;
  clientPageId?: string;
  regionIndex: number;
  designParentFigmaNodeId: string;
  actualParentSelector?: string;
  groupId: string;
  partition: "training" | "validation";
  label: CalibrationLabel;
  baseScoreCap: number;
  componentValues: PageAlignmentConfidenceWeights;
  currentScore: number;
  currentLevel: "high" | "medium" | "low";
  candidateScore: number;
  candidateLevel: "high" | "medium" | "low";
}

interface CalibrationSample {
  reviewPath: string;
  reviewId: string;
  clientPageId?: string;
  regionIndex: number;
  designParentFigmaNodeId: string;
  actualParentSelector?: string;
  groupId: string;
  label: CalibrationLabel;
  baseScoreCap: number;
  values: PageAlignmentConfidenceWeights;
  currentConfig: PageAlignmentCalibrationResult["candidateConfig"];
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function finiteUnit(value: unknown, context: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new Error(`${context} must be a number between 0 and 1.`);
  }
  return number;
}

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read calibration JSON ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sampleFromRegion(
  region: JsonRecord,
  metadata: Omit<CalibrationSample, "baseScoreCap" | "values" | "currentConfig">,
  context: string
): CalibrationSample {
  const breakdown = record(region.scoreBreakdown) as Partial<PageAlignmentScoreBreakdown>;
  const components = record(breakdown.components);
  const values = Object.fromEntries(COMPONENT_NAMES.map((name) => {
    const component = record(components[name]);
    return [name, finiteUnit(component.value, `${context}.scoreBreakdown.components.${name}.value`)];
  })) as unknown as PageAlignmentConfidenceWeights;
  const rawCurrentWeights = Object.fromEntries(COMPONENT_NAMES.map((name) => {
    const component = record(components[name]);
    return [name, finiteUnit(component.weight, `${context}.scoreBreakdown.components.${name}.weight`)];
  })) as unknown as PageAlignmentConfidenceWeights;
  const currentWeightTotal = Object.values(rawCurrentWeights)
    .reduce((sum, value) => sum + value, 0);
  if (currentWeightTotal <= 0) {
    throw new Error(`${context}.scoreBreakdown current weights must have a positive total.`);
  }
  const currentWeights = Object.fromEntries(COMPONENT_NAMES.map((name) => [
    name,
    rawCurrentWeights[name] / currentWeightTotal
  ])) as unknown as PageAlignmentConfidenceWeights;
  const rawLevels = record(breakdown.levelThresholds);
  const currentLevels = {
    highMin: finiteUnit(rawLevels.highMin, `${context}.scoreBreakdown.levelThresholds.highMin`),
    mediumMin: finiteUnit(rawLevels.mediumMin, `${context}.scoreBreakdown.levelThresholds.mediumMin`),
    lowMin: finiteUnit(rawLevels.lowMin, `${context}.scoreBreakdown.levelThresholds.lowMin`)
  };
  if (
    currentLevels.lowMin > currentLevels.mediumMin ||
    currentLevels.mediumMin > currentLevels.highMin
  ) {
    throw new Error(`${context}.scoreBreakdown level thresholds must be ordered low <= medium <= high.`);
  }
  return {
    ...metadata,
    baseScoreCap: finiteUnit(breakdown.baseScoreCap, `${context}.scoreBreakdown.baseScoreCap`),
    values,
    currentConfig: { weights: currentWeights, levels: currentLevels }
  };
}

function reportForLabel(
  review: JsonRecord,
  labelEntry: JsonRecord,
  context: string
): JsonRecord {
  if (review.matching) return review;
  const clientPageId = labelEntry.clientPageId;
  const pages = Array.isArray(review.pages)
    ? review.pages.map(record)
    : Array.isArray(review.pageResults)
      ? review.pageResults.map(record)
      : [];
  if (pages.length === 0) {
    throw new Error(`${context}: Review JSON does not contain matching, pages, or pageResults.`);
  }
  if (typeof clientPageId !== "string" || !clientPageId) {
    if (pages.length !== 1) {
      throw new Error(`${context}: clientPageId is required for a multi-PagePair Review JSON.`);
    }
  }
  const matches = typeof clientPageId === "string" && clientPageId
    ? pages.filter((page) => page.clientPageId === clientPageId)
    : pages;
  if (matches.length !== 1) {
    throw new Error(`${context}: expected exactly one PagePair for clientPageId ${String(clientPageId)}, found ${matches.length}.`);
  }
  const page = matches[0];
  const pageReport = record(page.report);
  return pageReport.matching ? pageReport : page;
}

async function loadSamples(manifestPath: string): Promise<CalibrationSample[]> {
  const manifest = record(await readJson(manifestPath));
  if (manifest.version !== 1 || !Array.isArray(manifest.reviews)) {
    throw new Error("Calibration manifest must contain version: 1 and a reviews array.");
  }
  const samples: CalibrationSample[] = [];
  for (const [reviewIndex, sourceValue] of manifest.reviews.entries()) {
    const source = record(sourceValue);
    if (typeof source.review !== "string" || !source.review.trim() || !Array.isArray(source.labels)) {
      throw new Error(`reviews[${reviewIndex}] must contain review and labels.`);
    }
    const reviewPath = path.resolve(path.dirname(manifestPath), source.review);
    const review = record(await readJson(reviewPath));
    for (const [labelIndex, labelValue] of source.labels.entries()) {
      const labelEntry = record(labelValue);
      const context = `reviews[${reviewIndex}].labels[${labelIndex}]`;
      if (labelEntry.label !== "correct" && labelEntry.label !== "false_positive") {
        throw new Error(`${context}.label must be correct or false_positive.`);
      }
      if (typeof labelEntry.designParentFigmaNodeId !== "string") {
        throw new Error(`${context} must identify designParentFigmaNodeId.`);
      }
      const report = reportForLabel(review, labelEntry, context);
      const matching = record(report.matching);
      const pageAlignment = record(matching.pageAlignment);
      const regions = Array.isArray(pageAlignment.regions)
        ? pageAlignment.regions.map(record)
        : [];
      const regionIndex = labelEntry.regionIndex;
      let selectedRegion: JsonRecord | undefined;
      if (regionIndex !== undefined) {
        if (!Number.isInteger(regionIndex) || Number(regionIndex) < 0) {
          throw new Error(`${context}.regionIndex must be a non-negative integer.`);
        }
        selectedRegion = regions[Number(regionIndex)];
        if (
          !selectedRegion ||
          selectedRegion.designParentFigmaNodeId !== labelEntry.designParentFigmaNodeId
        ) {
          throw new Error(
            `${reviewPath}: regionIndex ${String(regionIndex)} does not match ${labelEntry.designParentFigmaNodeId}.`
          );
        }
      } else {
        const matchingRegions = regions.filter(
          (region) => region.designParentFigmaNodeId === labelEntry.designParentFigmaNodeId
        );
        if (matchingRegions.length !== 1) {
          throw new Error(
            `${reviewPath}: expected exactly one region for ${labelEntry.designParentFigmaNodeId}, found ${matchingRegions.length}; add regionIndex to disambiguate repeated regions.`
          );
        }
        selectedRegion = matchingRegions[0];
      }
      const selectedRegionIndex = regionIndex === undefined
        ? regions.indexOf(selectedRegion)
        : Number(regionIndex);
      const reportId = typeof report.id === "string"
        ? report.id
        : typeof review.reviewId === "string"
          ? review.reviewId
          : source.review;
      const reportSource = record(report.source);
      const frameIdentity = typeof labelEntry.frameId === "string" && labelEntry.frameId
        ? labelEntry.frameId
        : typeof reportSource.design === "string" && reportSource.design
          ? reportSource.design
          : undefined;
      const pageIdentity = typeof labelEntry.clientPageId === "string" && labelEntry.clientPageId
        ? labelEntry.clientPageId
        : reportId;
      const groupId = frameIdentity
        ? `frame:${frameIdentity}`
        : `page:${pageIdentity}`;
      samples.push(sampleFromRegion(
        selectedRegion,
        {
          reviewPath,
          reviewId: reportId,
          ...(typeof labelEntry.clientPageId === "string"
            ? { clientPageId: labelEntry.clientPageId }
            : {}),
          regionIndex: selectedRegionIndex,
          designParentFigmaNodeId: labelEntry.designParentFigmaNodeId,
          ...(typeof selectedRegion.actualParentSelector === "string"
            ? { actualParentSelector: selectedRegion.actualParentSelector }
            : {}),
          groupId,
          label: labelEntry.label
        },
        context
      ));
    }
  }
  if (samples.length === 0) throw new Error("Calibration manifest contains no labeled regions.");
  const labels = new Set(samples.map((sample) => sample.label));
  if (!labels.has("correct") || !labels.has("false_positive")) {
    throw new Error("Calibration requires at least one correct and one false_positive label.");
  }
  return samples;
}

function decimalPlaces(value: number): number {
  return Math.max(0, (String(value).split(".")[1] ?? "").length);
}

function gridUnits(step: number, name: string): number {
  if (!Number.isFinite(step) || step <= 0 || step > 1) {
    throw new Error(`${name} must be greater than 0 and at most 1.`);
  }
  const units = Math.round(1 / step);
  if (Math.abs(units * step - 1) > 1e-9) {
    throw new Error(`${name} must divide 1 exactly.`);
  }
  return units;
}

function weightCandidates(step: number): PageAlignmentConfidenceWeights[] {
  const units = gridUnits(step, "weightStep");
  const result: PageAlignmentConfidenceWeights[] = [];
  const values = new Array<number>(COMPONENT_NAMES.length).fill(0);
  const visit = (index: number, remaining: number) => {
    if (index === values.length - 1) {
      values[index] = remaining;
      result.push(Object.fromEntries(COMPONENT_NAMES.map((name, valueIndex) => [
        name,
        values[valueIndex] / units
      ])) as unknown as PageAlignmentConfidenceWeights);
      return;
    }
    for (let value = 0; value <= remaining; value += 1) {
      values[index] = value;
      visit(index + 1, remaining - value);
    }
  };
  visit(0, units);
  return result;
}

function thresholdCandidates(step: number): number[] {
  const units = gridUnits(step, "thresholdStep");
  const decimals = decimalPlaces(step);
  return Array.from({ length: units + 1 }, (_, index) => Number((index / units).toFixed(decimals)));
}

function score(sample: CalibrationSample, weights: PageAlignmentConfidenceWeights): number {
  const weighted = COMPONENT_NAMES.reduce(
    (sum, name) => sum + sample.values[name] * weights[name],
    0
  );
  return Math.round(Math.min(sample.baseScoreCap, weighted) * 100) / 100;
}

function confidenceLevel(
  value: number,
  levels: PageAlignmentConfidenceLevels
): "high" | "medium" | "low" {
  return value >= levels.highMin
    ? "high"
    : value >= levels.mediumMin
      ? "medium"
      : "low";
}

function metricsFromCounts(
  confusionMatrix: PageAlignmentConfusionMatrix,
  levelConfusionMatrix: PageAlignmentCalibrationMetrics["levelConfusionMatrix"]
): PageAlignmentCalibrationMetrics {
  const sampleCount = Object.values(confusionMatrix).reduce((sum, value) => sum + value, 0);
  const ratio = (numerator: number, denominator: number) => denominator > 0
    ? numerator / denominator
    : 0;
  const recall = ratio(
    confusionMatrix.truePositive,
    confusionMatrix.truePositive + confusionMatrix.falseNegative
  );
  const specificity = ratio(
    confusionMatrix.trueNegative,
    confusionMatrix.trueNegative + confusionMatrix.falsePositive
  );
  return {
    accuracy: ratio(
      confusionMatrix.truePositive + confusionMatrix.trueNegative,
      sampleCount
    ),
    balancedAccuracy: (recall + specificity) / 2,
    precision: ratio(
      confusionMatrix.truePositive,
      confusionMatrix.truePositive + confusionMatrix.falsePositive
    ),
    recall,
    specificity,
    confusionMatrix,
    levelConfusionMatrix
  };
}

function metricsForLevels(
  samples: CalibrationSample[],
  levelFor: (sample: CalibrationSample) => "high" | "medium" | "low"
): PageAlignmentCalibrationMetrics {
  const confusionMatrix: PageAlignmentConfusionMatrix = {
    truePositive: 0,
    trueNegative: 0,
    falsePositive: 0,
    falseNegative: 0
  };
  const levelConfusionMatrix: PageAlignmentCalibrationMetrics["levelConfusionMatrix"] = {
    correct: { high: 0, medium: 0, low: 0 },
    false_positive: { high: 0, medium: 0, low: 0 }
  };
  for (const sample of samples) {
    const level = levelFor(sample);
    levelConfusionMatrix[sample.label][level] += 1;
    const accepted = level === "high";
    if (sample.label === "correct") {
      confusionMatrix[accepted ? "truePositive" : "falseNegative"] += 1;
    } else {
      confusionMatrix[accepted ? "falsePositive" : "trueNegative"] += 1;
    }
  }
  return metricsFromCounts(confusionMatrix, levelConfusionMatrix);
}

function metrics(
  samples: CalibrationSample[],
  weights: PageAlignmentConfidenceWeights,
  levels: PageAlignmentConfidenceLevels
): PageAlignmentCalibrationMetrics {
  return metricsForLevels(samples, (sample) =>
    confidenceLevel(score(sample, weights), levels)
  );
}

function currentMetrics(samples: CalibrationSample[]): PageAlignmentCalibrationMetrics {
  return metricsForLevels(samples, (sample) =>
    confidenceLevel(
      score(sample, sample.currentConfig.weights),
      sample.currentConfig.levels
    )
  );
}

function metricDelta(
  current: PageAlignmentCalibrationMetrics,
  candidate: PageAlignmentCalibrationMetrics
): PageAlignmentCalibrationMetricDelta {
  const confusionMatrix = Object.fromEntries(
    (Object.keys(current.confusionMatrix) as Array<keyof PageAlignmentConfusionMatrix>)
      .map((key) => [key, candidate.confusionMatrix[key] - current.confusionMatrix[key]])
  ) as unknown as PageAlignmentConfusionMatrix;
  const levelConfusionMatrix = {
    correct: { high: 0, medium: 0, low: 0 },
    false_positive: { high: 0, medium: 0, low: 0 }
  };
  for (const label of ["correct", "false_positive"] as const) {
    for (const level of ["high", "medium", "low"] as const) {
      levelConfusionMatrix[label][level] =
        candidate.levelConfusionMatrix[label][level] -
        current.levelConfusionMatrix[label][level];
    }
  }
  return {
    accuracy: candidate.accuracy - current.accuracy,
    balancedAccuracy: candidate.balancedAccuracy - current.balancedAccuracy,
    precision: candidate.precision - current.precision,
    recall: candidate.recall - current.recall,
    specificity: candidate.specificity - current.specificity,
    confusionMatrix,
    levelConfusionMatrix
  };
}

function comparison(
  current: PageAlignmentCalibrationMetrics,
  candidate: PageAlignmentCalibrationMetrics
): PageAlignmentMetricComparison {
  return { current, candidate, delta: metricDelta(current, candidate) };
}

function levelSeparationAccuracy(
  candidateMetrics: PageAlignmentCalibrationMetrics,
  sampleCount: number
): number {
  return (
    candidateMetrics.levelConfusionMatrix.correct.high +
    candidateMetrics.levelConfusionMatrix.false_positive.low
  ) / sampleCount;
}

function hasBothLabels(samples: CalibrationSample[]): boolean {
  const labels = new Set(samples.map((sample) => sample.label));
  return labels.has("correct") && labels.has("false_positive");
}

function stableGroupOrder(groupId: string, seed: string): string {
  return createHash("sha256").update(`${seed}\0${groupId}`).digest("hex");
}

function groupedSplit(
  samples: CalibrationSample[],
  validationRatio: number,
  seed: string
): {
  training: CalibrationSample[];
  validation: CalibrationSample[];
  split: PageAlignmentCalibrationSplit;
} {
  if (!Number.isFinite(validationRatio) || validationRatio < 0 || validationRatio >= 1) {
    throw new Error("validationRatio must be at least 0 and less than 1.");
  }
  const groupIds = [...new Set(samples.map((sample) => sample.groupId))]
    .sort((left, right) =>
      stableGroupOrder(left, seed).localeCompare(stableGroupOrder(right, seed))
    );
  const noValidation = () => ({
    training: samples,
    validation: [] as CalibrationSample[],
    split: {
      strategy: "page-frame-grouped" as const,
      seed,
      validationRatio,
      trainingGroupIds: groupIds,
      validationGroupIds: [],
      trainingSampleCount: samples.length,
      validationSampleCount: 0
    }
  });
  if (validationRatio === 0 || groupIds.length < 2) return noValidation();

  const validationGroupCount = Math.max(
    1,
    Math.min(groupIds.length - 1, Math.round(groupIds.length * validationRatio))
  );
  let fallback: Set<string> | undefined;
  let selected: Set<string> | undefined;
  for (let offset = 0; offset < groupIds.length; offset += 1) {
    const candidate = new Set<string>();
    for (let index = 0; index < validationGroupCount; index += 1) {
      candidate.add(groupIds[(offset + index) % groupIds.length]);
    }
    const training = samples.filter((sample) => !candidate.has(sample.groupId));
    if (!hasBothLabels(training)) continue;
    fallback ??= candidate;
    const validation = samples.filter((sample) => candidate.has(sample.groupId));
    if (hasBothLabels(validation)) {
      selected = candidate;
      break;
    }
  }
  selected ??= fallback;
  if (!selected) return noValidation();
  const training = samples.filter((sample) => !selected.has(sample.groupId));
  const validation = samples.filter((sample) => selected.has(sample.groupId));
  return {
    training,
    validation,
    split: {
      strategy: "page-frame-grouped",
      seed,
      validationRatio,
      trainingGroupIds: groupIds.filter((groupId) => !selected.has(groupId)),
      validationGroupIds: groupIds.filter((groupId) => selected.has(groupId)),
      trainingSampleCount: training.length,
      validationSampleCount: validation.length
    }
  };
}

interface CalibrationSearchResult {
  config: PageAlignmentCalibrationResult["candidateConfig"];
  metrics: PageAlignmentCalibrationMetrics;
  evaluatedCandidates: number;
}

function searchCalibration(
  samples: CalibrationSample[],
  weightStep: number,
  thresholdStep: number
): CalibrationSearchResult {
  let best: {
    weights: PageAlignmentConfidenceWeights;
    levels: PageAlignmentConfidenceLevels;
    metrics: PageAlignmentCalibrationMetrics;
  } | undefined;
  let evaluatedCandidates = 0;
  const thresholds = thresholdCandidates(thresholdStep);
  for (const weights of weightCandidates(weightStep)) {
    for (const highMin of thresholds) {
      for (const mediumMin of thresholds) {
        if (mediumMin >= highMin) continue;
        const levels = { highMin, mediumMin, lowMin: 0 };
        const candidateMetrics = metrics(samples, weights, levels);
        evaluatedCandidates += 1;
        const separation = levelSeparationAccuracy(candidateMetrics, samples.length);
        const bestSeparation = best
          ? levelSeparationAccuracy(best.metrics, samples.length)
          : -1;
        const gap = highMin - mediumMin;
        const bestGap = best ? best.levels.highMin - best.levels.mediumMin : -1;
        if (
          !best ||
          candidateMetrics.balancedAccuracy > best.metrics.balancedAccuracy ||
          (
            candidateMetrics.balancedAccuracy === best.metrics.balancedAccuracy &&
            candidateMetrics.accuracy > best.metrics.accuracy
          ) ||
          (
            candidateMetrics.balancedAccuracy === best.metrics.balancedAccuracy &&
            candidateMetrics.accuracy === best.metrics.accuracy &&
            separation > bestSeparation
          ) ||
          (
            candidateMetrics.balancedAccuracy === best.metrics.balancedAccuracy &&
            candidateMetrics.accuracy === best.metrics.accuracy &&
            separation === bestSeparation &&
            candidateMetrics.confusionMatrix.falsePositive < best.metrics.confusionMatrix.falsePositive
          ) ||
          (
            candidateMetrics.balancedAccuracy === best.metrics.balancedAccuracy &&
            candidateMetrics.accuracy === best.metrics.accuracy &&
            separation === bestSeparation &&
            candidateMetrics.confusionMatrix.falsePositive === best.metrics.confusionMatrix.falsePositive &&
            gap > bestGap
          )
        ) {
          best = { weights, levels, metrics: candidateMetrics };
        }
      }
    }
  }
  if (!best) throw new Error("Calibration search produced no candidates.");
  return {
    config: { weights: best.weights, levels: best.levels },
    metrics: best.metrics,
    evaluatedCandidates
  };
}

function combineMetrics(
  values: PageAlignmentCalibrationMetrics[]
): PageAlignmentCalibrationMetrics {
  const confusionMatrix: PageAlignmentConfusionMatrix = {
    truePositive: 0,
    trueNegative: 0,
    falsePositive: 0,
    falseNegative: 0
  };
  const levelConfusionMatrix: PageAlignmentCalibrationMetrics["levelConfusionMatrix"] = {
    correct: { high: 0, medium: 0, low: 0 },
    false_positive: { high: 0, medium: 0, low: 0 }
  };
  for (const value of values) {
    for (const key of Object.keys(confusionMatrix) as Array<keyof PageAlignmentConfusionMatrix>) {
      confusionMatrix[key] += value.confusionMatrix[key];
    }
    for (const label of ["correct", "false_positive"] as const) {
      for (const level of ["high", "medium", "low"] as const) {
        levelConfusionMatrix[label][level] += value.levelConfusionMatrix[label][level];
      }
    }
  }
  return metricsFromCounts(confusionMatrix, levelConfusionMatrix);
}

function parameterStatistics(values: number[]): PageAlignmentParameterStatistics {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.length > 1
    ? values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1)
    : 0;
  const standardDeviation = Math.sqrt(variance);
  const margin = values.length > 1
    ? 1.96 * standardDeviation / Math.sqrt(values.length)
    : 0;
  return {
    mean,
    variance,
    standardDeviation,
    min: Math.min(...values),
    max: Math.max(...values),
    confidenceInterval95: {
      lower: Math.max(0, mean - margin),
      upper: Math.min(1, mean + margin)
    }
  };
}

function parameterStability(
  folds: PageAlignmentCrossValidationFold[],
  minimumFoldCount: number,
  maxWeightStandardDeviation: number,
  maxThresholdStandardDeviation: number
): PageAlignmentParameterStability | undefined {
  if (folds.length === 0) return undefined;
  const weights = Object.fromEntries(COMPONENT_NAMES.map((name) => [
    name,
    parameterStatistics(folds.map((fold) => fold.candidateConfig.weights[name]))
  ])) as PageAlignmentParameterStability["weights"];
  const thresholds = {
    highMin: parameterStatistics(folds.map((fold) => fold.candidateConfig.levels.highMin)),
    mediumMin: parameterStatistics(folds.map((fold) => fold.candidateConfig.levels.mediumMin))
  };
  const unstableParameters: PageAlignmentUnstableParameter[] = [
    ...COMPONENT_NAMES.flatMap((name) =>
      weights[name].standardDeviation > maxWeightStandardDeviation
        ? [{
            kind: "weight" as const,
            name,
            standardDeviation: weights[name].standardDeviation,
            maximumStandardDeviation: maxWeightStandardDeviation
          }]
        : []
    ),
    ...(["highMin", "mediumMin"] as const).flatMap((name) =>
      thresholds[name].standardDeviation > maxThresholdStandardDeviation
        ? [{
            kind: "threshold" as const,
            name,
            standardDeviation: thresholds[name].standardDeviation,
            maximumStandardDeviation: maxThresholdStandardDeviation
          }]
        : []
    )
  ];
  return {
    foldCount: folds.length,
    minimumFoldCount,
    assessment: folds.length < minimumFoldCount
      ? "insufficient-folds"
      : unstableParameters.length > 0
        ? "unstable"
        : "stable",
    limits: {
      maxWeightStandardDeviation,
      maxThresholdStandardDeviation
    },
    weights,
    thresholds,
    unstableParameters
  };
}

function crossValidate(
  samples: CalibrationSample[],
  requestedFolds: number,
  seed: string,
  weightStep: number,
  thresholdStep: number,
  minimumStabilityFolds: number,
  maxWeightStandardDeviation: number,
  maxThresholdStandardDeviation: number
): PageAlignmentCrossValidation {
  if (!Number.isInteger(requestedFolds) || requestedFolds < 0) {
    throw new Error("crossValidationFolds must be a non-negative integer.");
  }
  const groupIds = [...new Set(samples.map((sample) => sample.groupId))]
    .sort((left, right) =>
      stableGroupOrder(left, `${seed}:cross-validation`).localeCompare(
        stableGroupOrder(right, `${seed}:cross-validation`)
      )
    );
  const foldCount = Math.min(requestedFolds, groupIds.length);
  if (foldCount < 2) {
    const emptyCurrent = currentMetrics([]);
    const emptyCandidate = metrics([], {
      stabilityCoverage: 1,
      anchorSufficiency: 0,
      inlierRatio: 0,
      residualQuality: 0,
      dynamicCleanliness: 0,
      structuralSupport: 0
    }, { highMin: 1, mediumMin: 0.5, lowMin: 0 });
    return {
      strategy: "group-k-fold",
      requestedFolds,
      foldCount: 0,
      folds: [],
      currentMetrics: emptyCurrent,
      candidateMetrics: emptyCandidate,
      delta: metricDelta(emptyCurrent, emptyCandidate)
    };
  }
  const validationGroups = Array.from({ length: foldCount }, () => [] as string[]);
  groupIds.forEach((groupId, index) => validationGroups[index % foldCount].push(groupId));
  const folds: PageAlignmentCrossValidationFold[] = [];
  for (const [index, foldValidationGroups] of validationGroups.entries()) {
    const validationSet = new Set(foldValidationGroups);
    const training = samples.filter((sample) => !validationSet.has(sample.groupId));
    const validation = samples.filter((sample) => validationSet.has(sample.groupId));
    if (!hasBothLabels(training) || validation.length === 0) continue;
    const searched = searchCalibration(training, weightStep, thresholdStep);
    const foldCurrentMetrics = currentMetrics(validation);
    const foldCandidateMetrics = metrics(
      validation,
      searched.config.weights,
      searched.config.levels
    );
    folds.push({
      index,
      trainingGroupIds: groupIds.filter((groupId) => !validationSet.has(groupId)),
      validationGroupIds: foldValidationGroups,
      candidateConfig: searched.config,
      currentMetrics: foldCurrentMetrics,
      candidateMetrics: foldCandidateMetrics,
      delta: metricDelta(foldCurrentMetrics, foldCandidateMetrics)
    });
  }
  const aggregateCurrent = combineMetrics(folds.map((fold) => fold.currentMetrics));
  const aggregateCandidate = combineMetrics(folds.map((fold) => fold.candidateMetrics));
  const stability = parameterStability(
    folds,
    minimumStabilityFolds,
    maxWeightStandardDeviation,
    maxThresholdStandardDeviation
  );
  return {
    strategy: "group-k-fold",
    requestedFolds,
    foldCount: folds.length,
    folds,
    currentMetrics: aggregateCurrent,
    candidateMetrics: aggregateCandidate,
    delta: metricDelta(aggregateCurrent, aggregateCandidate),
    ...(stability ? { parameterStability: stability } : {})
  };
}

function unitOption(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a number between 0 and 1.`);
  }
  return value;
}

function signedUnitOption(value: number, name: string): number {
  if (!Number.isFinite(value) || value < -1 || value > 1) {
    throw new Error(`${name} must be a number between -1 and 1.`);
  }
  return value;
}

function recommendationFor(
  stability: PageAlignmentParameterStability | undefined,
  minimumStabilityFolds: number,
  crossValidation: PageAlignmentCrossValidation,
  minimumOofBalancedAccuracyDelta: number,
  maximumOofFalsePositiveRateIncrease: number
): PageAlignmentCalibrationRecommendation {
  const parameterStabilityPassed = stability?.assessment === "stable";
  const balancedAccuracyEvaluated = crossValidation.foldCount > 0;
  const balancedAccuracyDelta = crossValidation.delta.balancedAccuracy;
  const balancedAccuracyPassed = balancedAccuracyEvaluated &&
    balancedAccuracyDelta + METRIC_COMPARISON_EPSILON >= minimumOofBalancedAccuracyDelta;
  const falsePositiveDenominator =
    crossValidation.currentMetrics.confusionMatrix.falsePositive +
    crossValidation.currentMetrics.confusionMatrix.trueNegative;
  const falsePositiveRateEvaluated = crossValidation.foldCount > 0 &&
    falsePositiveDenominator > 0;
  const falsePositiveRate = (metrics: PageAlignmentCalibrationMetrics) => {
    const denominator = metrics.confusionMatrix.falsePositive +
      metrics.confusionMatrix.trueNegative;
    return denominator > 0 ? metrics.confusionMatrix.falsePositive / denominator : 0;
  };
  const currentFalsePositiveRate = falsePositiveRate(crossValidation.currentMetrics);
  const candidateFalsePositiveRate = falsePositiveRate(crossValidation.candidateMetrics);
  const falsePositiveRateDelta = candidateFalsePositiveRate - currentFalsePositiveRate;
  const falsePositiveRatePassed = falsePositiveRateEvaluated &&
    falsePositiveRateDelta <= maximumOofFalsePositiveRateIncrease + METRIC_COMPARISON_EPSILON;
  const gates: PageAlignmentCalibrationRecommendation["gates"] = {
    parameterStability: {
      passed: parameterStabilityPassed,
      assessment: stability?.assessment ?? "insufficient-folds"
    },
    oofBalancedAccuracy: {
      evaluated: balancedAccuracyEvaluated,
      passed: balancedAccuracyPassed,
      current: crossValidation.currentMetrics.balancedAccuracy,
      candidate: crossValidation.candidateMetrics.balancedAccuracy,
      delta: balancedAccuracyDelta,
      minimumDelta: minimumOofBalancedAccuracyDelta
    },
    oofFalsePositiveRate: {
      evaluated: falsePositiveRateEvaluated,
      passed: falsePositiveRatePassed,
      current: currentFalsePositiveRate,
      candidate: candidateFalsePositiveRate,
      delta: falsePositiveRateDelta,
      maximumIncrease: maximumOofFalsePositiveRateIncrease
    }
  };
  const reasons: string[] = [];
  if (!stability || stability.assessment === "insufficient-folds") {
    reasons.push(
      `Insufficient cross-validation folds for stability analysis: ${stability?.foldCount ?? 0} available, ${minimumStabilityFolds} required.`
    );
  } else if (stability.assessment === "unstable") {
    reasons.push(
      `Fold parameter instability exceeds configured limits for: ${stability.unstableParameters.map((parameter) => parameter.name).join(", ")}.`
    );
  }
  if (balancedAccuracyEvaluated && !balancedAccuracyPassed) {
    reasons.push(
        `OOF balanced accuracy delta ${balancedAccuracyDelta.toFixed(4)} is below the required minimum ${minimumOofBalancedAccuracyDelta.toFixed(4)}.`
    );
  }
  if (falsePositiveRateEvaluated && !falsePositiveRatePassed) {
    reasons.push(
      `OOF false-positive rate increase ${falsePositiveRateDelta.toFixed(4)} exceeds the configured maximum ${maximumOofFalsePositiveRateIncrease.toFixed(4)}.`
    );
  }
  if (reasons.length > 0) {
    return { status: "rejected", reasons, gates };
  }
  return {
    status: "recommended",
    reasons: [
      `Fold parameters are stable and both OOF metric gates pass across ${crossValidation.foldCount} folds.`
    ],
    gates
  };
}

function candidateYaml(config: PageAlignmentCalibrationResult["candidateConfig"]): string {
  return yaml.dump({
    page_alignment: {
      confidence: {
        weights: {
          stability_coverage: config.weights.stabilityCoverage,
          anchor_sufficiency: config.weights.anchorSufficiency,
          inlier_ratio: config.weights.inlierRatio,
          residual_quality: config.weights.residualQuality,
          dynamic_cleanliness: config.weights.dynamicCleanliness,
          structural_support: config.weights.structuralSupport
        },
        levels: {
          high_min: config.levels.highMin,
          medium_min: config.levels.mediumMin,
          low_min: config.levels.lowMin
        }
      }
    }
  }, { noRefs: true, lineWidth: -1 });
}

export async function calibratePageAlignmentFromManifest(
  manifestPath: string,
  options: PageAlignmentCalibrationOptions = {}
): Promise<PageAlignmentCalibrationResult> {
  const samples = await loadSamples(path.resolve(manifestPath));
  const weightStep = options.weightStep ?? 0.1;
  const thresholdStep = options.thresholdStep ?? 0.05;
  const validationRatio = options.validationRatio ?? 0.2;
  const seed = options.seed ?? "difflab-page-alignment-v1";
  const split = groupedSplit(samples, validationRatio, seed);
  const trainingSamples = split.training;
  const searched = searchCalibration(trainingSamples, weightStep, thresholdStep);
  const candidateConfig = searched.config;
  const requestedFolds = options.crossValidationFolds ?? 5;
  const minimumStabilityFolds = options.minimumStabilityFolds ?? 3;
  if (!Number.isInteger(minimumStabilityFolds) || minimumStabilityFolds < 2) {
    throw new Error("minimumStabilityFolds must be an integer of at least 2.");
  }
  const maxWeightStandardDeviation = unitOption(
    options.maxWeightStandardDeviation ?? 0.15,
    "maxWeightStandardDeviation"
  );
  const maxThresholdStandardDeviation = unitOption(
    options.maxThresholdStandardDeviation ?? 0.1,
    "maxThresholdStandardDeviation"
  );
  const minimumOofBalancedAccuracyDelta = signedUnitOption(
    options.minimumOofBalancedAccuracyDelta ?? 0,
    "minimumOofBalancedAccuracyDelta"
  );
  const maximumOofFalsePositiveRateIncrease = unitOption(
    options.maximumOofFalsePositiveRateIncrease ?? 0,
    "maximumOofFalsePositiveRateIncrease"
  );
  const crossValidation = crossValidate(
    samples,
    requestedFolds,
    seed,
    weightStep,
    thresholdStep,
    minimumStabilityFolds,
    maxWeightStandardDeviation,
    maxThresholdStandardDeviation
  );
  const trainingComparison = comparison(
    currentMetrics(trainingSamples),
    searched.metrics
  );
  const validationComparison = split.validation.length > 0
    ? comparison(
        currentMetrics(split.validation),
        metrics(split.validation, candidateConfig.weights, candidateConfig.levels)
      )
    : undefined;
  return {
    sampleCount: samples.length,
    candidateConfig,
    candidateYaml: candidateYaml(candidateConfig),
    metrics: searched.metrics,
    samples: samples.map((sample) => {
      const currentScore = score(sample, sample.currentConfig.weights);
      const candidateScore = score(sample, candidateConfig.weights);
      return {
        reviewPath: sample.reviewPath,
        reviewId: sample.reviewId,
        ...(sample.clientPageId ? { clientPageId: sample.clientPageId } : {}),
        regionIndex: sample.regionIndex,
        designParentFigmaNodeId: sample.designParentFigmaNodeId,
        ...(sample.actualParentSelector
          ? { actualParentSelector: sample.actualParentSelector }
          : {}),
        groupId: sample.groupId,
        partition: split.split.validationGroupIds.includes(sample.groupId)
          ? "validation" as const
          : "training" as const,
        label: sample.label,
        baseScoreCap: sample.baseScoreCap,
        componentValues: { ...sample.values },
        currentScore,
        currentLevel: confidenceLevel(currentScore, sample.currentConfig.levels),
        candidateScore,
        candidateLevel: confidenceLevel(candidateScore, candidateConfig.levels)
      };
    }),
    evaluation: {
      split: split.split,
      training: trainingComparison,
      ...(validationComparison ? { validation: validationComparison } : {}),
      crossValidation
    },
    recommendation: recommendationFor(
      crossValidation.parameterStability,
      minimumStabilityFolds,
      crossValidation,
      minimumOofBalancedAccuracyDelta,
      maximumOofFalsePositiveRateIncrease
    ),
    search: {
      weightStep,
      thresholdStep,
      evaluatedCandidates: searched.evaluatedCandidates
    }
  };
}
