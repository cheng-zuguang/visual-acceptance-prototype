import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseAcceptanceYaml } from "./default-rules";
import { calibratePageAlignmentFromManifest } from "./page-alignment-calibration";
import { runPageAlignmentCalibrationCli } from "./page-alignment-calibration-cli";

const componentNames = [
  "stabilityCoverage",
  "anchorSufficiency",
  "inlierRatio",
  "residualQuality",
  "dynamicCleanliness",
  "structuralSupport"
] as const;

const defaultCurrentConfidence = parseAcceptanceYaml().pageAlignment.confidence;

function singleComponentWeights(index: number): typeof defaultCurrentConfidence.weights {
  return {
    stabilityCoverage: index === 0 ? 1 : 0,
    anchorSufficiency: index === 1 ? 1 : 0,
    inlierRatio: index === 2 ? 1 : 0,
    residualQuality: index === 3 ? 1 : 0,
    dynamicCleanliness: index === 4 ? 1 : 0,
    structuralSupport: index === 5 ? 1 : 0
  };
}

function review(
  id: string,
  regionId: string,
  values: number[],
  currentConfidence = defaultCurrentConfidence
) {
  const weightedScore = componentNames.reduce(
    (sum, name, index) => sum + values[index] * currentConfidence.weights[name],
    0
  );
  return {
    id,
    matching: {
      pageAlignment: {
        regions: [{
          designParentFigmaNodeId: regionId,
          scoreBreakdown: {
            baseScoreCap: 1,
            components: Object.fromEntries(componentNames.map((name, index) => [
              name,
              {
                value: values[index],
                weight: currentConfidence.weights[name],
                contribution: values[index] * currentConfidence.weights[name]
              }
            ])),
            weightedScore,
            finalScore: Math.round(weightedScore * 100) / 100,
            levelThresholds: currentConfidence.levels
          }
        }]
      }
    }
  };
}

test("calibrates page-alignment confidence from labeled Review JSON", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  await writeFile(
    path.join(directory, "correct.json"),
    JSON.stringify(review("review-correct", "module-correct", [1, 1, 1, 1, 1, 1]))
  );
  await writeFile(
    path.join(directory, "false-positive.json"),
    JSON.stringify(review("review-false", "module-false", [0, 0, 0, 0, 0, 0]))
  );
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [
      {
        review: "./correct.json",
        labels: [{ designParentFigmaNodeId: "module-correct", label: "correct" }]
      },
      {
        review: "./false-positive.json",
        labels: [{ designParentFigmaNodeId: "module-false", label: "false_positive" }]
      }
    ]
  }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5
  });

  assert.equal(result.metrics.accuracy, 1);
  assert.deepEqual(result.metrics.confusionMatrix, {
    truePositive: 1,
    trueNegative: 1,
    falsePositive: 0,
    falseNegative: 0
  });
  assert.equal(result.sampleCount, 2);
  assert.deepEqual(result.samples.map((sample) => ({
    reviewId: sample.reviewId,
    designParentFigmaNodeId: sample.designParentFigmaNodeId,
    label: sample.label,
    candidateScore: sample.candidateScore,
    candidateLevel: sample.candidateLevel
  })), [
    {
      reviewId: "review-correct",
      designParentFigmaNodeId: "module-correct",
      label: "correct",
      candidateScore: 1,
      candidateLevel: "high"
    },
    {
      reviewId: "review-false",
      designParentFigmaNodeId: "module-false",
      label: "false_positive",
      candidateScore: 0,
      candidateLevel: "low"
    }
  ]);
  assert.match(result.candidateYaml, /^page_alignment:/m);
  assert.deepEqual(
    parseAcceptanceYaml(result.candidateYaml).pageAlignment.confidence,
    result.candidateConfig
  );
});

