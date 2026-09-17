import assert from "node:assert/strict";
import test from "node:test";
import type { Issue } from "../src/types";
import { aggregateReviewIssueResult, aggregateReviewIssues } from "./review-issue";

const anchorStats = {
  candidateCount: 3,
  stableCount: 3,
  dynamicExcludedCount: 0,
  structuralAnchorCount: 2,
  inlierCount: 3,
  residualPx: 0
};

function scoreBreakdown(finalScore: number) {
  const component = { value: 1, weight: 1 / 6, contribution: 1 / 6 };
  return {
    anchorEvidenceApplied: true,
    baseScoreCap: finalScore,
    weightedScore: 1,
    finalScore,
    components: {
      stabilityCoverage: component,
      anchorSufficiency: component,
      inlierRatio: component,
      residualQuality: component,
      dynamicCleanliness: component,
      structuralSupport: component
    },
    levelThresholds: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
  };
}

function stableMatchedRegion(id: string, path: string[], displacementY: number) {
  return {
    designParentFigmaNodeId: id,
    designPath: path,
    status: "matched" as const,
    actualParentSelector: `.${id.replaceAll(":", "-")}`,
    displacement: { x: 0, y: displacementY },
    confidence: 0.99,
    reason: "稳定锚点确认模块与位移。",
    source: "deterministic" as const,
    anchorStats,
    scoreBreakdown: scoreBreakdown(0.99),
    evidenceConfidence: {
      score: 0.99,
      level: "high" as const,
      basis: ["stable-text" as const, "structure-geometry" as const],
      reasons: ["稳定锚点形成位移共识。"]
    }
  };
}

function missingRegion(id = "2:missing", path = ["页面", "投票模块"]) {
  return {
    designParentFigmaNodeId: id,
    designPath: path,
    status: "missing-in-actual" as const,
    confidence: 0.82,
    reason: "开发页在两个已匹配模块之间没有投票模块。",
    source: "agent-verified" as const,
    anchorStats: { ...anchorStats, candidateCount: 0, stableCount: 0, inlierCount: 0 },
    scoreBreakdown: scoreBreakdown(0.82),
    evidenceConfidence: {
      score: 0.82,
      level: "medium" as const,
      basis: ["visual-inference" as const, "agent-hypothesis" as const],
      reasons: ["模型提出缺失模块假设。"]
    }
  };
}

function issue(input: Partial<Issue> & Pick<Issue, "rule" | "title">): Issue {
  return {
    id: input.id ?? `raw-${input.rule}`,
    category: input.category ?? "布局",
    severity: input.severity ?? "error",
    summary: input.summary ?? "存在差异",
    suggestion: input.suggestion ?? "按设计值调整。",
    evidenceConfidence: input.evidenceConfidence ?? {
      score: 0.99,
      level: "high",
      basis: ["pixel-measurement"],
      reasons: ["确定性证据"]
    },
    ...input,
    title: input.title
  };
}

test("aggregates a shifted element and its pixel region into one traceable ReviewIssue", async () => {
  const result = await aggregateReviewIssues([
    issue({
      rule: "position",
      title: "行情卡片位置偏移",
      selector: "#market-card",
      figmaNodeId: "2:card",
      expected: "x 16px · y 80px",
      actual: "x 24px · y 80px",
      box: { x: 24, y: 80, width: 200, height: 80 }
    }),
    issue({
      rule: "visual_region",
      title: "高密度差异区域 1",
      severity: "pending",
      figmaNodeId: "2:card",
      box: { x: 16, y: 80, width: 208, height: 80 },
      evidenceConfidence: {
        score: 0.7,
        level: "low",
        basis: ["pixel-measurement", "visual-inference"],
        reasons: ["像素区域"]
      }
    })
  ], "zh-CN");

  assert.equal(result.length, 1);
  assert.equal(result[0].rule, "position");
  assert.equal(result[0].priority, "P1");
  assert.equal(result[0].location.selector, "#market-card");
  assert.equal(result[0].primaryAction, "按设计值调整。");
  assert.deepEqual(result[0].evidence.map((item) => item.rule), ["position", "visual_region"]);
  assert.equal(result[0].evidence[0].expected, "x 16px · y 80px");
  assert.equal(result[0].evidence[0].actual, "x 24px · y 80px");
});

