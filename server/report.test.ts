import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type { ComparisonResult } from "./compare";
import { parseAcceptanceYaml } from "./default-rules";
import { createReport } from "./report";

const anchorStats = {
  candidateCount: 3,
  stableCount: 3,
  dynamicExcludedCount: 0,
  structuralAnchorCount: 2,
  inlierCount: 3,
  residualPx: 0
};

function scoreBreakdown(finalScore: number, anchorEvidenceApplied = true) {
  const component = { value: 1, weight: 1 / 6, contribution: 1 / 6 };
  return {
    anchorEvidenceApplied,
    baseScoreCap: finalScore,
    weightedScore: anchorEvidenceApplied ? 1 : 0,
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

function reportIssue(): ComparisonResult["issues"][number] {
  return {
    id: "issue-001",
    category: "布局",
    severity: "error",
    priority: "P1",
    title: "模块整体上移",
    summary: "实际模块相对设计稿上移 375px。",
    expected: "y 600px",
    actual: "y 225px",
    suggestion: "先补齐上方缺失模块，再复核当前模块位置。",
    primaryAction: "先补齐上方缺失模块，再复核当前模块位置。",
    selector: ".rate-probability",
    figmaNodeId: "2:rate",
    box: { x: 0, y: 225, width: 10, height: 3 },
    location: {
      selector: ".rate-probability",
      figmaNodeId: "2:rate",
      box: { x: 0, y: 225, width: 10, height: 3 },
      description: "利率概率模块"
    },
    rule: "position",
    evidenceConfidence: {
      score: 0.92,
      level: "high",
      basis: ["agent-hypothesis", "structure-geometry"],
      reasons: ["AI 语义绑定经元素类型和尺寸复核通过。"]
    },
    evidence: []
  };
}

function emptyComparison(image: Buffer): ComparisonResult {
  return {
    referenceImage: image,
    actualImage: image,
    diffImage: image,
    similarity: 1,
    issues: [],
    matching: {
      matches: [],
      unmatchedDesignCount: 0,
      unmatchedActualCount: 0,
      pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
      diagnostics: []
    },
    dynamicNormalization: {
      stableSimilarity: 1,
      dynamicRegionAreaRatio: 0,
      strategies: [],
      regions: [],
      agentHypotheses: []
    },
    marketVariants: { catalog: [], matches: [], unresolved: [] },
    marketLists: { matches: [], unresolved: [] }
  };
}

test("an unresolved DesignTruth item prevents a successful single-page verdict even without an error finding", async () => {
  const image = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
  const comparison = emptyComparison(image);
  comparison.matching.designCoverage = { policy: "design-driven", items: [{
    figmaNodeId: "card", name: "Card", status: "unverified", reasonCode: "scope-incomplete", issueIds: []
  }] };
  const report = createReport({ comparison, source: { design: "Figma", actual: "H5" }, viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 1, locale: "en", evidenceMode: "live" });
  assert.equal(report.status, "needs_review");
  assert.match(report.markdown, /Needs review/);
  assert.match(report.reportHtml, /Needs review/);
});

test("exports every design coverage outcome and issue link in Markdown and HTML", async () => {
  const image = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
  const comparison = emptyComparison(image);
  comparison.matching.designCoverage = { policy: "design-driven", items: [{
    figmaNodeId: "coverage-node", name: "投票 <模块>", status: "unverified", reasonCode: "scope-incomplete", issueIds: ["coverage:poll"]
  }] };
  const output = createReport({ comparison, source: { design: "Figma", actual: "H5" }, viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 10, locale: "zh-CN", evidenceMode: "live" });
  assert.match(output.markdown, /coverage-node/);
  assert.match(output.markdown, /coverage:poll/);
  assert.match(output.reportHtml, /投票 &lt;模块&gt;/);
  assert.match(output.reportHtml, /scope-incomplete/);
  assert.match(output.reportHtml, /设计覆盖未完成/);
});

test("module verification actions are prominently exported even when AI advice is unavailable", async () => {
  const image = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
  const comparison = emptyComparison(image);
  comparison.issues = [{ ...reportIssue(), id: "coverage:vote", rule: "design_coverage_unverified", severity: "pending",
    title: "投票 模块疑似缺失（待核验）", primaryAction: "确认缺失后补齐投票模块", coverageModule: { id: "vote", name: "投票", nodeIds: ["vote"] } }];
  const output = createReport({ comparison, source: { design: "Figma", actual: "H5" }, viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 10, locale: "zh-CN", evidenceMode: "live" });
  assert.match(output.markdown, /## 模块核验建议/);
  assert.match(output.reportHtml, /<h2>模块核验建议/);
  assert.match(output.reportHtml, /确认缺失后补齐投票模块/);
});

test("reports stable similarity, dynamic area, and normalization strategy separately", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const comparison: ComparisonResult = {
    referenceImage: image,
    actualImage: image,
    diffImage: image,
    similarity: 0.98,
    issues: [],
    matching: {
      matches: [],
      unmatchedDesignCount: 0,
      unmatchedActualCount: 0,
      pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
      diagnostics: []
    },
    dynamicNormalization: {
      stableSimilarity: 0.98,
      dynamicRegionAreaRatio: 0.16,
      strategies: ["normalize-market-value-text"],
      regions: [
        {
          kind: "market-value",
          strategy: "normalize-market-value-text",
          source: "deterministic",
          normalizedProperties: ["text"],
          figmaNodeId: "2:price",
          fingerprintKey: "figma:2:price",
          selector: "#price",
          designBox: { x: 1, y: 1, width: 4, height: 4 },
          actualBox: { x: 1, y: 1, width: 4, height: 4 },
          sampleCount: 3,
          evidenceConfidence: {
            score: 0.97,
            level: "high",
            basis: ["exact-id", "temporal-consistency", "market-format"],
            reasons: ["三帧证据一致。"]
          }
        }
      ],
      agentHypotheses: []
    },
    marketVariants: { catalog: [], matches: [], unresolved: [] },
    marketLists: { matches: [], unresolved: [] }
  };

  const report = createReport({
    comparison,
    source: { design: "Figma · 行情", actual: "https://example.test/market" },
    viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(),
    diagnostics: [],
    durationMs: 100,
    locale: "zh-CN",
    evidenceMode: "live"
  });

  assert.equal(report.summary.stableSimilarity, 0.98);
  assert.equal(report.summary.dynamicRegionAreaRatio, 0.16);
  assert.deepEqual(report.dynamicNormalization.strategies, ["normalize-market-value-text"]);
  assert.deepEqual(report.marketLists, comparison.marketLists);
  assert.match(report.markdown, /稳定区域相似度：98\.00%/);
  assert.match(report.markdown, /动态区域占比：16\.00%/);
  assert.match(report.reportHtml, /normalize-market-value-text/);
});

test("exports an incomplete-review warning when structural Agent execution failed", async () => {
  const image = await sharp({create: {width: 10, height: 10, channels: 4, background: "white"}}).png().toBuffer();
  const comparison = emptyComparison(image);
  comparison.matching.semanticAgent = {invoked: true, responded: false, acceptedBindingCount: 0, modules: []};
  const report = createReport({comparison, source: {design: "Figma", actual: "fixture"},
    viewport: {width: 10,height: 10}, rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 1, locale: "zh-CN", evidenceMode: "live"});
  assert.match(report.markdown, /AI 结构审查失败.*审查不完整/);
  assert.match(report.reportHtml, /role="alert"/);
  assert.match(report.reportHtml, /缺失数量为 0 不代表没有缺失/);
});

test("does not publish AI advice when its summary references a missing ReviewIssue", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const comparison = emptyComparison(image);

  const report = createReport({
    comparison,
    source: { design: "Figma · 空页面", actual: "https://example.test/empty" },
    viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(),
    diagnostics: [],
    durationMs: 100,
    locale: "zh-CN",
    evidenceMode: "live",
    aiAdvice: {
      summary: "恢复不存在的顶部模块。",
      summaryEvidenceRefs: ["review-issue:missing"],
      priorities: [{
        title: "恢复模块",
        reason: "模型认为设计中存在模块。",
        action: "新增模块。",
        evidenceRefs: ["review-issue:missing"]
      }]
    }
  });

  assert.equal(report.aiAdvice, undefined);
  assert.deepEqual(report.aiAdviceRejection, {
    code: "evidence_integrity_failed",
    message: "AI 建议未发布：证据引用无法解析：review-issue:missing。",
    danglingRefs: ["review-issue:missing"],
    locations: [
      {
        scope: "summary",
        reason: "unresolved",
        refs: ["review-issue:missing"]
      },
      {
        scope: "priority",
        priorityNumber: 1,
        reason: "unresolved",
        refs: ["review-issue:missing"]
      }
    ]
  });
  assert.doesNotMatch(report.markdown, /恢复不存在的顶部模块|review-issue:missing/);
  assert.doesNotMatch(report.reportHtml, /恢复不存在的顶部模块|review-issue:missing/);
  assert.match(report.diagnostics.join("\n"), /review-issue:missing/);
});

test("does not publish AI advice when the summary or a priority has no evidence refs", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const comparison = emptyComparison(image);

  const report = createReport({
    comparison,
    source: { design: "Figma · 空页面", actual: "https://example.test/empty" },
    viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(),
    diagnostics: [],
    durationMs: 100,
    locale: "zh-CN",
    evidenceMode: "live",
    aiAdvice: {
      summary: "没有证据的汇总。",
      summaryEvidenceRefs: [],
      priorities: [{
        title: "没有证据的建议",
        reason: "没有证据。",
        action: "不应发布。",
        evidenceRefs: []
      }]
    }
  });

  assert.equal(report.aiAdvice, undefined);
  assert.deepEqual(report.aiAdviceRejection, {
    code: "evidence_integrity_failed",
    message: "AI 建议未发布：缺少证据引用：汇总、建议 1。",
    danglingRefs: [],
    locations: [
      { scope: "summary", reason: "missing", refs: [] },
      { scope: "priority", priorityNumber: 1, reason: "missing", refs: [] }
    ]
  });
  assert.doesNotMatch(report.markdown, /没有证据的汇总|没有证据的建议/);
  assert.doesNotMatch(report.reportHtml, /没有证据的汇总|没有证据的建议/);
  assert.match(report.diagnostics.join("\n"), /缺少证据引用/);
});