test("searches the six component weights instead of only moving the threshold", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  await writeFile(
    path.join(directory, "review.json"),
    JSON.stringify({
      id: "review-weight-search",
      matching: {
        pageAlignment: {
          regions: [
            review("unused", "correct", [1, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0],
            review("unused", "false", [0, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0]
          ]
        }
      }
    })
  );
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [{
      review: "./review.json",
      labels: [
        { designParentFigmaNodeId: "correct", label: "correct" },
        { designParentFigmaNodeId: "false", label: "false_positive" }
      ]
    }]
  }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5
  });

  assert.equal(result.metrics.accuracy, 1);
  assert.equal(result.candidateConfig.weights.stabilityCoverage, 1);
  assert.equal(
    Object.values(result.candidateConfig.weights).reduce((sum, value) => sum + value, 0),
    1
  );
  assert.equal(result.metrics.balancedAccuracy, 1);
  assert.equal(result.metrics.precision, 1);
  assert.equal(result.metrics.recall, 1);
  assert.equal(result.metrics.specificity, 1);
  assert.deepEqual(result.metrics.levelConfusionMatrix, {
    correct: { high: 1, medium: 0, low: 0 },
    false_positive: { high: 0, medium: 0, low: 1 }
  });
  assert.ok(result.search.evaluatedCandidates > 0);
  assert.equal(result.candidateConfig.levels.lowMin, 0);
  assert.ok(result.candidateConfig.levels.highMin > result.candidateConfig.levels.mediumMin);
});

test("rejects a calibration set that does not contain both manual labels", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  await writeFile(
    path.join(directory, "review.json"),
    JSON.stringify(review("review-one-class", "only-correct", [1, 1, 1, 1, 1, 1]))
  );
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [{
      review: "./review.json",
      labels: [{ designParentFigmaNodeId: "only-correct", label: "correct" }]
    }]
  }));

  await assert.rejects(
    calibratePageAlignmentFromManifest(manifestPath),
    /at least one correct and one false_positive/
  );
});

test("CLI withholds the candidate YAML when stability evidence is insufficient", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  await writeFile(
    path.join(directory, "review.json"),
    JSON.stringify({
      id: "review-cli",
      matching: {
        pageAlignment: {
          regions: [
            review("unused", "correct", [1, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0],
            review("unused", "false", [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
          ]
        }
      }
    })
  );
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [{
      review: "./review.json",
      labels: [
        { designParentFigmaNodeId: "correct", label: "correct" },
        { designParentFigmaNodeId: "false", label: "false_positive" }
      ]
    }]
  }));
  const productionRulesPath = path.join(directory, "acceptance.yaml");
  await writeFile(productionRulesPath, "production: unchanged\n");
  const outputDirectory = path.join(directory, "calibration-output");
  const stdout: string[] = [];

  const exitCode = await runPageAlignmentCalibrationCli([
    "--labels", manifestPath,
    "--output", outputDirectory,
    "--weight-step", "0.5",
    "--threshold-step", "0.5",
    "--validation-ratio", "0",
    "--cross-validation-folds", "0",
    "--seed", "cli-test"
  ], {
    stdout: (message) => stdout.push(message),
    stderr: () => undefined
  });

  assert.equal(exitCode, 0);
  await assert.rejects(
    readFile(path.join(outputDirectory, "page-alignment-candidate.yaml"), "utf8"),
    /ENOENT/
  );
  const metrics = JSON.parse(
    await readFile(path.join(outputDirectory, "page-alignment-metrics.json"), "utf8")
  );
  assert.equal(metrics.metrics.accuracy, 1);
  assert.equal(metrics.evaluation.training.current.accuracy, 1);
  assert.equal(metrics.evaluation.training.candidate.accuracy, 1);
  assert.equal(metrics.evaluation.training.delta.accuracy, 0);
  assert.equal(metrics.evaluation.crossValidation.foldCount, 0);
  assert.equal(metrics.recommendation.status, "rejected");
  assert.equal(await readFile(productionRulesPath, "utf8"), "production: unchanged\n");
  assert.match(stdout.join("\n"), /accuracy: 100\.00%/);
  assert.match(stdout.join("\n"), /training current → candidate: 100\.00% → 100\.00%/);
  assert.match(stdout.join("\n"), /recommendation: rejected/);
});