test("keeps an AI-verified module displacement pending after aggregation", async () => {
  const result = await aggregateReviewIssues([
    issue({
      id: "raw-a",
      rule: "position",
      title: "标题位置偏移",
      selector: ".module .title",
      figmaNodeId: "2:title",
      designBox: { x: 0, y: 10, width: 80, height: 20 },
      actualBox: { x: 0, y: 30, width: 80, height: 20 },
      box: { x: 0, y: 30, width: 80, height: 20 }
    }),
    issue({
      id: "raw-b",
      rule: "position",
      title: "图表位置偏移",
      selector: ".module .chart",
      figmaNodeId: "2:chart",
      designBox: { x: 0, y: 40, width: 100, height: 40 },
      actualBox: { x: 0, y: 60, width: 100, height: 40 },
      box: { x: 0, y: 60, width: 100, height: 40 }
    })
  ], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "模块整体下移。",
        rejectedRegionCount: 0,
        regions: [{
          designParentFigmaNodeId: "2:module",
          designPath: ["页面", "利率观察"],
          status: "matched",
          actualParentSelector: ".module",
          displacement: { x: 0, y: 20 },
          confidence: 0.82,
          reason: "模型识别出相同业务模块。",
          source: "agent-verified",
          anchorStats,
          scoreBreakdown: scoreBreakdown(0.82),
          evidenceConfidence: {
            score: 0.82,
            level: "medium",
            basis: ["visual-inference", "agent-hypothesis"],
            reasons: ["结构提案通过确定性边界复核。"]
          }
        }]
      },
      matches: [
        {
          figmaNodeId: "2:title",
          selector: ".module .title",
          designAncestorIds: ["1:page", "2:module"],
          actualParentSelector: ".module"
        },
        {
          figmaNodeId: "2:chart",
          selector: ".module .chart",
          designAncestorIds: ["1:page", "2:module"],
          actualParentSelector: ".module"
        }
      ],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.9, mediumMin: 0.65, lowMin: 0 }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].severity, "pending");
  assert.equal(result[0].priority, "Pending");
  assert.equal(result[0].evidence.length, 2);
});

test("publishes a structurally verified missing module between two stable displacement plateaus", async () => {
  const matchedRegion = (
    id: string,
    path: string[],
    displacementY: number
  ) => ({
    designParentFigmaNodeId: id,
    designPath: path,
    status: "matched" as const,
    actualParentSelector: `.${id.replaceAll(":", "-")}`,
    displacement: { x: 0, y: displacementY },
    confidence: 0.99,
    reason: "稳定锚点确认模块与位移。",
    source: "deterministic" as const,
    anchorStats,
    scoreBreakdown: scoreBreakdown(0.99),
    evidenceConfidence: {
      score: 0.99,
      level: "high" as const,
      basis: ["stable-text" as const, "structure-geometry" as const],
      reasons: ["稳定锚点形成位移共识。"]
    }
  });

  const result = await aggregateReviewIssues([], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "中间模块缺失导致后续内容上移。",
        rejectedRegionCount: 0,
        regions: [
          matchedRegion("2:before", ["页面", "上方模块"], 0),
          {
            designParentFigmaNodeId: "2:missing",
            designPath: ["页面", "投票模块"],
            status: "missing-in-actual",
            confidence: 0.82,
            reason: "开发页在两个已匹配模块之间没有投票模块。",
            source: "agent-verified",
            anchorStats: { ...anchorStats, candidateCount: 0, stableCount: 0, inlierCount: 0 },
            scoreBreakdown: scoreBreakdown(0.82),
            evidenceConfidence: {
              score: 0.82,
              level: "medium",
              basis: ["visual-inference", "agent-hypothesis"],
              reasons: ["模型提出缺失模块假设。"]
            }
          },
          matchedRegion("2:after", ["页面", "下方模块"], -20)
        ]
      },
      designRegions: [
        { figmaNodeId: "2:before", box: { x: 0, y: 0, width: 100, height: 10 } },
        { figmaNodeId: "2:missing", box: { x: 0, y: 10, width: 100, height: 20 } },
        { figmaNodeId: "2:after", box: { x: 0, y: 30, width: 100, height: 10 } }
      ],
      matches: [],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].rule, "missing_module");
  assert.equal(result[0].figmaNodeId, "2:missing");
  assert.equal(result[0].title, "投票模块缺失");
  assert.equal(result[0].priority, "P1");
  assert.match(result[0].summary, /20px/);
  assert.match(result[0].primaryAction, /恢复投票模块/);
  assert.ok(result[0].evidenceConfidence.basis.includes("geometric-alignment"));
});

