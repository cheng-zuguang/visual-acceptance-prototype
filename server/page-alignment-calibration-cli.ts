import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  calibratePageAlignmentFromManifest,
  type PageAlignmentCalibrationOptions
} from "./page-alignment-calibration";

export interface PageAlignmentCalibrationCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

interface ParsedArguments extends PageAlignmentCalibrationOptions {
  labels: string;
  output?: string;
}

function parseArguments(args: string[]): ParsedArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must use --name value pairs.");
    }
    values.set(name, value);
  }
  const labels = values.get("--labels");
  if (!labels) {
    throw new Error(
      "Missing --labels. Usage: npm run calibrate:alignment -- --labels labels.json [--output directory]."
    );
  }
  const numberOption = (name: string): number | undefined => {
    const value = values.get(name);
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number.`);
    return parsed;
  };
  return {
    labels,
    output: values.get("--output"),
    weightStep: numberOption("--weight-step"),
    thresholdStep: numberOption("--threshold-step"),
    validationRatio: numberOption("--validation-ratio"),
    crossValidationFolds: numberOption("--cross-validation-folds"),
    seed: values.get("--seed"),
    maxWeightStandardDeviation: numberOption("--max-weight-stddev"),
    maxThresholdStandardDeviation: numberOption("--max-threshold-stddev"),
    minimumStabilityFolds: numberOption("--minimum-stability-folds"),
    minimumOofBalancedAccuracyDelta: numberOption("--min-oof-balanced-accuracy-delta"),
    maximumOofFalsePositiveRateIncrease: numberOption("--max-oof-false-positive-rate-increase")
  };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export async function runPageAlignmentCalibrationCli(
  args: string[],
  io: PageAlignmentCalibrationCliIo = {
    stdout: (message) => process.stdout.write(`${message}\n`),
    stderr: (message) => process.stderr.write(`${message}\n`)
  }
): Promise<number> {
  try {
    const parsed = parseArguments(args);
    const result = await calibratePageAlignmentFromManifest(parsed.labels, {
      weightStep: parsed.weightStep,
      thresholdStep: parsed.thresholdStep,
      validationRatio: parsed.validationRatio,
      crossValidationFolds: parsed.crossValidationFolds,
      seed: parsed.seed,
      maxWeightStandardDeviation: parsed.maxWeightStandardDeviation,
      maxThresholdStandardDeviation: parsed.maxThresholdStandardDeviation,
      minimumStabilityFolds: parsed.minimumStabilityFolds,
      minimumOofBalancedAccuracyDelta: parsed.minimumOofBalancedAccuracyDelta,
      maximumOofFalsePositiveRateIncrease: parsed.maximumOofFalsePositiveRateIncrease
    });
    io.stdout(`samples: ${result.sampleCount}`);
    io.stdout(`accuracy: ${percent(result.metrics.accuracy)}`);
    io.stdout(`balanced accuracy: ${percent(result.metrics.balancedAccuracy)}`);
    io.stdout(`confusion matrix: ${JSON.stringify(result.metrics.confusionMatrix)}`);
    io.stdout(
      `training current → candidate: ${percent(result.evaluation.training.current.accuracy)} → ${percent(result.evaluation.training.candidate.accuracy)} (Δ ${percent(result.evaluation.training.delta.accuracy)})`
    );
    if (result.evaluation.validation) {
      io.stdout(
        `validation current → candidate: ${percent(result.evaluation.validation.current.accuracy)} → ${percent(result.evaluation.validation.candidate.accuracy)} (Δ ${percent(result.evaluation.validation.delta.accuracy)})`
      );
    }
    if (result.evaluation.crossValidation.foldCount > 0) {
      io.stdout(
        `cross-validation current → candidate: ${percent(result.evaluation.crossValidation.currentMetrics.accuracy)} → ${percent(result.evaluation.crossValidation.candidateMetrics.accuracy)} (Δ ${percent(result.evaluation.crossValidation.delta.accuracy)})`
      );
    }
    const stability = result.evaluation.crossValidation.parameterStability;
    if (stability) {
      io.stdout(`parameter stability: ${stability.assessment} (${stability.foldCount} folds)`);
      for (const parameter of stability.unstableParameters) {
        io.stdout(
          `unstable ${parameter.kind} ${parameter.name}: stddev ${parameter.standardDeviation.toFixed(4)} > ${parameter.maximumStandardDeviation.toFixed(4)}`
        );
      }
    }
    const balancedAccuracyGate = result.recommendation.gates.oofBalancedAccuracy;
    const gateStatus = (evaluated: boolean, passed: boolean) =>
      evaluated ? (passed ? "passed" : "failed") : "not evaluated";
    io.stdout(
      `OOF balanced accuracy gate: ${gateStatus(balancedAccuracyGate.evaluated, balancedAccuracyGate.passed)} (current ${percent(balancedAccuracyGate.current)}, candidate ${percent(balancedAccuracyGate.candidate)}, Δ ${percent(balancedAccuracyGate.delta)}, minimum Δ ${percent(balancedAccuracyGate.minimumDelta)})`
    );
    const falsePositiveRateGate = result.recommendation.gates.oofFalsePositiveRate;
    io.stdout(
      `OOF false-positive rate gate: ${gateStatus(falsePositiveRateGate.evaluated, falsePositiveRateGate.passed)} (current ${percent(falsePositiveRateGate.current)}, candidate ${percent(falsePositiveRateGate.candidate)}, Δ ${percent(falsePositiveRateGate.delta)}, maximum increase ${percent(falsePositiveRateGate.maximumIncrease)})`
    );
    io.stdout(`recommendation: ${result.recommendation.status}`);
    for (const reason of result.recommendation.reasons) {
      io.stdout(`recommendation reason: ${reason}`);
    }

    if (parsed.output) {
      const outputDirectory = path.resolve(parsed.output);
      await mkdir(outputDirectory, { recursive: true });
      const candidatePath = path.join(outputDirectory, "page-alignment-candidate.yaml");
      if (result.recommendation.status === "recommended") {
        await writeFile(candidatePath, result.candidateYaml, "utf8");
      } else {
        await rm(candidatePath, { force: true });
      }
      await writeFile(
        path.join(outputDirectory, "page-alignment-metrics.json"),
        `${JSON.stringify({
          sampleCount: result.sampleCount,
          candidateConfig: result.candidateConfig,
          metrics: result.metrics,
          samples: result.samples,
          evaluation: result.evaluation,
          recommendation: result.recommendation,
          search: result.search
        }, null, 2)}\n`,
        "utf8"
      );
      io.stdout(`artifacts: ${outputDirectory}`);
    } else {
      io.stdout("");
      if (result.recommendation.status === "recommended") {
        io.stdout(result.candidateYaml.trimEnd());
      }
    }
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  process.exitCode = await runPageAlignmentCalibrationCli(process.argv.slice(2));
}