test("CLI publishes the candidate YAML after fold parameter stability passes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  for (const frameId of ["cli-stable-a", "cli-stable-b", "cli-stable-c"]) {
    const filename = `${frameId}.json`;
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, [1, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));
  const outputDirectory = path.join(directory, "output");
  const stdout: string[] = [];

  const exitCode = await runPageAlignmentCalibrationCli([
    "--labels", manifestPath,
    "--output", outputDirectory,
    "--weight-step", "0.5",
    "--threshold-step", "0.5",
    "--validation-ratio", "0",
    "--cross-validation-folds", "3",
    "--minimum-stability-folds", "3",
    "--min-oof-balanced-accuracy-delta", "0",
    "--max-oof-false-positive-rate-increase", "0",
    "--seed", "cli-stable"
  ], {
    stdout: (message) => stdout.push(message),
    stderr: () => undefined
  });

  assert.equal(exitCode, 0);
  assert.match(
    await readFile(path.join(outputDirectory, "page-alignment-candidate.yaml"), "utf8"),
    /^page_alignment:/m
  );
  assert.match(stdout.join("\n"), /parameter stability: stable \(3 folds\)/);
  assert.match(stdout.join("\n"), /OOF balanced accuracy gate: passed/);
  assert.match(stdout.join("\n"), /OOF false-positive rate gate: passed/);
  assert.match(stdout.join("\n"), /recommendation: recommended/);
  const metrics = JSON.parse(
    await readFile(path.join(outputDirectory, "page-alignment-metrics.json"), "utf8")
  );
  assert.equal(metrics.recommendation.gates.oofBalancedAccuracy.passed, true);
  assert.equal(metrics.recommendation.gates.oofFalsePositiveRate.passed, true);
});

test("reads labeled regions from a multi-PagePair Review JSON", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  await writeFile(path.join(directory, "batch.json"), JSON.stringify({
    reviewName: "batch-review",
    pages: [
      {
        clientPageId: "market-home",
        executionStatus: "succeeded",
        report: review("home-report", "shared-module", [1, 1, 1, 1, 1, 1])
      },
      {
        clientPageId: "market-detail",
        executionStatus: "succeeded",
        report: review("detail-report", "shared-module", [0, 0, 0, 0, 0, 0])
      }
    ]
  }));
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [{
      review: "./batch.json",
      labels: [
        {
          clientPageId: "market-home",
          designParentFigmaNodeId: "shared-module",
          label: "correct"
        },
        {
          clientPageId: "market-detail",
          designParentFigmaNodeId: "shared-module",
          label: "false_positive"
        }
      ]
    }]
  }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5
  });

  assert.equal(result.sampleCount, 2);
  assert.equal(result.metrics.accuracy, 1);
});

test("uses regionIndex to disambiguate repeated modules in a long-screenshot report", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  await writeFile(path.join(directory, "long.json"), JSON.stringify({
    id: "review-long",
    matching: {
      pageAlignment: {
        regions: [
          review("unused", "repeated-module", [1, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0],
          review("unused", "repeated-module", [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
        ]
      }
    }
  }));
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [{
      review: "./long.json",
      labels: [
        {
          regionIndex: 0,
          designParentFigmaNodeId: "repeated-module",
          label: "correct"
        },
        {
          regionIndex: 1,
          designParentFigmaNodeId: "repeated-module",
          label: "false_positive"
        }
      ]
    }]
  }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5
  });

  assert.equal(result.sampleCount, 2);
  assert.equal(result.metrics.accuracy, 1);
});

test("keeps every Page/Frame group wholly in either training or validation", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  for (const frameId of ["frame-a", "frame-b", "frame-c", "frame-d"]) {
    const filename = `${frameId}.json`;
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, [1, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        {
          frameId,
          designParentFigmaNodeId: `${frameId}-correct`,
          label: "correct"
        },
        {
          frameId,
          designParentFigmaNodeId: `${frameId}-false`,
          label: "false_positive"
        }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0.5,
    seed: "group-split"
  });

  assert.equal(result.evaluation.split.strategy, "page-frame-grouped");
  assert.equal(result.evaluation.split.trainingGroupIds.length, 2);
  assert.equal(result.evaluation.split.validationGroupIds.length, 2);
  assert.deepEqual(
    result.evaluation.split.trainingGroupIds.filter((groupId) =>
      result.evaluation.split.validationGroupIds.includes(groupId)
    ),
    []
  );
  for (const groupId of [
    ...result.evaluation.split.trainingGroupIds,
    ...result.evaluation.split.validationGroupIds
  ]) {
    const partitions = new Set(
      result.samples.filter((sample) => sample.groupId === groupId).map((sample) => sample.partition)
    );
    assert.equal(partitions.size, 1);
  }
  assert.equal(result.evaluation.split.trainingSampleCount, 4);
  assert.equal(result.evaluation.split.validationSampleCount, 4);
});

