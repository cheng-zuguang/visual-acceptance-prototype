import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseAcceptanceYaml } from "./default-rules";
import { calibrateMissingModulesFromManifest } from "./missing-module-calibration";
import { runMissingModuleCalibrationCli } from "./missing-module-calibration-cli";

test("missing-module calibration CLI requires an exported label manifest", async () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const exitCode = await runMissingModuleCalibrationCli([], {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message)
  });

  assert.equal(exitCode, 1);
  assert.equal(stdout.length, 0);
  assert.match(stderr.join("\n"), /--labels/);
});

test("calibrates missing-module residual and horizontal-overlap thresholds", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-missing-module-calibration-"));
  const reviewPath = path.join(directory, "review.json");
  const candidate = (
    figmaNodeId: string,
    regionIndex: number,
    horizontalOverlapRatio: number,
    residualRatio: number
  ) => ({
    candidateId: `missing-module:${figmaNodeId}:${regionIndex}`,
    regionIndex,
    figmaNodeId,
    designPath: ["页面", figmaNodeId],
    topology: "interior",
    precedingRegionId: "before",
    followingRegionId: "after",
    designBox: { x: 0, y: 0, width: 100, height: 100 },
    designFlowGapPx: 100,
    displacementStepPx: 100 - residualRatio * 100,
    residualPx: residualRatio * 100,
    residualRatio,
    horizontalOverlapRatio,
    published: horizontalOverlapRatio >= 0.5 && residualRatio <= 0.15,
    rejectionReasons: [],
    thresholds: {
      positionTolerancePx: 4,
      minimumHorizontalOverlapRatio: 0.5,
      maximumResidualRatio: 0.15
    }
  });
  await writeFile(reviewPath, JSON.stringify({
    source: { design: "Figma · Demo · 0:72", actual: "https://example.com/fed" },
    matching: {
      missingModules: {
        evaluatedCount: 4,
        publishedCount: 2,
        candidates: [
          candidate("correct-overlap", 0, 0.55, 0.1),
          candidate("false-overlap", 1, 0.52, 0.02),
          candidate("correct-residual", 2, 0.7, 0.2),
          candidate("false-both", 3, 0.3, 0.3)
        ]
      }
    }
  }, null, 2));
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: [{
      review: "./review.json",
      labels: [{
        frameId: "0:72",
        designParentFigmaNodeId: "correct-overlap",
        regionIndex: 0,
        label: "correct"
      }, {
        frameId: "0:72",
        designParentFigmaNodeId: "false-overlap",
        regionIndex: 1,
        label: "false_positive"
      }, {
        frameId: "0:72",
        designParentFigmaNodeId: "correct-residual",
        regionIndex: 2,
        label: "correct"
      }, {
        frameId: "0:72",
        designParentFigmaNodeId: "false-both",
        regionIndex: 3,
        label: "false_positive"
      }]
    }]
  }, null, 2));

  const result = await calibrateMissingModulesFromManifest(manifestPath, {
    horizontalOverlapCandidates: [0.5, 0.55, 0.6],
    residualRatioCandidates: [0.15, 0.2, 0.25]
  });

  assert.deepEqual(result.current.thresholds, {
    minimumHorizontalOverlapRatio: 0.5,
    maximumResidualRatio: 0.15
  });
  assert.equal(result.current.metrics.accuracy, 0.5);
  assert.deepEqual(result.candidate.thresholds, {
    minimumHorizontalOverlapRatio: 0.55,
    maximumResidualRatio: 0.2
  });
  assert.deepEqual(result.candidate.metrics.confusionMatrix, {
    truePositive: 2,
    trueNegative: 2,
    falsePositive: 0,
    falseNegative: 0
  });
  assert.equal(result.candidate.metrics.accuracy, 1);
  assert.deepEqual(parseAcceptanceYaml(result.candidateYaml).pageAlignment.missingModule, {
    minimumHorizontalOverlapRatio: 0.55,
    maximumResidualRatio: 0.2
  });
  assert.equal(result.recommendation.accepted, false);
  assert.match(result.recommendation.reasons.join("\n"), /at least 3 Page\/Frame groups/i);
});

test("calibrates three frame groups while retaining a structurally blocked false positive", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-missing-module-frames-"));
  const candidate = (
    figmaNodeId: string,
    values: Partial<{
      horizontalOverlapRatio: number;
      designFlowGapPx: number;
      displacementStepPx: number;
      residualPx: number;
      residualRatio: number;
    }>,
    rejectionReasons: string[] = []
  ) => ({
    candidateId: `missing-module:${figmaNodeId}:0`,
    regionIndex: 0,
    figmaNodeId,
    designPath: ["页面", figmaNodeId],
    topology: rejectionReasons.includes("missing-preceding-anchor") ? "unsupported" : "interior",
    designBox: { x: 0, y: 0, width: 100, height: 100 },
    ...values,
    published: false,
    rejectionReasons,
    thresholds: {
      positionTolerancePx: 4,
      minimumHorizontalOverlapRatio: 0.5,
      maximumResidualRatio: 0.15
    }
  });
  const reviews = [{
    frameId: "frame-a",
    label: "correct",
    candidate: candidate("poll", {
      horizontalOverlapRatio: 1,
      designFlowGapPx: 100,
      displacementStepPx: 80,
      residualPx: 20,
      residualRatio: 0.2
    }, ["residual-too-high"])
  }, {
    frameId: "frame-b",
    label: "false_positive",
    candidate: candidate("native-navigation", {
      horizontalOverlapRatio: 1
    }, ["missing-preceding-anchor"])
  }, {
    frameId: "frame-c",
    label: "false_positive",
    candidate: candidate("narrow-card", {
      horizontalOverlapRatio: 0.45,
      designFlowGapPx: 100,
      displacementStepPx: 90,
      residualPx: 10,
      residualRatio: 0.1
    }, ["insufficient-horizontal-overlap"])
  }] as const;
  for (const review of reviews) {
    await writeFile(path.join(directory, `${review.frameId}.json`), JSON.stringify({
      source: { design: `Figma · Demo · ${review.frameId}`, actual: "https://example.com/fed" },
      matching: {
        missingModules: {
          evaluatedCount: 1,
          publishedCount: 0,
          candidates: [review.candidate]
        }
      }
    }, null, 2));
  }
  const manifestPath = path.join(directory, "labels.json");
  await writeFile(manifestPath, JSON.stringify({
    version: 1,
    reviews: reviews.map((review) => ({
      review: `./${review.frameId}.json`,
      labels: [{
        frameId: review.frameId,
        designParentFigmaNodeId: review.candidate.figmaNodeId,
        regionIndex: 0,
        label: review.label
      }]
    }))
  }, null, 2));

  const result = await calibrateMissingModulesFromManifest(manifestPath, {
    horizontalOverlapCandidates: [0.45, 0.5],
    residualRatioCandidates: [0.15, 0.2]
  });

  assert.equal(result.groupCount, 3);
  assert.deepEqual(result.candidate.thresholds, {
    minimumHorizontalOverlapRatio: 0.5,
    maximumResidualRatio: 0.2
  });
  assert.deepEqual(result.candidate.metrics.confusionMatrix, {
    truePositive: 1,
    trueNegative: 2,
    falsePositive: 0,
    falseNegative: 0
  });
  assert.equal(result.recommendation.accepted, true);
});