test("rejects the whole AI advice when a priority references a non-matched alignment region", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const comparison = emptyComparison(image);
  comparison.issues = [reportIssue()];
  comparison.matching.pageAlignment.regions = [{
    designParentFigmaNodeId: "2:design-only",
    designPath: ["仅设计侧模块"],
    status: "missing-in-actual",
    confidence: 0.82,
    reason: "开发页中没有对应区域。",
    source: "agent-verified",
    anchorStats: {
      ...anchorStats,
      candidateCount: 0,
      stableCount: 0,
      structuralAnchorCount: 0,
      inlierCount: 0,
      residualPx: null
    },
    scoreBreakdown: scoreBreakdown(0.82, false),
    evidenceConfidence: {
      score: 0.82,
      level: "medium",
      basis: ["agent-hypothesis"],
      reasons: ["区域不属于已验证交集。"]
    }
  }];

  const report = createReport({
    comparison,
    source: { design: "Figma · 页面", actual: "https://example.test/page" },
    viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(),
    diagnostics: [],
    durationMs: 100,
    locale: "zh-CN",
    evidenceMode: "live",
    aiAdvice: {
      summary: "汇总引用有效问题。",
      summaryEvidenceRefs: ["review-issue:issue-001"],
      priorities: [{
        title: "恢复设计侧模块",
        reason: "错误引用了非交集区域。",
        action: "不应发布。",
        evidenceRefs: ["page-alignment:2:design-only"]
      }]
    }
  });

  assert.equal(report.aiAdvice, undefined);
  assert.deepEqual(report.aiAdviceRejection, {
    code: "evidence_integrity_failed",
    message: "AI 建议未发布：证据引用无法解析：page-alignment:2:design-only。",
    danglingRefs: ["page-alignment:2:design-only"],
    locations: [{
      scope: "priority",
      priorityNumber: 1,
      reason: "unresolved",
      refs: ["page-alignment:2:design-only"]
    }]
  });
  assert.doesNotMatch(report.markdown, /汇总引用有效问题|恢复设计侧模块/);
  assert.doesNotMatch(report.reportHtml, /汇总引用有效问题|恢复设计侧模块/);
  assert.match(report.diagnostics.join("\n"), /page-alignment:2:design-only/);
});