test("does not use an unanchored Agent displacement to publish a missing module", async () => {
  const result = await aggregateReviewIssueResult([], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "模型推断下方模块上移，但没有稳定元素锚点。",
        rejectedRegionCount: 0,
        regions: [
          stableMatchedRegion("2:before", ["页面", "上方模块"], 0),
          missingRegion(),
          {
            designParentFigmaNodeId: "2:after",
            designPath: ["页面", "下方模块"],
            status: "matched",
            actualParentSelector: ".after",
            displacement: { x: 0, y: -20 },
            confidence: 0.82,
            reason: "模型仅根据截图推断模块整体上移。",
            source: "agent-verified",
            anchorStats: {
              candidateCount: 0,
              stableCount: 0,
              dynamicExcludedCount: 0,
              structuralAnchorCount: 0,
              inlierCount: 0,
              residualPx: null
            },
            scoreBreakdown: scoreBreakdown(0.82),
            evidenceConfidence: {
              score: 0.82,
              level: "medium",
              basis: ["visual-inference", "agent-hypothesis"],
              reasons: ["没有稳定元素锚点。"]
            }
          }
        ]
      },
      designRegions: [
        { figmaNodeId: "2:before", box: { x: 0, y: 0, width: 100, height: 10 } },
        { figmaNodeId: "2:missing", box: { x: 0, y: 10, width: 100, height: 20 } },
        { figmaNodeId: "2:after", box: { x: 0, y: 30, width: 100, height: 10 } }
      ],
      matches: [],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
    }
  });

  assert.equal(result.issues.some((candidate) => candidate.rule === "missing_module"), false);
  assert.equal(result.missingModules.candidates[0]?.published, false);
  assert.deepEqual(
    result.missingModules.candidates[0]?.rejectionReasons,
    ["missing-following-anchor"]
  );
});

test("publishes a structurally verified leading module from the page boundary", async () => {
  const result = await aggregateReviewIssues([], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "页首导航缺失导致后续内容上移。",
        rejectedRegionCount: 0,
        regions: [{
          designParentFigmaNodeId: "2:navigation",
          designPath: ["页面", "导航栏"],
          status: "missing-in-actual",
          confidence: 0.82,
          reason: "开发页顶部没有设计中的导航栏。",
          source: "agent-verified",
          anchorStats: { ...anchorStats, candidateCount: 0, stableCount: 0, inlierCount: 0 },
          scoreBreakdown: scoreBreakdown(0.82),
          evidenceConfidence: {
            score: 0.82,
            level: "medium",
            basis: ["visual-inference", "agent-hypothesis"],
            reasons: ["模型提出页首导航缺失假设。"]
          }
        }, {
          designParentFigmaNodeId: "2:hero",
          designPath: ["页面", "头图模块"],
          status: "matched",
          actualParentSelector: ".hero",
          displacement: { x: 0, y: -20 },
          confidence: 0.99,
          reason: "稳定锚点确认头图模块上移。",
          source: "deterministic",
          anchorStats,
          scoreBreakdown: scoreBreakdown(0.99),
          evidenceConfidence: {
            score: 0.99,
            level: "high",
            basis: ["stable-text", "structure-geometry"],
            reasons: ["稳定锚点形成位移共识。"]
          }
        }]
      },
      designPageBox: { x: 0, y: 0, width: 100, height: 40 },
      designRegions: [
        { figmaNodeId: "2:navigation", box: { x: 0, y: 0, width: 100, height: 20 } },
        { figmaNodeId: "2:hero", box: { x: 0, y: 20, width: 100, height: 20 } }
      ],
      matches: [],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].rule, "missing_module");
  assert.equal(result[0].figmaNodeId, "2:navigation");
  assert.equal(result[0].priority, "P1");
  assert.match(result[0].summary, /页面顶部.*20px/);
});

