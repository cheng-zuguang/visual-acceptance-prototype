import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateFinancialGoldSet,
  writeMissingModuleCalibrationManifest,
  writePageAlignmentCalibrationManifest
} from "./financial-gold-set";
import { runFinancialGoldSetCli } from "./financial-gold-set-cli";

test("accepts an approved reusable financial H5 gold set with complete evidence coverage", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  await mkdir(path.join(directory, "reviews"));
  await mkdir(path.join(directory, "screenshots"));
  for (const name of ["live", "screenshot", "hybrid"]) {
    await writeFile(path.join(directory, "reviews", `${name}.json`), JSON.stringify({
      source: {
        design: `Figma · Demo · 0:${name.length}`,
        actual: name === "screenshot" ? "uploaded screenshot" : `https://example.com/${name}`
      },
      evidenceMode: name,
      viewport: { width: 375, height: 812 }
    }));
  }
  await writeFile(path.join(directory, "screenshots", "screenshot.png"), "image");
  await writeFile(path.join(directory, "screenshots", "hybrid.png"), "image");

  const approved = {
    status: "approved",
    reviewer: "designer-a",
    reviewedAt: "2026-09-10T10:00:00.000Z"
  };
  const dataPolicy = { classification: "sanitized", reusableInTests: true };
  const issue = (id: string) => ({
    id,
    location: "利率观察/概率表",
    category: "position",
    designValue: "左边距 16px",
    actualValue: "左边距 20px",
    priority: "P1"
  });
  const sample = (
    id: string,
    mode: "live" | "screenshot" | "hybrid",
    coverage: string[]
  ) => ({
    id,
    pageFrameGroupId: `frame-${id}`,
    approval: approved,
    dataPolicy,
    design: {
      figmaUrl: `https://www.figma.com/design/file/demo?node-id=0-${id.length}`,
      frameId: `0:${id.length}`
    },
    actual: {
      mode,
      ...(mode !== "screenshot" ? { h5Url: `https://example.com/${id}` } : {}),
      ...(mode !== "live" ? { screenshots: [`./screenshots/${mode}.png`] } : {}),
      viewport: { width: 375, height: 812, dpr: 3 }
    },
    reviewJson: `./reviews/${mode}.json`,
    coverage,
    expectedIssues: [issue(`${id}-issue-1`)],
    pageAlignmentLabels: [{
      designParentFigmaNodeId: `${id}-correct`,
      label: "correct"
    }, {
      designParentFigmaNodeId: `${id}-false-positive`,
      label: "false_positive"
    }],
    allowedDynamics: [{
      id: `${id}-dynamic-1`,
      location: "利率观察/最新概率",
      type: "market-value",
      reason: "实时行情数值允许变化，但布局和样式必须保持稳定"
    }]
  });
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "financial-h5-v1",
    samples: [
      sample("live", "live", ["market-value", "async-loading", "static-region"]),
      sample("screenshot", "screenshot", ["market-list", "market-variant-up"]),
      sample("hybrid", "hybrid", [
        "market-variant-down",
        "market-variant-flat"
      ])
    ]
  }, null, 2));

  const result = await validateFinancialGoldSet(manifestPath);

  assert.equal(result.valid, true);
  assert.equal(result.readiness, "ready-for-calibration");
  assert.deepEqual(result.coverage.missingModes, []);
  assert.deepEqual(result.coverage.missingScenarios, []);
  assert.equal(result.summary.approvedSamples, 3);
  assert.equal(result.summary.reusableSamples, 3);
});