test("renders the standardized issue table and AI conclusions in Markdown and HTML", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();
  const comparison: ComparisonResult = {
    referenceImage: image,
    actualImage: image,
    diffImage: image,
    similarity: 0.88,
    issues: [reportIssue()],
    matching: {
      matches: [],
      unmatchedDesignCount: 0,
      unmatchedActualCount: 0,
      diagnostics: [],
      pageAlignment: {
        summary: "开发页缺少投票模块，利率观察模块整体上移。",
        rejectedRegionCount: 1,
        regions: [
          {
            designParentFigmaNodeId: "2:poll",
            designPath: ["美联储观察", "投票模块"],
            status: "missing-in-actual",
            confidence: 0.82,
            reason: "开发页没有投票卡片。",
            source: "agent-verified",
            anchorStats: { ...anchorStats, candidateCount: 0, stableCount: 0, structuralAnchorCount: 0, inlierCount: 0, residualPx: null },
            scoreBreakdown: scoreBreakdown(0.82, false),
            evidenceConfidence: {
              score: 0.82,
              level: "medium",
              basis: ["visual-inference", "agent-hypothesis"],
              reasons: ["开发页没有投票卡片。"]
            }
          },
          {
            designParentFigmaNodeId: "2:rate-observation",
            designPath: ["美联储观察", "利率观察"],
            status: "matched",
            actualParentSelector: ".rate-observation",
            displacement: { x: 0, y: -375 },
            confidence: 0.82,
            reason: "标题、倒计时和概率表语义一致。",
            source: "agent-verified",
            anchorStats,
            scoreBreakdown: scoreBreakdown(0.82),
            evidenceConfidence: {
              score: 0.82,
              level: "medium",
              basis: ["visual-inference", "agent-hypothesis"],
              reasons: ["标题、倒计时和概率表语义一致。"]
            }
          }
        ]
      }
    },
    dynamicNormalization: {
      stableSimilarity: 0.88,
      dynamicRegionAreaRatio: 0,
      strategies: [],
      regions: [],
      agentHypotheses: []
    },
    marketVariants: { catalog: [], matches: [], unresolved: [] },
    marketLists: { matches: [], unresolved: [] }
  };

  const report = createReport({
    comparison,
    source: { design: "Figma · 美联储观察", actual: "https://example.test/fed" },
    viewport: { width: 10, height: 10 },
    rules: parseAcceptanceYaml(),
    diagnostics: [],
    durationMs: 100,
    locale: "zh-CN",
    evidenceMode: "live",
    aiAdvice: {
      model: "test-model",
      summary: "页面缺少顶部模块，导致后续内容整体上移。",
      summaryEvidenceRefs: [
        "review-issue:issue-001",
        "page-alignment:2:rate-observation"
      ],
      priorities: [{
        title: "先修复页面结构",
        reason: "多处位移共享同一根因",
        action: "补齐顶部模块后重新走查",
        evidenceRefs: [
          "review-issue:issue-001",
          "page-alignment:2:rate-observation"
        ]
      }]
    }
  });

  assert.match(report.markdown, /\| 序号 \| 页面名称 \| 差异位置 \| 设计稿表现 \| 开发表现 \| 修改内容 \| 设计稿图 \| 开发图 \| 优先级 \| 置信度 \|/);
  assert.match(report.markdown, /\| 1 \| Figma · 美联储观察 \| 利率概率模块 · 模块整体上移 \| y 600px \| y 225px \|/);
  assert.match(report.markdown, /页面缺少顶部模块/);
  assert.match(
    report.markdown,
    /汇总证据：`review-issue:issue-001`、`page-alignment:2:rate-observation`/
  );
  assert.match(
    report.markdown,
    /建议证据：`review-issue:issue-001`、`page-alignment:2:rate-observation`/
  );
  assert.match(report.markdown, /\| 证据引用 \|/);
  assert.match(report.markdown, /\| `review-issue:issue-001` \|/);
  assert.match(report.markdown, /\| `page-alignment:2:rate-observation` \|/);
  assert.match(report.markdown, /## 页面结构对齐/);
  assert.match(report.markdown, /投票模块.*开发页缺失/);
  assert.match(report.markdown, /利率观察.*-375px/);
  assert.match(report.markdown, /锚点统计/);
  assert.match(report.markdown, /评分分量/);
  assert.match(report.markdown, /稳定覆盖 .*加权 .*最终 82%.*H≥86% · M≥72% · L≥0%/);
  assert.match(report.markdown, /候选 3 · 稳定 3 · 动态排除 0 · 结构 2 · RANSAC 内点 3 · 残差 0px/);
  assert.match(report.markdown, /已拒绝 1 条无法验证的模块判断/);
  assert.match(report.reportHtml, /<table/);
  assert.match(report.reportHtml, /<th>差异位置<\/th>/);
  assert.match(report.reportHtml, /AI 改进建议/);
  assert.match(report.reportHtml, /页面缺少顶部模块/);
  assert.match(report.reportHtml, /class="ai-summary-evidence"/);
  assert.match(report.reportHtml, /class="ai-priority-evidence"/);
  assert.match(report.reportHtml, /review-issue:issue-001/);
  assert.match(report.reportHtml, /page-alignment:2:rate-observation/);
  assert.match(report.reportHtml, /href="#evidence-review-issue%3Aissue-001"/);
  assert.match(report.reportHtml, /id="evidence-review-issue%3Aissue-001"/);
  assert.match(report.reportHtml, /href="#evidence-page-alignment%3A2%3Arate-observation"/);
  assert.match(report.reportHtml, /id="evidence-page-alignment%3A2%3Arate-observation"/);
  const reviewJson = JSON.parse(JSON.stringify(report)) as typeof report;
  assert.deepEqual(reviewJson.aiAdvice?.summaryEvidenceRefs, [
    "review-issue:issue-001",
    "page-alignment:2:rate-observation"
  ]);
  assert.deepEqual(reviewJson.aiAdvice?.priorities[0].evidenceRefs, [
    "review-issue:issue-001",
    "page-alignment:2:rate-observation"
  ]);
  assert.match(report.reportHtml, /页面结构对齐/);
  assert.match(report.reportHtml, /锚点统计/);
  assert.match(report.reportHtml, /评分分量/);
  assert.match(report.reportHtml, /RANSAC 内点 3/);
  assert.match(report.reportHtml, /开发页缺失/);
  assert.match(report.reportHtml, /已拒绝 1 条无法验证的模块判断/);
});