test("uses parent identity rather than duplicate group names for missing-module anchors", async () => {
  const result = await aggregateReviewIssues([], "zh-CN", {
    moduleAlignment: {
      plan: { summary: "", rejectedRegionCount: 0, regions: [
        stableMatchedRegion("before", ["页面", "编组", "before"], 0),
        missingRegion("missing", ["页面", "编组", "missing"]),
        stableMatchedRegion("after", ["页面", "编组", "after"], -20)
      ] },
      designRegions: [
        { figmaNodeId: "before", parentId: "other-card", box: { x: 0, y: 0, width: 100, height: 10 } },
        { figmaNodeId: "missing", parentId: "card", box: { x: 0, y: 10, width: 100, height: 20 } },
        { figmaNodeId: "after", parentId: "card", box: { x: 0, y: 30, width: 100, height: 10 } }
      ], matches: [], positionTolerancePx: 4,
      confidenceLevels: { highMin: .86, mediumMin: .72, lowMin: 0 }
    }
  });
  assert.equal(result.length, 0);
});

test("uses the configured residual ratio when publishing a missing module", async () => {
  const result = await aggregateReviewIssues([], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "中间模块可能缺失。",
        rejectedRegionCount: 0,
        regions: [
          stableMatchedRegion("2:before", ["页面", "上方模块"], 0),
          missingRegion(),
          stableMatchedRegion("2:after", ["页面", "下方模块"], -80)
        ]
      },
      designRegions: [
        { figmaNodeId: "2:before", box: { x: 0, y: 0, width: 100, height: 10 } },
        { figmaNodeId: "2:missing", box: { x: 0, y: 10, width: 100, height: 100 } },
        { figmaNodeId: "2:after", box: { x: 0, y: 110, width: 100, height: 10 } }
      ],
      matches: [],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 },
      missingModuleThresholds: {
        minimumHorizontalOverlapRatio: 0.5,
        maximumResidualRatio: 0.25
      }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].rule, "missing_module");
  assert.match(result[0].summary, /100px.*80px/);
});

test("rejects a missing module below the configured horizontal overlap ratio", async () => {
  const result = await aggregateReviewIssueResult([], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "水平关系不足以确认模块缺失。",
        rejectedRegionCount: 0,
        regions: [
          stableMatchedRegion("2:before", ["页面", "上方模块"], 0),
          missingRegion(),
          stableMatchedRegion("2:after", ["页面", "下方模块"], -20)
        ]
      },
      designRegions: [
        { figmaNodeId: "2:before", box: { x: 45, y: 0, width: 100, height: 10 } },
        { figmaNodeId: "2:missing", box: { x: 0, y: 10, width: 100, height: 20 } },
        { figmaNodeId: "2:after", box: { x: 45, y: 30, width: 100, height: 10 } }
      ],
      matches: [],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 },
      missingModuleThresholds: {
        minimumHorizontalOverlapRatio: 0.6,
        maximumResidualRatio: 0.15
      }
    }
  });

  assert.equal(result.issues.length, 0);
  assert.equal(result.missingModules.candidates[0].horizontalOverlapRatio, 0.55);
});

test("exposes rejected missing-module geometry for Review JSON calibration", async () => {
  const result = await aggregateReviewIssueResult([], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "中间模块候选需要结构复核。",
        rejectedRegionCount: 0,
        regions: [
          stableMatchedRegion("2:before", ["页面", "上方模块"], 0),
          missingRegion(),
          stableMatchedRegion("2:after", ["页面", "下方模块"], -80)
        ]
      },
      designRegions: [
        { figmaNodeId: "2:before", box: { x: 0, y: 0, width: 100, height: 10 } },
        { figmaNodeId: "2:missing", box: { x: 0, y: 10, width: 100, height: 100 } },
        { figmaNodeId: "2:after", box: { x: 0, y: 110, width: 100, height: 10 } }
      ],
      matches: [],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 },
      missingModuleThresholds: {
        minimumHorizontalOverlapRatio: 0.5,
        maximumResidualRatio: 0.15
      }
    }
  });

  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.missingModules, {
    evaluatedCount: 1,
    publishedCount: 0,
    candidates: [{
      candidateId: "missing-module:2:missing:1",
      regionIndex: 1,
      figmaNodeId: "2:missing",
      designPath: ["页面", "投票模块"],
      topology: "interior",
      precedingRegionId: "2:before",
      followingRegionId: "2:after",
      designBox: { x: 0, y: 10, width: 100, height: 100 },
      designFlowGapPx: 100,
      displacementStepPx: 80,
      residualPx: 20,
      residualRatio: 0.2,
      horizontalOverlapRatio: 1,
      published: false,
      rejectionReasons: ["residual-too-high"],
      thresholds: {
        positionTolerancePx: 4,
        minimumHorizontalOverlapRatio: 0.5,
        maximumResidualRatio: 0.15
      }
    }]
  });
});

