import assert from "node:assert/strict";
import test from "node:test";
import type {
  ElementMatchingEvidence,
  MissingModuleEvaluation,
  ReviewIssue
} from "./types";
import { buildStructureReportModel } from "./structure-report";

const confidence = {
  score: 0.92,
  level: "high" as const,
  basis: ["agent-hypothesis" as const, "geometric-alignment" as const],
  reasons: ["Agent 判断与兄弟模块位移证据一致。"]
};

test("module coverage uncertainty remains visible when the Agent produced zero candidates", () => {
  const issue = { ...missingIssue(), rule: "design_coverage_unverified", severity: "pending" as const,
    coverageModule: { id: "poll", name: "投票", nodeIds: ["poll"] } };
  const model = buildStructureReportModel({ issues: [issue], matching: {
    matches: [], unmatchedDesignCount: 0, unmatchedActualCount: 0, diagnostics: [],
    pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 }
  } });
  assert.equal(model.pendingModules.length, 1);
  assert.equal(model.visible, true);
  assert.equal(model.coverageIncomplete, true);
});

test("failed Agent review is incomplete even with zero missing candidates and no unmatched nodes", () => {
  const model = buildStructureReportModel({issues: [], matching: {
    matches: [], unmatchedDesignCount: 0, unmatchedActualCount: 0, diagnostics: [],
    pageAlignment: {summary: "", regions: [], rejectedRegionCount: 0},
    semanticAgent: {invoked: true, responded: false, acceptedBindingCount: 0, modules: []}
  }});
  assert.equal(model.incomplete, true);
  assert.equal(model.visible, true);
});

function missingIssue(): ReviewIssue {
  return {
    id: "missing-module:2:poll",
    rule: "missing_module",
    category: "结构",
    severity: "error",
    priority: "P1",
    title: "投票模块缺失",
    summary: "相邻模块的位移阶跃与设计流缺口一致。",
    suggestion: "先恢复投票模块。",
    primaryAction: "先恢复投票模块。",
    figmaNodeId: "2:poll",
    designBox: { x: 0, y: 100, width: 390, height: 180 },
    box: { x: 0, y: 100, width: 390, height: 180 },
    evidenceConfidence: confidence,
    location: {
      figmaNodeId: "2:poll",
      designBox: { x: 0, y: 100, width: 390, height: 180 },
      box: { x: 0, y: 100, width: 390, height: 180 },
      description: "页面模块 投票模块"
    },
    evidence: []
  };
}

function missingCandidate(published: boolean): MissingModuleEvaluation {
  return {
    candidateId: "missing-module:2:poll:1",
    regionIndex: 1,
    figmaNodeId: "2:poll",
    designPath: ["美联储观察", "投票模块"],
    topology: "interior",
    precedingRegionId: "2:before",
    followingRegionId: "2:after",
    designBox: { x: 0, y: 100, width: 390, height: 180 },
    designFlowGapPx: 180,
    displacementStepPx: 178,
    residualPx: 2,
    residualRatio: 0.0111,
    horizontalOverlapRatio: 1,
    published,
    rejectionReasons: published ? [] : ["residual-too-high"],
    thresholds: {
      positionTolerancePx: 4,
      minimumHorizontalOverlapRatio: 0.5,
      maximumResidualRatio: 0.15
    }
  };
}

function matching(candidate?: MissingModuleEvaluation): ElementMatchingEvidence {
  return {
    matches: [],
    unmatchedDesignCount: 3,
    unmatchedActualCount: 0,
    diagnostics: [],
    pageAlignment: {
      summary: "投票模块缺失导致后续模块上移。",
      rejectedRegionCount: 0,
      regions: []
    },
    missingModules: {
      evaluatedCount: candidate ? 1 : 0,
      publishedCount: candidate?.published ? 1 : 0,
      candidates: candidate ? [candidate] : []
    }
  };
}

test("includes every published missing-module ReviewIssue in the structure report", () => {
  const model = buildStructureReportModel({
    issues: [missingIssue()],
    matching: matching(missingCandidate(true))
  });

  assert.equal(model.visible, true);
  assert.equal(model.confirmed.length, 1);
  assert.equal(model.confirmed[0].issue.id, "missing-module:2:poll");
  assert.deepEqual(model.confirmed[0].designPath, ["美联储观察", "投票模块"]);
  assert.equal(model.confirmed[0].evaluation?.residualPx, 2);
  assert.equal(model.unpublished.length, 0);
});

test("keeps an unverified missing candidate visible but outside confirmed issues", () => {
  const model = buildStructureReportModel({
    issues: [],
    matching: matching(missingCandidate(false))
  });

  assert.equal(model.visible, true);
  assert.equal(model.confirmed.length, 0);
  assert.equal(model.unpublished.length, 1);
  assert.deepEqual(model.unpublished[0].rejectionReasons, ["residual-too-high"]);
});

test("explains design-only unmatched coverage when no module was verified", () => {
  const model = buildStructureReportModel({
    issues: [],
    matching: matching()
  });

  assert.equal(model.visible, true);
  assert.equal(model.confirmed.length, 0);
  assert.equal(model.unpublished.length, 0);
  assert.equal(model.unmatchedDesignCount, 3);
});