test("rejects a reusable sample that leaks credentials or references evidence outside the dataset", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  const directory = path.join(root, "dataset");
  await mkdir(directory);
  await writeFile(path.join(root, "outside-review.json"), "{}\\n");
  await writeFile(path.join(directory, "screen.png"), "image");
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "unsafe-financial-h5",
    samples: [{
      id: "unsafe-hybrid",
      pageFrameGroupId: "frame-unsafe",
      approval: {
        status: "approved",
        reviewer: "designer-a",
        reviewedAt: "2026-09-10T10:00:00.000Z"
      },
      dataPolicy: { classification: "sanitized", reusableInTests: true },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-1&access_token=secret",
        frameId: "0:1"
      },
      actual: {
        mode: "hybrid",
        h5Url: "https://example.com/market?api_key=secret",
        screenshots: ["./screen.png"],
        viewport: { width: 375, height: 812, dpr: 3 }
      },
      reviewJson: "../outside-review.json",
      coverage: ["market-value"],
      expectedIssues: [],
      allowedDynamics: []
    }]
  }, null, 2));

  const result = await validateFinancialGoldSet(manifestPath);

  assert.equal(result.valid, false);
  assert.equal(result.readiness, "invalid");
  assert.match(result.errors.join("\n"), /outside the dataset directory/i);
  assert.match(result.errors.join("\n"), /credential-like query parameter/i);
});

test("keeps draft samples and implicit dynamic allowances out of the calibration-ready set", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "financial-h5-draft",
    samples: [{
      id: "draft-live",
      pageFrameGroupId: "fed-observer",
      approval: { status: "draft" },
      dataPolicy: { classification: "sanitized", reusableInTests: true },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-72",
        frameId: "0:72"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/fed",
        viewport: { width: 375, height: 812, dpr: 3 }
      },
      coverage: ["market-value"],
      expectedIssues: [],
      allowedDynamics: []
    }]
  }, null, 2));

  const result = await validateFinancialGoldSet(manifestPath);

  assert.equal(result.valid, true);
  assert.equal(result.readiness, "needs-human-review");
  assert.equal(result.summary.approvedSamples, 0);
  assert.match(result.warnings.join("\n"), /designer approval/i);
  assert.match(result.warnings.join("\n"), /Review JSON/i);
  assert.match(result.warnings.join("\n"), /allowed dynamic/i);
});

test("exports only designer-approved reusable alignment labels with paths relative to the output", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  await mkdir(path.join(directory, "reviews"));
  await writeFile(path.join(directory, "reviews", "approved.json"), JSON.stringify({
    source: {
      design: "Figma · Demo · 0:72",
      actual: "https://example.com/fed"
    },
    evidenceMode: "live",
    viewport: { width: 375, height: 812 }
  }));
  await writeFile(path.join(directory, "reviews", "draft.json"), JSON.stringify({
    source: {
      design: "Figma · Demo · 0:73",
      actual: "https://example.com/draft"
    },
    evidenceMode: "live",
    viewport: { width: 375, height: 812 }
  }));
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "financial-h5-export",
    samples: [{
      id: "approved-live",
      pageFrameGroupId: "fed-approved",
      approval: {
        status: "approved",
        reviewer: "designer-a",
        reviewedAt: "2026-09-10T10:00:00.000Z"
      },
      dataPolicy: { classification: "sanitized", reusableInTests: true },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-72",
        frameId: "0:72"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/fed",
        viewport: { width: 375, height: 812, dpr: 3 }
      },
      reviewJson: "./reviews/approved.json",
      coverage: ["market-value"],
      expectedIssues: [],
      pageAlignmentLabels: [{
        designParentFigmaNodeId: "module-correct",
        regionIndex: 1,
        label: "correct"
      }, {
        designParentFigmaNodeId: "module-false",
        label: "false_positive"
      }],
      allowedDynamics: [{
        id: "countdown",
        location: "利率观察/倒计时",
        type: "countdown",
        reason: "时间允许变化"
      }]
    }, {
      id: "draft-live",
      pageFrameGroupId: "fed-draft",
      approval: { status: "draft" },
      dataPolicy: { classification: "public", reusableInTests: false },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-73",
        frameId: "0:73"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/draft",
        viewport: { width: 375, height: 812, dpr: 3 }
      },
      reviewJson: "./reviews/draft.json",
      coverage: ["static-region"],
      expectedIssues: [],
      pageAlignmentLabels: [{
        designParentFigmaNodeId: "draft-module",
        label: "correct"
      }],
      allowedDynamics: []
    }]
  }, null, 2));
  const outputPath = path.join(directory, "generated", "alignment-labels.json");

  const exported = await writePageAlignmentCalibrationManifest(manifestPath, outputPath);

  assert.deepEqual(exported.sampleIds, ["approved-live"]);
  assert.equal(exported.manifest.version, 1);
  assert.deepEqual(exported.manifest.reviews, [{
    review: "../reviews/approved.json",
    labels: [{
      frameId: "0:72",
      designParentFigmaNodeId: "module-correct",
      regionIndex: 1,
      label: "correct"
    }, {
      frameId: "0:72",
      designParentFigmaNodeId: "module-false",
      label: "false_positive"
    }]
  }]);
});