test("aggregates nested actual elements through their shared module ancestor", async () => {
  const result = await aggregateReviewIssues([
    issue({
      id: "raw-title",
      rule: "position",
      title: "标题位置偏移",
      selector: ".module .header .title",
      figmaNodeId: "2:title",
      designBox: { x: 0, y: 10, width: 80, height: 20 },
      actualBox: { x: 0, y: 30, width: 80, height: 20 }
    }),
    issue({
      id: "raw-chart",
      rule: "position",
      title: "图表位置偏移",
      selector: ".module .body .chart",
      figmaNodeId: "2:chart",
      designBox: { x: 0, y: 40, width: 100, height: 40 },
      actualBox: { x: 0, y: 60, width: 100, height: 40 }
    })
  ], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "模块整体下移。",
        rejectedRegionCount: 0,
        regions: [{
          designParentFigmaNodeId: "2:module",
          designPath: ["页面", "利率观察"],
          status: "matched",
          actualParentSelector: ".module",
          displacement: { x: 0, y: 20 },
          confidence: 0.99,
          reason: "稳定标题确认模块对应。",
          source: "deterministic",
          anchorStats,
          scoreBreakdown: scoreBreakdown(0.99),
          evidenceConfidence: {
            score: 0.99,
            level: "high",
            basis: ["stable-text", "structure-geometry"],
            reasons: ["模块两侧存在唯一稳定标题。"]
          }
        }]
      },
      matches: [
        {
          figmaNodeId: "2:title",
          selector: ".module .header .title",
          designAncestorIds: ["1:page", "2:module"],
          actualParentSelector: ".module .header",
          actualAncestorSelectors: [".module .header", ".module"]
        },
        {
          figmaNodeId: "2:chart",
          selector: ".module .body .chart",
          designAncestorIds: ["1:page", "2:module"],
          actualParentSelector: ".module .body",
          actualAncestorSelectors: [".module .body", ".module"]
        }
      ],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.9, mediumMin: 0.65, lowMin: 0 }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].figmaNodeId, "2:module");
  assert.deepEqual(result[0].evidence.map((item) => item.sourceIssueId), ["raw-title", "raw-chart"]);
});

test("aggregates an AI-aligned module across DOM branches without publishing a false selector", async () => {
  const result = await aggregateReviewIssues([
    issue({
      id: "raw-title",
      rule: "position",
      title: "利率观察位置偏移",
      selector: ".rate-title",
      figmaNodeId: "2:title",
      designBox: { x: 20, y: 551, width: 64, height: 20 },
      actualBox: { x: 20, y: 176, width: 64, height: 20 }
    }),
    issue({
      id: "raw-unit",
      rule: "position",
      title: "分钟位置偏移",
      selector: ".countdown-unit",
      figmaNodeId: "2:unit",
      designBox: { x: 274, y: 651, width: 30, height: 21 },
      actualBox: { x: 274, y: 276, width: 30, height: 21 }
    })
  ], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "利率观察模块整体上移。",
        rejectedRegionCount: 0,
        regions: [{
          designParentFigmaNodeId: "1:rates",
          designPath: ["页面", "利率观察"],
          status: "matched",
          actualParentSelector: ".ai-proposed-branch",
          displacement: { x: 0, y: -375 },
          confidence: 0.82,
          reason: "双图语义确认模块对应，但实际元素分布在多个 DOM 分支。",
          source: "agent-verified",
          anchorStats: {
            candidateCount: 0,
            stableCount: 0,
            dynamicExcludedCount: 0,
            structuralAnchorCount: 0,
            inlierCount: 0,
            residualPx: null
          },
          scoreBreakdown: scoreBreakdown(0.82),
          evidenceConfidence: {
            score: 0.82,
            level: "medium",
            basis: ["visual-inference", "agent-hypothesis"],
            reasons: ["模块语义由 AI 提出，位移由元素残差复核。"]
          }
        }]
      },
      matches: [{
        figmaNodeId: "2:title",
        selector: ".rate-title",
        designAncestorIds: ["0:page", "1:rates"],
        actualParentSelector: ".header"
      }, {
        figmaNodeId: "2:unit",
        selector: ".countdown-unit",
        designAncestorIds: ["0:page", "1:rates"],
        actualParentSelector: ".countdown"
      }],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].figmaNodeId, "1:rates");
  assert.equal(result[0].severity, "pending");
  assert.equal(result[0].selector, undefined);
  assert.equal(result[0].location.selector, undefined);
  assert.deepEqual(result[0].evidence.map((item) => item.sourceIssueId), ["raw-title", "raw-unit"]);
});