test("runs group k-fold cross-validation without leaking a Page/Frame across a fold", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  for (const frameId of ["frame-one", "frame-two", "frame-three"]) {
    const filename = `${frameId}.json`;
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, [1, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0,
    crossValidationFolds: 3,
    seed: "group-folds"
  });

  assert.equal(result.evaluation.crossValidation.strategy, "group-k-fold");
  assert.equal(result.evaluation.crossValidation.foldCount, 3);
  const validationGroups = result.evaluation.crossValidation.folds.flatMap(
    (fold) => fold.validationGroupIds
  );
  assert.equal(new Set(validationGroups).size, 3);
  for (const fold of result.evaluation.crossValidation.folds) {
    assert.deepEqual(
      fold.trainingGroupIds.filter((groupId) => fold.validationGroupIds.includes(groupId)),
      []
    );
  }
  const matrix = result.evaluation.crossValidation.candidateMetrics.confusionMatrix;
  assert.equal(
    matrix.truePositive + matrix.trueNegative + matrix.falsePositive + matrix.falseNegative,
    6
  );
});

test("reports stable fold parameter statistics when every Page/Frame supports the same candidate", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  for (const frameId of ["stable-one", "stable-two", "stable-three"]) {
    const filename = `${frameId}.json`;
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, [1, 1, 1, 1, 1, 1]).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0,
    crossValidationFolds: 3,
    seed: "stable-parameters"
  });

  const stability = result.evaluation.crossValidation.parameterStability;
  assert.ok(stability);
  assert.equal(stability.foldCount, 3);
  for (const parameter of [
    ...Object.values(stability.weights),
    ...Object.values(stability.thresholds)
  ]) {
    assert.equal(parameter.variance, 0);
    assert.equal(parameter.standardDeviation, 0);
    assert.deepEqual(parameter.confidenceInterval95, {
      lower: parameter.mean,
      upper: parameter.mean
    });
  }
});

test("rejects a candidate recommendation when fold parameters vary beyond the configured limit", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  const signals = [
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0]
  ];
  for (const [index, signal] of signals.entries()) {
    const frameId = `unstable-${index + 1}`;
    const filename = `${frameId}.json`;
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, signal).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, [0, 0, 0, 0, 0, 0]).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0,
    crossValidationFolds: 4,
    seed: "unstable-parameters",
    maxWeightStandardDeviation: 0.01,
    maxThresholdStandardDeviation: 0.01,
    minimumStabilityFolds: 3
  });

  assert.equal(result.recommendation.status, "rejected");
  assert.match(result.recommendation.reasons.join("\n"), /fold parameter instability/i);
  const stability = result.evaluation.crossValidation.parameterStability;
  assert.ok(stability);
  assert.equal(stability.assessment, "unstable");
  assert.ok(stability.unstableParameters.some((parameter) => parameter.kind === "weight"));
});

test("rejects a stable candidate when OOF balanced accuracy regresses", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  const signals = [
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0]
  ];
  for (const [index, signal] of signals.entries()) {
    const frameId = `balanced-regression-${index + 1}`;
    const filename = `${frameId}.json`;
    const currentWeights = singleComponentWeights(index);
    const currentConfidence = {
      weights: currentWeights,
      levels: { highMin: 0.5, mediumMin: 0, lowMin: 0 }
    };
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, signal, currentConfidence).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, [0, 0, 0, 0, 0, 0], currentConfidence).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0,
    crossValidationFolds: 3,
    minimumStabilityFolds: 3,
    maxWeightStandardDeviation: 1,
    maxThresholdStandardDeviation: 1,
    minimumOofBalancedAccuracyDelta: 0,
    seed: "balanced-regression"
  });

  assert.equal(result.evaluation.crossValidation.parameterStability?.assessment, "stable");
  assert.ok(
    result.evaluation.crossValidation.candidateMetrics.balancedAccuracy <
      result.evaluation.crossValidation.currentMetrics.balancedAccuracy
  );
  assert.equal(result.recommendation.status, "rejected");
  assert.equal(result.recommendation.gates.oofBalancedAccuracy.passed, false);
  assert.equal(result.recommendation.gates.oofBalancedAccuracy.minimumDelta, 0);
  assert.ok(result.recommendation.gates.oofBalancedAccuracy.delta < 0);
  assert.match(result.recommendation.reasons.join("\n"), /OOF balanced accuracy/i);
});