test("report exports retain passing checks, dynamic exemptions and actual-side gaps", async () => {
  const image = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
  const comparison = emptyComparison(image);
  comparison.matching.designCoverage = { policy: "design-driven", items: [{ figmaNodeId: "date", name: "Date", status: "matched", reviewStatus: "passed", reasonCode: "verified-binding", issueIds: [],
    checks: [{ property: "fontSize", rule: "typography", selector: ".date", actualBox: { x: 0, y: 0, width: 10, height: 10 }, expected: 16, actual: 16, tolerance: 1, status: "passed", reason: "measured" },
      { property: "text", rule: "content", selector: ".date", actualBox: { x: 0, y: 0, width: 10, height: 10 }, expected: "3月19日", actual: "4月30日", status: "exempt", reason: "normalize-date-time-text" }] }],
    actualItems: [{ name: "Extra control", selector: ".extra", actualBox: { x: 0, y: 0, width: 2, height: 2 }, status: "unverified", reasonCode: "design-counterpart-unresolved", issueIds: ["extra"] }] };
  const output = createReport({ comparison, source: { design: "Figma", actual: "H5" }, viewport: { width: 10, height: 10 }, rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 1, locale: "en", evidenceMode: "live" });
  assert.equal(output.status, "needs_review");
  for (const text of [output.markdown, output.reportHtml]) {
    assert.match(text, /fontSize/); assert.match(text, /normalize-date-time-text/); assert.match(text, /exempt/); assert.match(text, /Extra control/);
  }
});

