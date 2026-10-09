import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import sharp from "sharp";
import type { CompareReport, PageAlignmentRegionDecision, ReviewIssue } from "../src/types";
import { parseAcceptanceYaml } from "./default-rules";
import { buildExcelReportArtifact } from "./excel-report";

async function imageDataUrl(color: string): Promise<string> {
  const image = await sharp({
    create: { width: 100, height: 100, channels: 4, background: color }
  }).png().toBuffer();
  return `data:image/png;base64,${image.toString("base64")}`;
}

test("Excel retains the design coverage ledger including unresolved nodes", async () => {
  const page = await report();
  page.matching.designCoverage = { policy: "design-driven", items: [{
    figmaNodeId: "unverified:node", name: "投票", status: "unverified", reasonCode: "scope-incomplete", issueIds: ["coverage:poll"]
  }] };
  const artifact = await buildExcelReportArtifact({ reviewName: "test", pages: [{ clientPageId: "test", pageName: "test", report: page }], locale: "zh-CN" });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const sheet = workbook.getWorksheet("设计覆盖清单");
  assert.ok(sheet);
  assert.equal(sheet.getCell("B4").value, "unverified:node");
  assert.equal(sheet.getCell("G4").value, "review-issue:coverage:poll");
});

function reviewIssue(): ReviewIssue {
  return {
    id: "issue-001",
    category: "布局",
    severity: "error",
    priority: "P1",
    title: "最新价位置偏移",
    summary: "元素位置偏移 8px。",
    expected: "x 20px · y 24px",
    actual: "x 28px · y 24px",
    suggestion: "将最新价向左调整 8px。",
    primaryAction: "将最新价向左调整 8px。",
    selector: "#price",
    figmaNodeId: "123:456",
    actualElementFingerprint: "figma:123:456",
    dynamicStrategy: "normalize-market-value-text",
    box: { x: 20, y: 24, width: 30, height: 16 },
    location: {
      selector: "#price",
      figmaNodeId: "123:456",
      box: { x: 20, y: 24, width: 30, height: 16 },
      description: "行情列表 / 最新价"
    },
    rule: "position",
    evidenceConfidence: {
      score: 0.97,
      level: "high",
      basis: ["exact-id", "temporal-consistency"],
      reasons: ["多帧证据一致。"]
    },
    evidence: []
  };
}

function pageAlignmentRegion(): PageAlignmentRegionDecision {
  const component = { value: 1, weight: 1 / 6, contribution: 1 / 6 };
  return {
    designParentFigmaNodeId: "2:rate-observation",
    designPath: ["美联储观察", "利率观察"],
    status: "matched",
    actualParentSelector: ".rate-observation",
    displacement: { x: 2, y: -24 },
    confidence: 0.94,
    reason: "三个稳定结构锚点形成一致位移。",
    source: "deterministic",
    anchorStats: {
      candidateCount: 4,
      stableCount: 3,
      dynamicExcludedCount: 1,
      structuralAnchorCount: 2,
      inlierCount: 3,
      residualPx: 0.4
    },
    scoreBreakdown: {
      anchorEvidenceApplied: true,
      baseScoreCap: 1,
      weightedScore: 0.94,
      finalScore: 0.94,
      components: {
        stabilityCoverage: component,
        anchorSufficiency: component,
        inlierRatio: component,
        residualQuality: component,
        dynamicCleanliness: component,
        structuralSupport: component
      },
      levelThresholds: { highMin: 0.86, mediumMin: 0.72, lowMin: 0 }
    },
    evidenceConfidence: {
      score: 0.94,
      level: "high",
      basis: ["geometric-alignment", "temporal-consistency"],
      reasons: ["稳定锚点跨帧一致。"]
    }
  };
}