test("assigns shared displacement to the most specific matched module", async () => {
  const lowLevel = [
    issue({
      id: "raw-title",
      rule: "position",
      title: "标题位置偏移",
      selector: ".content .module .title",
      figmaNodeId: "3:title",
      designBox: { x: 0, y: 10, width: 80, height: 20 },
      actualBox: { x: 0, y: 30, width: 80, height: 20 }
    }),
    issue({
      id: "raw-chart",
      rule: "position",
      title: "图表位置偏移",
      selector: ".content .module .chart",
      figmaNodeId: "3:chart",
      designBox: { x: 0, y: 40, width: 100, height: 40 },
      actualBox: { x: 0, y: 60, width: 100, height: 40 }
    })
  ];
  const evidenceConfidence = {
    score: 0.99,
    level: "high" as const,
    basis: ["stable-text" as const, "structure-geometry" as const],
    reasons: ["唯一稳定锚点。"]
  };
  const result = await aggregateReviewIssues(lowLevel, "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "内容区和利率观察模块均整体下移。",
        rejectedRegionCount: 0,
        regions: [
          {
            designParentFigmaNodeId: "1:content",
            designPath: ["页面", "内容区"],
            status: "matched",
            actualParentSelector: ".content",
            displacement: { x: 0, y: 20 },
            confidence: 0.99,
            reason: "内容区对应。",
            source: "deterministic",
            anchorStats,
            scoreBreakdown: scoreBreakdown(0.99),
            evidenceConfidence
          },
          {
            designParentFigmaNodeId: "2:module",
            designPath: ["页面", "内容区", "利率观察"],
            status: "matched",
            actualParentSelector: ".content .module",
            displacement: { x: 0, y: 20 },
            confidence: 0.99,
            reason: "利率观察对应。",
            source: "deterministic",
            anchorStats,
            scoreBreakdown: scoreBreakdown(0.99),
            evidenceConfidence
          }
        ]
      },
      matches: [
        {
          figmaNodeId: "3:title",
          selector: ".content .module .title",
          designAncestorIds: ["1:page", "1:content", "2:module"],
          actualAncestorSelectors: [".content .module", ".content"]
        },
        {
          figmaNodeId: "3:chart",
          selector: ".content .module .chart",
          designAncestorIds: ["1:page", "1:content", "2:module"],
          actualAncestorSelectors: [".content .module", ".content"]
        }
      ],
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.9, mediumMin: 0.65, lowMin: 0 }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].figmaNodeId, "2:module");
  assert.match(result[0].title, /利率观察模块整体位移/);
});