test("exports only approved reusable missing-module labels for threshold calibration", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  await mkdir(path.join(directory, "reviews"));
  await writeFile(path.join(directory, "reviews", "approved.json"), JSON.stringify({
    source: {
      design: "Figma · Demo · 0:72",
      actual: "https://example.com/fed"
    },
    evidenceMode: "live",
    viewport: { width: 375, height: 812 },
    matching: {
      missingModules: {
        evaluatedCount: 2,
        publishedCount: 1,
        candidates: [{ figmaNodeId: "0:210", regionIndex: 5 }, {
          figmaNodeId: "0:286",
          regionIndex: 9
        }]
      }
    }
  }));
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "missing-module-export",
    samples: [{
      id: "approved-live",
      pageFrameGroupId: "fed-observer",
      approval: {
        status: "approved",
        reviewer: "designer-a",
        reviewedAt: "2026-09-11T07:00:00.000Z"
      },
      dataPolicy: { classification: "sanitized", reusableInTests: true },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-72",
        frameId: "0:72"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/fed",
        viewport: { width: 375, height: 812, dpr: 1 }
      },
      reviewJson: "./reviews/approved.json",
      coverage: ["static-region"],
      expectedIssues: [],
      missingModuleLabels: [{
        designParentFigmaNodeId: "0:210",
        regionIndex: 5,
        label: "false_positive",
        reason: "H5 不负责原生导航栏。"
      }, {
        designParentFigmaNodeId: "0:286",
        regionIndex: 9,
        label: "correct",
        reason: "投票模块在验收范围内且开发页确实缺失。"
      }],
      allowedDynamics: []
    }]
  }, null, 2));
  const outputPath = path.join(directory, "generated", "missing-module-labels.json");

  const exported = await writeMissingModuleCalibrationManifest(manifestPath, outputPath);

  assert.deepEqual(exported.sampleIds, ["approved-live"]);
  assert.deepEqual(exported.manifest, {
    version: 1,
    reviews: [{
      review: "../reviews/approved.json",
      labels: [{
        frameId: "0:72",
        designParentFigmaNodeId: "0:210",
        regionIndex: 5,
        label: "false_positive"
      }, {
        frameId: "0:72",
        designParentFigmaNodeId: "0:286",
        regionIndex: 9,
        label: "correct"
      }]
    }]
  });

  const stdout: string[] = [];
  const cliOutputPath = path.join(directory, "generated", "missing-module-labels-cli.json");
  const exitCode = await runFinancialGoldSetCli([
    "--manifest", manifestPath,
    "--missing-module-calibration-output", cliOutputPath
  ], {
    stdout: (message) => stdout.push(message),
    stderr: () => undefined
  });
  assert.equal(exitCode, 2);
  assert.match(stdout.join("\n"), /missing-module labels/i);
});