async function report(): Promise<CompareReport> {
  const [reference, actual, diff] = await Promise.all([
    imageDataUrl("#ffffff"),
    imageDataUrl("#f5f5f5"),
    imageDataUrl("#ff00aa")
  ]);
  return {
    id: "review-page-1",
    createdAt: "2026-09-08T10:00:00.000Z",
    durationMs: 1320,
    status: "failed",
    evidenceMode: "live",
    summary: {
      errors: 1,
      warnings: 0,
      pending: 0,
      similarity: 0.93,
      stableSimilarity: 0.93,
      dynamicRegionAreaRatio: 0.12,
      matchedElements: 8,
      unmatchedDesignElements: 1,
      unmatchedActualElements: 2
    },
    dynamicNormalization: {
      stableSimilarity: 0.93,
      dynamicRegionAreaRatio: 0.12,
      strategies: ["normalize-market-value-text"],
      regions: [],
      agentHypotheses: []
    },
    marketVariants: { catalog: [], matches: [], unresolved: [] },
    marketLists: { matches: [], unresolved: [] },
    matching: {
      matches: [],
      unmatchedDesignCount: 1,
      unmatchedActualCount: 2,
      pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
      diagnostics: []
    },
    viewport: { width: 100, height: 100 },
    source: { design: "Figma · 行情首页", actual: "https://h5.example.com/market" },
    images: { reference, actual, diff },
    issues: [reviewIssue()],
    rules: {
      ...parseAcceptanceYaml(),
      rules: { position: "error" },
    },
    diagnostics: ["页面布局已稳定。"],
    aiAdvice: {
      model: "test-model",
      summary: "页面缺少顶部模块，导致后续区域整体上移。",
      summaryEvidenceRefs: ["review-issue:issue-001"],
      priorities: [{
        title: "先补齐页面结构",
        reason: "多个位置问题共享同一根因",
        action: "补齐顶部模块后重新走查",
        evidenceRefs: ["review-issue:issue-001"]
      }]
    },
    markdown: "",
    reportHtml: ""
  };
}

test("builds the delivery workbook with one actionable row per ReviewIssue", async () => {
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: await report() }]
  });

  assert.equal(artifact.filename, "行情首页UI走查结果.xlsx");
  assert.equal(
    artifact.contentType,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const issues = workbook.getWorksheet("问题清单");
  assert.ok(issues);
  assert.deepEqual(
    (issues.getRow(3).values as unknown[]).slice(1),
    [
      "序号",
      "页面名称",
      "差异位置",
      "设计表现",
      "开发表现",
      "修改内容",
      "设计稿图",
      "开发图",
      "优先级",
      "规则类型",
      "EvidenceConfidence",
      "Figma Node ID",
      "开发元素指纹",
      "动态策略",
      "分片序号",
      "滚动位置",
      "长图绝对坐标",
      "证据引用"
    ]
  );
  assert.equal(issues.getCell("A4").value, 1);
  assert.equal(issues.getCell("B4").value, "行情首页");
  assert.equal(issues.getCell("C4").value, "行情列表 / 最新价");
  assert.equal(issues.getCell("F4").value, "将最新价向左调整 8px。");
  assert.equal(issues.getCell("I4").value, "P1");
  assert.equal(issues.getCell("J4").value, "position");
  assert.equal(issues.getCell("K4").value, 0.97);
  assert.equal(issues.getCell("L4").value, "123:456");
  assert.equal(issues.getCell("M4").value, "figma:123:456");
  assert.equal(issues.getCell("N4").value, "normalize-market-value-text");
  assert.equal(issues.getCell("R4").value, "review-issue:issue-001");
});

test("includes AI comparison conclusions and prioritized improvements", async () => {
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: await report() }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const advice = workbook.getWorksheet("AI改进建议");
  assert.ok(advice);
  assert.deepEqual((advice.getRow(3).values as unknown[]).slice(1), [
    "页面名称",
    "AI 模型",
    "整体判断",
    "汇总证据引用",
    "优先级",
    "改进项",
    "原因",
    "建议动作",
    "建议证据引用"
  ]);
  assert.deepEqual((advice.getRow(4).values as unknown[]).slice(1), [
    "行情首页",
    "test-model",
    "页面缺少顶部模块，导致后续区域整体上移。",
    "review-issue:issue-001",
    1,
    "先补齐页面结构",
    "多个位置问题共享同一根因",
    "补齐顶部模块后重新走查",
    "review-issue:issue-001"
  ]);
});

test("provides a PageAlignment evidence index for AI advice reverse lookup", async () => {
  const pageReport = await report();
  pageReport.matching.pageAlignment = {
    summary: "利率观察模块整体上移 24px。",
    regions: [pageAlignmentRegion()],
    rejectedRegionCount: 0
  };
  pageReport.aiAdvice!.summaryEvidenceRefs = ["page-alignment:2:rate-observation"];
  pageReport.aiAdvice!.priorities[0].evidenceRefs = ["page-alignment:2:rate-observation"];

  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: pageReport }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const alignment = workbook.getWorksheet("页面结构对齐");
  assert.ok(alignment);
  assert.deepEqual((alignment.getRow(3).values as unknown[]).slice(1), [
    "调用方页面标识",
    "页面名称",
    "证据引用",
    "设计区域",
    "对齐状态",
    "开发区域",
    "整体位移",
    "决策来源",
    "EvidenceConfidence",
    "判断依据"
  ]);
  assert.deepEqual((alignment.getRow(4).values as unknown[]).slice(1), [
    "market-home",
    "行情首页",
    "page-alignment:2:rate-observation",
    "美联储观察 / 利率观察",
    "matched",
    ".rate-observation",
    "x 2px · y -24px",
    "deterministic",
    0.94,
    "三个稳定结构锚点形成一致位移。"
  ]);
  assert.equal(workbook.getWorksheet("AI改进建议")!.getCell("D4").value, "page-alignment:2:rate-observation");
  assert.equal(workbook.getWorksheet("AI改进建议")!.getCell("I4").value, "page-alignment:2:rate-observation");
});