test("an empty review ledger cannot certify that a whole page passed", async () => {
  const image = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
  const comparison = emptyComparison(image); comparison.matching.designCoverage = { policy: "design-driven", items: [] };
  const report = createReport({ comparison, source: { design: "Figma", actual: "H5" }, viewport: { width: 10, height: 10 }, rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 1, locale: "en", evidenceMode: "live" });
  assert.equal(report.status, "needs_review");
});


test("zero reviewed pixels show no evaluation instead of perfect similarity in exported reports", async () => {
  const image = await sharp({ create: { width: 10, height: 10, channels: 4, background: "white" } }).png().toBuffer();
  for (const locale of ["zh-CN", "en"] as const) {
    const comparison = emptyComparison(image);
    comparison.matching.visualScope = { reviewedPixels: 0, changedPixels: 0, excludedPixels: 100, canvasPixels: 100 };
    const report = createReport({ comparison, source: { design: "Figma", actual: "H5" }, viewport: { width: 10, height: 10 },
      rules: parseAcceptanceYaml(), diagnostics: [], durationMs: 1, locale, evidenceMode: "screenshot" });
    for (const content of [report.markdown, report.reportHtml]) {
      assert.match(content, locale === "en" ? /Not evaluated.*no reliable corresponding region/ : /未评估.*无可靠对应区域/);
      assert.doesNotMatch(content, /100\.00%/);
    }
  }
});