test("CLI reports draft readiness with a distinct non-error exit code", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  const manifestPath = path.join(directory, "manifest.json");
  const reportPath = path.join(directory, "validation.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "financial-h5-draft-cli",
    samples: [{
      id: "fed-live-draft",
      pageFrameGroupId: "fed-observer",
      approval: { status: "draft" },
      dataPolicy: { classification: "public", reusableInTests: false },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-72",
        frameId: "0:72"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/fed",
        viewport: { width: 375, height: 812, dpr: 3 }
      },
      coverage: ["market-value"],
      expectedIssues: [],
      allowedDynamics: [{
        id: "countdown",
        location: "利率观察/倒计时",
        type: "countdown",
        reason: "时间允许变化"
      }]
    }]
  }, null, 2));
  const stdout: string[] = [];
  const stderr: string[] = [];

  const exitCode = await runFinancialGoldSetCli([
    "--manifest", manifestPath,
    "--report", reportPath
  ], {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message)
  });

  assert.equal(exitCode, 2);
  assert.equal(stderr.length, 0);
  assert.match(stdout.join("\n"), /needs-human-review/);
  const report = JSON.parse(await (await import("node:fs/promises")).readFile(reportPath, "utf8"));
  assert.equal(report.readiness, "needs-human-review");
});

test("repository financial H5 draft stays valid but cannot silently become calibration-ready", async () => {
  const manifestPath = path.resolve("calibration/financial-h5/manifest.json");

  const result = await validateFinancialGoldSet(manifestPath);

  assert.equal(result.valid, true);
  assert.equal(result.readiness, "needs-human-review");
  assert.deepEqual(result.coverage.modes, ["live"]);
  assert.deepEqual(result.coverage.missingModes, ["screenshot", "hybrid"]);
  assert.equal(result.summary.approvedSamples, 0);
});

test("rejects a Review JSON that belongs to a different frame, H5, mode, or viewport", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  await writeFile(path.join(directory, "review.json"), JSON.stringify({
    source: {
      design: "Figma · Other · 9:9",
      actual: "https://example.com/other"
    },
    evidenceMode: "screenshot",
    viewport: { width: 390, height: 844 }
  }));
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "mismatched-review",
    samples: [{
      id: "fed-live",
      pageFrameGroupId: "fed",
      approval: { status: "draft" },
      dataPolicy: { classification: "public", reusableInTests: false },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-72",
        frameId: "0:72"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/fed",
        viewport: { width: 375, height: 812, dpr: 3 }
      },
      reviewJson: "./review.json",
      coverage: ["static-region"],
      expectedIssues: [],
      allowedDynamics: []
    }]
  }));

  const result = await validateFinancialGoldSet(manifestPath);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /does not match frame 0:72/i);
  assert.match(result.errors.join("\n"), /does not match H5/i);
  assert.match(result.errors.join("\n"), /evidence mode screenshot does not match live/i);
  assert.match(result.errors.join("\n"), /viewport 390x844 does not match 375x812/i);
});

test("rejects a missing-module label that does not resolve to Review JSON evidence", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "difflab-gold-set-"));
  await writeFile(path.join(directory, "review.json"), JSON.stringify({
    source: {
      design: "Figma · Demo · 0:72",
      actual: "https://example.com/fed"
    },
    evidenceMode: "live",
    viewport: { width: 375, height: 812 },
    matching: {
      missingModules: {
        evaluatedCount: 1,
        publishedCount: 1,
        candidates: [{
          candidateId: "missing-module:0:286:3",
          regionIndex: 3,
          figmaNodeId: "0:286"
        }]
      }
    }
  }));
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({
    schemaVersion: "1.0",
    datasetId: "missing-module-labels",
    samples: [{
      id: "fed-live",
      pageFrameGroupId: "fed-observer",
      approval: { status: "draft" },
      dataPolicy: { classification: "public", reusableInTests: false },
      design: {
        figmaUrl: "https://www.figma.com/design/file/demo?node-id=0-72",
        frameId: "0:72"
      },
      actual: {
        mode: "live",
        h5Url: "https://example.com/fed",
        viewport: { width: 375, height: 812, dpr: 1 }
      },
      reviewJson: "./review.json",
      coverage: ["static-region"],
      expectedIssues: [],
      missingModuleLabels: [{
        designParentFigmaNodeId: "0:999",
        regionIndex: 9,
        label: "false_positive",
        reason: "人工确认该候选不是独立业务模块。"
      }],
      allowedDynamics: []
    }]
  }, null, 2));

  const result = await validateFinancialGoldSet(manifestPath);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing-module label.*does not resolve/i);
});