test("embeds matching design and actual crops with a red issue outline", async () => {
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: await report() }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const sheet = workbook.getWorksheet("问题清单");
  assert.ok(sheet);
  assert.equal(sheet.getImages().length, 2);

  const media = (workbook.model as unknown as { media: Array<{ buffer: Buffer }> }).media;
  assert.equal(media.length, 2);
  const metadata = await Promise.all(media.map((item) => sharp(item.buffer).metadata()));
  assert.deepEqual(
    metadata.map(({ width, height }) => ({ width, height })),
    [{ width: 90, height: 72 }, { width: 90, height: 72 }]
  );
  for (const [index, placement] of sheet.getImages().entries()) {
    const ext = (placement.range as unknown as { ext: { width: number; height: number } }).ext;
    assert.ok(ext);
    const { width, height } = metadata[index];
    assert.ok(Math.abs(ext.width / ext.height - width! / height!) < 0.01, "embedded crop must preserve its aspect ratio");
  }
  for (const item of media) {
    const { data, info } = await sharp(item.buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let redPixels = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      if (data[offset] > 220 && data[offset + 1] < 60 && data[offset + 2] < 60) redPixels += 1;
    }
    assert.ok(redPixels > 100, "annotated crop should contain a visible red outline");
  }
});

test("uses independent design and actual coordinates for evidence crops", async () => {
  const pageReport = await report();
  pageReport.issues[0].location.designBox = { x: 10, y: 10, width: 50, height: 20 };
  pageReport.issues[0].location.actualBox = { x: 70, y: 70, width: 10, height: 10 };
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: pageReport }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const media = (workbook.model as unknown as { media: Array<{ buffer: Buffer }> }).media;
  const metadata = await Promise.all(media.map((item) => sharp(item.buffer).metadata()));

  assert.deepEqual(
    metadata.map(({ width, height }) => ({ width, height })),
    [{ width: 100, height: 62 }, { width: 70, height: 62 }]
  );
});

test("includes a page summary with verdict, similarity, issue count, and pending count", async () => {
  const pageReport = await report();
  pageReport.summary.pending = 1;
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: pageReport }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const summary = workbook.getWorksheet("页面汇总");
  assert.ok(summary);
  assert.deepEqual((summary.getRow(3).values as unknown[]).slice(1), [
    "调用方页面标识",
    "页面名称",
    "执行状态",
    "验收结论",
    "稳定区域相似度",
    "问题数量",
    "待确认数量",
    "整体视觉汇总"
  ]);
  assert.deepEqual((summary.getRow(4).values as unknown[]).slice(1), [
    "market-home",
    "行情首页",
    "succeeded",
    "failed",
    0.93,
    1,
    1,
    ""
  ]);
});

test("records evidence mode, viewport, duration, and diagnostics in run information", async () => {
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: await report() }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const runInfo = workbook.getWorksheet("运行信息");
  assert.ok(runInfo);
  assert.deepEqual((runInfo.getRow(4).values as unknown[]).slice(1), [
    "market-home",
    "行情首页",
    "live",
    "100 × 100",
    1320,
    "页面布局已稳定。"
  ]);
});