test("HTML Markdown and JSON expose the same measured design and actual values and detailed correction",async()=>{
 const image=await sharp({create:{width:10,height:10,channels:4,background:"white"}}).png().toBuffer();const comparison=emptyComparison(image);const issue=reportIssue();issue.rule="typography";issue.summary="字体属性不同";delete issue.expected;delete issue.actual;comparison.issues=[issue];
 comparison.matching.designCoverage={policy:"actual-driven",items:[{figmaNodeId:issue.figmaNodeId!,name:"未来利率预测",status:"matched",reasonCode:"verified-binding",issueIds:[issue.id],checks:[{property:"fontWeight",rule:"typography",selector:issue.selector!,actualBox:issue.box!,expected:500,actual:400,status:"difference",reason:"measured"}]}]};
 const output=createReport({comparison,source:{design:"Figma",actual:"H5"},viewport:{width:10,height:10},rules:parseAcceptanceYaml(),diagnostics:[],durationMs:1,locale:"zh-CN",evidenceMode:"live"});
 for(const text of [output.reportHtml,output.markdown]){assert.match(text,/字重：500/);assert.match(text,/字重：400/);assert.match(text,/字重由 400 调整为 500/);}
 assert.equal(output.issues[0].expected,"字重：500");assert.equal(output.issues[0].actual,"字重：400");
});