test("rejects a stable candidate when its OOF false-positive rate increases", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const reviews = [];
  const signals = [
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0]
  ];
  for (const [index, signal] of signals.entries()) {
    const frameId = `false-positive-regression-${index + 1}`;
    const filename = `${frameId}.json`;
    const currentWeights = singleComponentWeights(index);
    const currentConfidence = {
      weights: currentWeights,
      levels: { highMin: 0.5, mediumMin: 0, lowMin: 0 }
    };
    const falsePositiveSignal = signals[(index + 1) % signals.length];
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review("unused", `${frameId}-correct`, signal, currentConfidence).matching.pageAlignment.regions[0],
            review("unused", `${frameId}-false`, falsePositiveSignal, currentConfidence).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0,
    crossValidationFolds: 3,
    minimumStabilityFolds: 3,
    maxWeightStandardDeviation: 1,
    maxThresholdStandardDeviation: 1,
    minimumOofBalancedAccuracyDelta: -1,
    maximumOofFalsePositiveRateIncrease: 0,
    seed: "false-positive-regression"
  });

  const gate = result.recommendation.gates.oofFalsePositiveRate;
  assert.equal(result.evaluation.crossValidation.parameterStability?.assessment, "stable");
  assert.equal(gate.passed, false);
  assert.equal(gate.current, 0);
  assert.ok(gate.candidate > 0);
  assert.ok(gate.delta > 0);
  assert.equal(gate.maximumIncrease, 0);
  assert.equal(result.recommendation.status, "rejected");
  assert.match(result.recommendation.reasons.join("\n"), /OOF false-positive rate/i);
});

test("reports current-versus-candidate metric deltas on training, validation, and folds", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-calibration-"));
  const currentConfidence = {
    weights: {
      stabilityCoverage: 0,
      anchorSufficiency: 0,
      inlierRatio: 0,
      residualQuality: 0,
      dynamicCleanliness: 0,
      structuralSupport: 1
    },
    levels: { highMin: 0.5, mediumMin: 0, lowMin: 0 }
  };
  const reviews = [];
  for (const frameId of ["delta-a", "delta-b", "delta-c", "delta-d"]) {
    const filename = `${frameId}.json`;
    await writeFile(path.join(directory, filename), JSON.stringify({
      id: `review-${frameId}`,
      matching: {
        pageAlignment: {
          regions: [
            review(
              "unused",
              `${frameId}-correct`,
              [1, 0, 0, 0, 0, 0],
              currentConfidence
            ).matching.pageAlignment.regions[0],
            review(
              "unused",
              `${frameId}-false`,
              [0, 0, 0, 0, 0, 1],
              currentConfidence
            ).matching.pageAlignment.regions[0]
          ]
        }
      }
    }));
    reviews.push({
      review: `./${filename}`,
      labels: [
        { frameId, designParentFigmaNodeId: `${frameId}-correct`, label: "correct" },
        { frameId, designParentFigmaNodeId: `${frameId}-false`, label: "false_positive" }
      ]
    });
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({ version: 1, reviews }));

  const result = await calibratePageAlignmentFromManifest(manifestPath, {
    weightStep: 0.5,
    thresholdStep: 0.5,
    validationRatio: 0.5,
    crossValidationFolds: 2,
    seed: "metric-delta"
  });

  assert.equal(result.evaluation.training.current.accuracy, 0);
  assert.equal(result.evaluation.training.candidate.accuracy, 1);
  assert.equal(result.evaluation.training.delta.accuracy, 1);
  assert.equal(result.evaluation.validation?.current.accuracy, 0);
  assert.equal(result.evaluation.validation?.candidate.accuracy, 1);
  assert.equal(result.evaluation.validation?.delta.accuracy, 1);
  assert.equal(result.evaluation.crossValidation.currentMetrics.accuracy, 0);
  assert.equal(result.evaluation.crossValidation.candidateMetrics.accuracy, 1);
  assert.equal(result.evaluation.crossValidation.delta.accuracy, 1);
  assert.equal(
    result.evaluation.validation?.delta.confusionMatrix.falsePositive,
    -2
  );
});