test("records tile, scroll, and absolute coordinates for a long-screenshot ReviewIssue", async () => {
  const pageReport = await report();
  pageReport.evidenceMode = "long_screenshot";
  pageReport.viewport = { width: 100, height: 240 };
  pageReport.issues[0].box = { x: 20, y: 124, width: 30, height: 16 };
  pageReport.issues[0].location.box = { x: 20, y: 124, width: 30, height: 16 };
  pageReport.issues[0].location.longScreenshot = {
    tileIndex: 1,
    scrollY: 100,
    absoluteBox: { x: 20, y: 124, width: 30, height: 16 }
  };
  const longReference = await sharp({
    create: { width: 100, height: 240, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  pageReport.images.reference = `data:image/png;base64,${longReference.toString("base64")}`;
  pageReport.images.actual = pageReport.images.reference;

  const artifact = await buildExcelReportArtifact({
    reviewName: "长行情页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-long", pageName: "长行情页", report: pageReport }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const issues = workbook.getWorksheet("问题清单");
  assert.ok(issues);
  assert.deepEqual((issues.getRow(3).values as unknown[]).slice(15, 18), [
    "分片序号",
    "滚动位置",
    "长图绝对坐标"
  ]);
  assert.deepEqual((issues.getRow(4).values as unknown[]).slice(15, 18), [
    2,
    100,
    "x 20px · y 124px · 30 × 16px"
  ]);
});

test("snapshots the effective rules used by each page", async () => {
  const artifact = await buildExcelReportArtifact({
    reviewName: "行情首页",
    locale: "zh-CN",
    pages: [{ clientPageId: "market-home", pageName: "行情首页", report: await report() }]
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const rules = workbook.getWorksheet("规则快照");
  assert.ok(rules);
  const rows = rules.getRows(4, rules.rowCount - 3)!.map((row) =>
    (row.values as unknown[]).slice(1)
  );
  assert.ok(rows.some((row) =>
    row[0] === "market-home" && row[2] === "thresholds.positionTolerancePx" && row[3] === 4
  ));
  assert.ok(rows.some((row) =>
    row[0] === "market-home" && row[2] === "rules.position" && row[3] === "error"
  ));
  assert.ok(rows.some((row) =>
    row[0] === "market-home" && row[2] === "capture.samples" && row[3] === 3
  ));
});

test("Excel includes passing property measurements and crops beyond the issue list", async () => {
  const page = await report();
  const box = { x: 5, y: 5, width: 20, height: 20 };
  page.matching.designCoverage = { policy: "design-driven", items: [{ figmaNodeId: "pass", name: "Passing label", status: "matched", reviewStatus: "passed", reasonCode: "verified-binding", issueIds: [], designBox: box, actualBox: box,
    checks: [{ property: "fontSize", rule: "typography", selector: ".label", actualBox: box, expected: 16, actual: 16, tolerance: 1, status: "passed", reason: "measured" }] }] };
  const artifact = await buildExcelReportArtifact({ reviewName: "test", pages: [{ clientPageId: "test", pageName: "test", report: page }], locale: "en" });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(artifact.buffer as never);
  const sheet = workbook.getWorksheet("Property Checks")!;
  assert.ok(sheet); assert.equal(sheet.getCell("C4").value, "fontSize"); assert.equal(sheet.getCell("G4").value, "passed");
  assert.equal(workbook.getWorksheet("Design Coverage")!.getImages().length, 2);
});

test("a confirmed missing module never receives an invented actual crop in Excel", async () => {
  const page = await report(); page.issues = [{ ...reviewIssue(), rule: "missing_module", actualBox: undefined, box: undefined,
    location: { figmaNodeId: "123:456", designBox: { x: 10, y: 10, width: 30, height: 30 }, description: "Missing" } }];
  const artifact = await buildExcelReportArtifact({ reviewName: "missing", pages: [{ clientPageId: "test", pageName: "test", report: page }], locale: "en" });
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(artifact.buffer as never);
  const sheet = workbook.worksheets[0]; assert.equal(sheet.getImages().length, 1);
});


test("moves whole-page visual findings to summary and hides technical identifiers", async () => {
  const page = await report();
  page.issues.unshift({ ...reviewIssue(), id: "visual-global", rule: "visual_similarity", summary: "整体视觉相似度未达标。" });
  const artifact = await buildExcelReportArtifact({ reviewName: "走查", locale: "zh-CN", pages: [{ clientPageId: "page", pageName: "首页", report: page }] });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const issues = workbook.getWorksheet("问题清单")!;
  assert.equal(issues.rowCount, 4);
  assert.equal(issues.getCell("J4").value, "position");
  assert.equal(issues.getColumn(13).hidden, true);
  assert.equal(workbook.getWorksheet("页面汇总")!.getCell("H4").value, "整体视觉相似度未达标。");
  assert.equal(workbook.getWorksheet("问题诊断")!.state, "hidden");
});


test("Excel leaves unmeasured similarity empty with a no-evaluation note", async () => {
  const page = await report();
  page.summary.stableSimilarity = 1;
  page.matching.visualScope = { reviewedPixels: 0, changedPixels: 0, excludedPixels: 10000, canvasPixels: 10000 };
  const artifact = await buildExcelReportArtifact({ reviewName: "走查", locale: "zh-CN", pages: [{ clientPageId: "page", pageName: "首页", report: page }] });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(artifact.buffer as never);
  const summary = workbook.getWorksheet("页面汇总")!;
  assert.equal(summary.getCell("E4").value, null);
  assert.match(String(summary.getCell("H4").value), /未评估.*无可靠对应区域/);
});

test("Excel shows measured design and actual typography and an exact adjustment rather than generic font advice", async () => {
  const page=await report();const issue=reviewIssue();
  issue.rule="typography";issue.figmaNodeId="weight";issue.title="未来利率预测 排版属性不一致";issue.summary="字重 400 → 500";
  delete issue.expected;delete issue.actual;
  issue.primaryAction="调整 body > div 的字体相关 CSS。";issue.selector="body > div";issue.location.description="未来利率预测";
  page.issues=[issue];page.matching.designCoverage={policy:"actual-driven",items:[{figmaNodeId:"weight",name:"未来利率预测",status:"matched",reasonCode:"verified-binding",issueIds:[issue.id],checks:[{property:"fontWeight",rule:"typography",selector:issue.selector,actualBox:issue.box!,expected:500,actual:400,status:"difference",reason:"measured"}]}]};
  const artifact=await buildExcelReportArtifact({reviewName:"test",pages:[{clientPageId:"test",pageName:"test",report:page}],locale:"zh-CN"});
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(artifact.buffer as never);const sheet=workbook.getWorksheet("问题清单")!;
  assert.equal(sheet.getCell("D4").value,"字重：500");assert.equal(sheet.getCell("E4").value,"字重：400");
  assert.match(String(sheet.getCell("F4").value),/字重.*400.*500/);
  assert.doesNotMatch(String(sheet.getCell("F4").value),/字号|行高|body|div|CSS/);
});

test("Excel explains unresolved actual coverage with known content and a verification action rather than empty values", async () => {
 const page=await report(); const issue=reviewIssue();issue.id="actual-coverage:card";issue.rule="actual_coverage_unverified";issue.severity="pending";issue.location.description="利率观察";delete issue.expected;delete issue.actual;page.issues=[issue];
 page.matching.designCoverage={policy:"actual-driven",items:[],actualItems:[{selector:".number",name:"20",actualBox:issue.box!,status:"covered-by-parent",reasonCode:"parent-finding",issueIds:[issue.id],coveredBy:issue.id},{selector:".heading",name:"下一次美联储议息决议公布",actualBox:issue.box!,status:"covered-by-parent",reasonCode:"parent-finding",issueIds:[issue.id],coveredBy:issue.id}]};
 const artifact=await buildExcelReportArtifact({reviewName:"test",pages:[{clientPageId:"test",pageName:"test",report:page}],locale:"zh-CN"});const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(artifact.buffer as never);const sheet=workbook.getWorksheet("问题清单")!;
 assert.match(String(sheet.getCell("D4").value),/对应关系.*未.*确认/);assert.match(String(sheet.getCell("E4").value),/下一次美联储议息决议公布/);
 assert.match(String(sheet.getCell("F4").value),/核验.*对应|确认.*对应/);assert.doesNotMatch(String(sheet.getCell("F4").value),/补齐|删除|向左调整/);
});

test("one Excel row summarizes all confirmed attribute differences without including passing attributes", async () => {
 const page=await report();const issue=reviewIssue();issue.rule="typography";delete issue.expected;delete issue.actual;page.issues=[issue];
 const check=(property:string,expected:string|number,actual:string|number,status:"difference"|"passed")=>({property,rule:"typography",selector:issue.selector!,actualBox:issue.box!,expected,actual,status,reason:"measured"});
 page.matching.designCoverage={policy:"actual-driven",items:[{figmaNodeId:issue.figmaNodeId!,name:"倒计时小时",status:"matched",reasonCode:"verified-binding",issueIds:[issue.id],checks:[check("fontFamily","DIN Pro","DINPro-Medium","difference"),check("fontSize",24,20,"difference"),check("lineHeight",30,30,"passed")]}]};
 const artifact=await buildExcelReportArtifact({reviewName:"test",pages:[{clientPageId:"test",pageName:"test",report:page}],locale:"zh-CN"});const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(artifact.buffer as never);const sheet=workbook.getWorksheet("问题清单")!;
 assert.equal(sheet.getCell("D4").value,"字体：DIN Pro；字号：24px");assert.equal(sheet.getCell("E4").value,"字体：DINPro-Medium；字号：20px");
 assert.match(String(sheet.getCell("F4").value),/差异.*字体.*DINPro-Medium.*DIN Pro.*字号.*20px.*24px/);
 assert.doesNotMatch(String(sheet.getCell("F4").value),/行高/);assert.equal(sheet.getCell("A5").value,null);
});