test("keeps a local position deviation separate from the module displacement", async () => {
  const result = await aggregateReviewIssues([
    issue({
      id: "raw-a",
      rule: "position",
      title: "顶部标题位置偏移",
      selector: ".module .a",
      figmaNodeId: "2:a",
      designBox: { x: 0, y: 0, width: 80, height: 20 },
      actualBox: { x: 0, y: 20, width: 80, height: 20 },
      box: { x: 0, y: 20, width: 80, height: 20 }
    }),
    issue({
      id: "raw-b",
      rule: "position",
      title: "底部图表位置偏移",
      selector: ".module .b",
      figmaNodeId: "2:b",
      designBox: { x: 0, y: 100, width: 100, height: 20 },
      actualBox: { x: 0, y: 120, width: 100, height: 20 },
      box: { x: 0, y: 120, width: 100, height: 20 }
    }),
    issue({
      id: "raw-local",
      rule: "position",
      title: "局部按钮额外偏移",
      selector: ".module .local",
      figmaNodeId: "2:local",
      designBox: { x: 0, y: 50, width: 60, height: 20 },
      actualBox: { x: 0, y: 90, width: 60, height: 20 },
      box: { x: 0, y: 90, width: 60, height: 20 }
    })
  ], "zh-CN", {
    moduleAlignment: {
      plan: {
        summary: "模块整体下移，但按钮还有额外偏移。",
        rejectedRegionCount: 0,
        regions: [{
          designParentFigmaNodeId: "2:module",
          designPath: ["页面", "利率观察"],
          status: "matched",
          actualParentSelector: ".module",
          displacement: { x: 0, y: 20 },
          confidence: 0.99,
          reason: "多个稳定锚点确认整体位移。",
          source: "deterministic",
          anchorStats,
          scoreBreakdown: scoreBreakdown(0.99),
          evidenceConfidence: {
            score: 0.99,
            level: "high",
            basis: ["exact-id", "structure-geometry"],
            reasons: ["模块两侧存在多个精确锚点。"]
          }
        }]
      },
      matches: ["a", "b", "local"].map((name) => ({
        figmaNodeId: `2:${name}`,
        selector: `.module .${name}`,
        designAncestorIds: ["1:page", "2:module"],
        actualParentSelector: ".module"
      })),
      positionTolerancePx: 4,
      confidenceLevels: { highMin: 0.9, mediumMin: 0.65, lowMin: 0 }
    }
  });

  assert.equal(result.length, 2);
  const moduleIssue = result.find((candidate) => candidate.figmaNodeId === "2:module");
  assert.deepEqual(moduleIssue?.evidence.map((item) => item.sourceIssueId), ["raw-a", "raw-b"]);
  assert.equal(result.some((candidate) => candidate.id === "raw-local"), true);
});

test("keeps different root causes and page regions as separate ReviewIssues", async () => {
  const result = await aggregateReviewIssues([
    issue({ rule: "position", title: "卡片位置", selector: "#card-a", box: { x: 0, y: 0, width: 20, height: 20 } }),
    issue({ rule: "typography", title: "卡片字体", selector: "#card-a", box: { x: 0, y: 0, width: 20, height: 20 } }),
    issue({ rule: "position", title: "按钮位置", selector: "#button-b", box: { x: 80, y: 80, width: 20, height: 20 } })
  ], "zh-CN");

  assert.deepEqual(result.map((item) => item.title), ["卡片位置", "卡片字体", "按钮位置"]);
});

test("allows Agent wording changes but rejects unsupported parameters", async () => {
  const source = issue({
    rule: "position",
    title: "位置偏移",
    expected: "x 16px",
    actual: "x 24px",
    summary: "偏移 8px"
  });
  const rejected = await aggregateReviewIssues([source], "zh-CN", {
    rewriter: async () => ({
      title: "位置需调整",
      summary: "偏移 999px",
      suggestion: "移动 999px"
    })
  });
  assert.equal(rejected[0].title, "位置偏移");
  assert.equal(rejected[0].evidence[0].expected, "x 16px");

  const accepted = await aggregateReviewIssues([source], "zh-CN", {
    rewriter: async () => ({
      title: "位置需调整",
      summary: "当前 x 24px，应恢复到 x 16px",
      suggestion: "向设计值调整 8px"
    })
  });
  assert.equal(accepted[0].title, "位置需调整");
  assert.equal(accepted[0].primaryAction, "向设计值调整 8px");
  assert.equal(accepted[0].evidence[0].actual, "x 24px");
});

test("keeps deterministic ReviewIssues when the optional Agent rewriter fails", async () => {
  const result = await aggregateReviewIssues([
    issue({ rule: "position", title: "确定性位置问题" })
  ], "zh-CN", {
    rewriter: async () => {
      throw new Error("agent timeout");
    }
  });

  assert.equal(result[0].title, "确定性位置问题");
  assert.equal(result[0].evidence.length, 1);
});

test("assigns P0, P1, P2, and Pending from deterministic severity", async () => {
  const result = await aggregateReviewIssues([
    issue({ rule: "visual_similarity", title: "整页失败", selector: "#page" }),
    issue({ rule: "position", title: "位置", selector: "#a" }),
    issue({ rule: "color", title: "颜色", selector: "#b", severity: "warning" }),
    issue({ rule: "market_variant", title: "待确认", selector: "#c", severity: "pending" })
  ], "zh-CN");
  assert.deepEqual(result.map((item) => item.priority), ["P0", "P1", "P2", "Pending"]);
});
