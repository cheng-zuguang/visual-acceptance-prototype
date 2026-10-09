import { issuePresentation, similarityPresentation } from "../src/issue-presentation";
import ExcelJS from "exceljs";
import { reviewVerdict } from "../src/review-verdict";
import sharp from "sharp";
import type {
  Box,
  CompareReport,
  ExcelArtifact,
  ReviewPageResult,
  ReviewVerdict
} from "../src/types";
import type { Locale } from "./i18n";

export interface ExcelReportPageInput {
  recheck?: ReviewPageResult["recheck"];
  clientPageId: string;
  pageName: string;
  executionStatus?: ReviewPageResult["executionStatus"];
  verdict?: ReviewVerdict;
  report?: CompareReport;
  error?: ReviewPageResult["error"];
}

function bufferFromDataUrl(value: string): Buffer {
  const match = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(value);
  if (!match) throw new Error("Review image must be a base64 image data URL.");
  return Buffer.from(match[1], "base64");
}

async function annotatedCrop(
  imageDataUrl: string,
  viewport: { width: number; height: number },
  issueBox?: Box,
  contextBoxes: Box[] = []
): Promise<Buffer> {
  const image = sharp(bufferFromDataUrl(imageDataUrl)).resize(
    Math.max(1, Math.round(viewport.width)),
    Math.max(1, Math.round(viewport.height)),
    { fit: "fill" }
  );
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));
  const box = issueBox ?? { x: 0, y: 0, width, height };
  const paddingX = issueBox ? Math.max(40, Math.min(120, box.width * 0.5)) : 0;
  const paddingY = issueBox ? Math.max(32, Math.min(100, box.height * 0.5)) : 0;
  const nearby = contextBoxes.filter(candidate => candidate.width > 0 && candidate.height > 0 &&
    candidate.x < box.x + box.width + paddingX && candidate.x + candidate.width > box.x - paddingX &&
    candidate.y < box.y + box.height + paddingY && candidate.y + candidate.height > box.y - paddingY &&
    candidate.width <= Math.max(box.width * 3, 240) && candidate.height <= Math.max(box.height * 3, 200));
  const left = Math.max(0, Math.min(width - 1, Math.floor(Math.min(box.x - paddingX, ...nearby.map(b => b.x - 8)))));
  const top = Math.max(0, Math.min(height - 1, Math.floor(Math.min(box.y - paddingY, ...nearby.map(b => b.y - 8)))));
  const right = Math.min(width, Math.ceil(Math.max(box.x + box.width + paddingX, ...nearby.map(b => b.x + b.width + 8))));
  const bottom = Math.min(height, Math.ceil(Math.max(box.y + box.height + paddingY, ...nearby.map(b => b.y + b.height + 8))));
  const cropWidth = Math.max(1, right - left);
  const cropHeight = Math.max(1, bottom - top);
  const outlineX = Math.max(1, Math.round(box.x - left));
  const outlineY = Math.max(1, Math.round(box.y - top));
  const outlineWidth = Math.max(1, Math.min(cropWidth - outlineX - 1, Math.round(box.width)));
  const outlineHeight = Math.max(1, Math.min(cropHeight - outlineY - 1, Math.round(box.height)));
  const overlay = Buffer.from(
    `<svg width="${cropWidth}" height="${cropHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="${outlineX}" y="${outlineY}" width="${outlineWidth}" height="${outlineHeight}" fill="none" stroke="#ff0000" stroke-width="3"/></svg>`
  );
  return image
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .composite([{ input: overlay, left: 0, top: 0 }])
    .png()
    .toBuffer();
}

export interface BuildExcelReportArtifactInput {
  reviewName: string;
  locale: Locale;
  pages: ExcelReportPageInput[];
}

const CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;
const FONT_FAMILY = "Arial Unicode MS";

function verdictFor(report: CompareReport): ReviewVerdict {
  return reviewVerdict(report);
}

function asPageResult(page: ExcelReportPageInput): ReviewPageResult {
  const executionStatus = page.executionStatus ?? (page.report ? "succeeded" : "failed");
  return {
    clientPageId: page.clientPageId,
    pageName: page.pageName,
    executionStatus,
    ...(page.report ? { verdict: page.verdict ?? verdictFor(page.report), report: page.report } : {}),
    ...(page.error ? { error: page.error } : {})
  };
}

function safeFilename(value: string): string {
  const normalized = value.trim().replace(/[\\/:*?"<>|]/g, "-");
  return normalized || "UI走查";
}

function styleIssueSheet(sheet: ExcelJS.Worksheet, rowCount: number): void {
  sheet.mergeCells("A1:R1");
  sheet.views = [{ state: "frozen", ySplit: 3, xSplit: 2 }];
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 }
  };
  sheet.properties.defaultRowHeight = 22;
  sheet.getRow(1).height = 24;
  sheet.getRow(3).height = 30;
  sheet.getRow(1).font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: "FF111827" } };
  sheet.getRow(3).font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  sheet.getRow(3).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (let row = 4; row <= rowCount + 3; row += 1) {
    sheet.getRow(row).alignment = { vertical: "middle", wrapText: true };
  }
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 28;
  sheet.getColumn(4).width = 24;
  sheet.getColumn(5).width = 24;
  sheet.getColumn(6).width = 30;
  sheet.getColumn(7).width = 24;
  sheet.getColumn(8).width = 24;
  sheet.getColumn(9).width = 10;
  sheet.getColumn(10).width = 20;
  sheet.getColumn(11).width = 20;
  sheet.getColumn(12).width = 18;
  sheet.getColumn(13).width = 28;
  sheet.getColumn(14).width = 28;
  sheet.getColumn(15).width = 12;
  sheet.getColumn(16).width = 14;
  sheet.getColumn(17).width = 30;
  sheet.getColumn(18).width = 34;
  sheet.autoFilter = { from: "A3", to: "R3" };
}

function formatAbsoluteBox(box: Box | undefined): string {
  return box ? `x ${box.x}px · y ${box.y}px · ${box.width} × ${box.height}px` : "";
}

function formatDisplacement(displacement: { x: number; y: number } | undefined): string {
  return displacement ? `x ${displacement.x}px · y ${displacement.y}px` : "-";
}

function styleCompactSheet(sheet: ExcelJS.Worksheet, title: string, columns: number): void {
  sheet.views = [{ state: "frozen", ySplit: 3, showGridLines: false }];
  sheet.pageSetup = {
    orientation: "landscape",
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 }
  };
  sheet.getCell("A1").value = title;
  sheet.getCell("A1").font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: "FF111827" } };
  sheet.getRow(3).height = 28;
  sheet.getRow(3).font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  sheet.getRow(3).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  for (let column = 1; column <= columns; column += 1) sheet.getColumn(column).width = 22;
}

function flattenRuleSnapshot(
  value: unknown,
  prefix = ""
): Array<{ path: string; value: string | number | boolean }> {
  if (Array.isArray(value)) {
    return [{ path: prefix, value: value.join(", ") }];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flattenRuleSnapshot(child, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [{ path: prefix, value: value == null ? "" : value as string | number | boolean }];
}

export async function buildExcelReportArtifact(
  input: BuildExcelReportArtifactInput
): Promise<ExcelArtifact> {
  if (input.pages.some(page => page.recheck)) return buildRecheckExcel(input);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DiffLab";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(input.locale === "en" ? "Issues" : "问题清单", {
    views: [{ showGridLines: false }]
  });
  sheet.getCell("A1").value = `${input.reviewName} UI走查结果`;
  sheet.getRow(3).values = input.locale === "en"
    ? ["No.", "Page", "Location", "Design", "Actual", "Modification", "Design evidence", "Actual evidence", "Priority", "Rule", "EvidenceConfidence", "Figma Node ID", "Actual fingerprint", "Dynamic strategy", "Tile", "Scroll Y", "Long-page absolute coordinates", "Evidence ref"]
    : ["序号", "页面名称", "差异位置", "设计表现", "开发表现", "修改内容", "设计稿图", "开发图", "优先级", "规则类型", "EvidenceConfidence", "Figma Node ID", "开发元素指纹", "动态策略", "分片序号", "滚动位置", "长图绝对坐标", "证据引用"];

  let sequence = 0;
  for (const page of input.pages.map(asPageResult)) {
    for (const issue of (page.report?.issues ?? []).filter(item => item.rule !== "visual_similarity")) {
      const presentation = issuePresentation(issue, input.locale, page.report?.matching);
      sequence += 1;
      const row = sheet.addRow([
        sequence,
        page.pageName,
        presentation.location,
        presentation.expected ?? "-",
        presentation.actual ?? "-",
        presentation.suggestion,
        "",
        "",
        issue.priority,
        issue.rule,
        issue.evidenceConfidence.score,
        issue.figmaNodeId ?? "",
        issue.actualElementFingerprint ?? issue.selector ?? "",
        issue.dynamicStrategy ?? "",
        issue.location.longScreenshot ? issue.location.longScreenshot.tileIndex + 1 : "",
        issue.location.longScreenshot?.scrollY ?? "",
        formatAbsoluteBox(issue.location.longScreenshot?.absoluteBox),
        `review-issue:${issue.id}`
      ]);
      const [designCrop, actualCrop] = await Promise.all([
        annotatedCrop(
          page.report!.images.reference,
          page.report!.viewport,
          issue.location.designBox ?? issue.designBox ?? issue.location.box,
          (page.report!.matching.designCoverage?.items ?? []).flatMap(item => item.designBox ? [item.designBox] : [])
        ),
        issue.rule === "missing_module" ? Promise.resolve(undefined) : annotatedCrop(
          page.report!.images.actual,
          page.report!.viewport,
          issue.location.actualBox ?? issue.actualBox ?? issue.location.box,
          (page.report!.matching.designCoverage?.items ?? []).flatMap(item => item.actualBox ? [item.actualBox] : [])
        )
      ]);
      const designImageId = workbook.addImage({
        buffer: designCrop as never,
        extension: "png"
      });
      const actualImageId = actualCrop ? workbook.addImage({
        buffer: actualCrop as never,
        extension: "png"
      }) : undefined;
      if (!actualCrop) row.getCell(8).value = input.locale === "en" ? "Missing: no actual counterpart" : "缺失：无实际对应内容";
      const dimensions = async (buffer: Buffer) => {
        const metadata = await sharp(buffer).metadata();
        const scale = Math.min(164 / metadata.width!, 160 / metadata.height!);
        return { width: metadata.width! * scale, height: metadata.height! * scale };
      };
      const designSize = await dimensions(designCrop);
      const actualSize = actualCrop ? await dimensions(actualCrop) : undefined;
      row.height = Math.max(82, (Math.max(designSize.height, actualSize?.height ?? 0) + 12) * 0.75);
      sheet.addImage(designImageId, {
        tl: { col: 6.05, row: row.number - 0.95 },
        ext: designSize,
        editAs: "oneCell"
      });
      if (actualImageId !== undefined) sheet.addImage(actualImageId, {
        tl: { col: 7.05, row: row.number - 0.95 },
        ext: actualSize!,
        editAs: "oneCell"
      });
    }
  }
  styleIssueSheet(sheet, sequence);
  // Machine identifiers and positioning traces remain available on demand.
  for (let column = 10; column <= 18; column += 1) sheet.getColumn(column).hidden = true;
  sheet.getColumn(11).numFmt = "0.0%";

  const summary = workbook.addWorksheet(input.locale === "en" ? "Page Summary" : "页面汇总", {
    views: [{ showGridLines: false }]
  });
  styleCompactSheet(
    summary,
    input.locale === "en" ? "Page summary" : "页面汇总",
    8
  );
  summary.getRow(3).values = input.locale === "en"
    ? ["Client page ID", "Page", "Execution status", "Verdict", "Stable similarity", "Issues", "Pending", "Visual summary"]
    : ["调用方页面标识", "页面名称", "执行状态", "验收结论", "稳定区域相似度", "问题数量", "待确认数量", "整体视觉汇总"];
  for (const page of input.pages.map(asPageResult)) {
    summary.addRow([
      page.clientPageId,
      page.pageName,
      page.executionStatus,
      page.verdict,
      page.report?.matching.visualScope?.reviewedPixels === 0 ? null : page.report?.summary.stableSimilarity ?? null,
      page.report?.issues.filter(issue => issue.rule !== "visual_similarity").length ?? 0,
      page.report?.summary.pending ?? 0,
      [...(page.report?.matching.visualScope?.reviewedPixels === 0 ? [similarityPresentation(1, page.report.matching, input.locale)] : []), ...(page.report?.issues.filter(issue => issue.rule === "visual_similarity").map(issue => issue.summary) ?? [])].join("\n")
    ]);
  }
  summary.getColumn(5).numFmt = "0.0%";

  summary.getColumn(8).width = 50;
  summary.getColumn(8).alignment = { wrapText: true, vertical: "top" };
  const evidence = workbook.addWorksheet(input.locale === "en" ? "Issue Diagnostics" : "问题诊断", { state: "hidden" });
  evidence.addRow(["Page", "ReviewIssue", "SourceIssue", "Rule", "Severity", "Expected", "Actual", "Confidence", "Selector", "Figma Node ID"]);
  for (const page of input.pages) for (const issue of page.report?.issues ?? []) {
    for (const item of issue.evidence) evidence.addRow([page.pageName, issue.id, item.sourceIssueId, item.rule, item.severity ?? issue.severity, item.expected ?? "", item.actual ?? "", item.evidenceConfidence.score, issue.selector ?? "", issue.figmaNodeId ?? ""]);
  }
  const runInfo = workbook.addWorksheet(input.locale === "en" ? "Run Info" : "运行信息", {
    views: [{ showGridLines: false }]
  });
  styleCompactSheet(runInfo, input.locale === "en" ? "Run information" : "运行信息", 6);
  runInfo.getRow(3).values = input.locale === "en"
    ? ["Client page ID", "Page", "Evidence mode", "Viewport", "Duration (ms)", "Diagnostics"]
    : ["调用方页面标识", "页面名称", "证据模式", "Viewport", "耗时（ms）", "诊断"];
  for (const page of input.pages.map(asPageResult)) {
    const report = page.report;
    runInfo.addRow([
      page.clientPageId,
      page.pageName,
      report?.evidenceMode ?? "-",
      report ? `${report.viewport.width} × ${report.viewport.height}` : "-",
      report?.durationMs ?? null,
      report?.diagnostics.join("\n") ?? page.error?.message ?? "-"
    ]);
  }
  runInfo.getColumn(6).width = 56;
  runInfo.getColumn(6).alignment = { wrapText: true, vertical: "top" };

  const rules = workbook.addWorksheet(input.locale === "en" ? "Rule Snapshot" : "规则快照", {
    views: [{ showGridLines: false }]
  });
  styleCompactSheet(rules, input.locale === "en" ? "Effective rule snapshot" : "实际生效规则快照", 4);
  rules.getRow(3).values = input.locale === "en"
    ? ["Client page ID", "Page", "Rule path", "Effective value"]
    : ["调用方页面标识", "页面名称", "规则路径", "生效值"];
  for (const page of input.pages.map(asPageResult)) {
    if (!page.report) continue;
    for (const entry of flattenRuleSnapshot(page.report.rules)) {
      rules.addRow([page.clientPageId, page.pageName, entry.path, entry.value]);
    }
  }
  rules.getColumn(3).width = 42;
  rules.getColumn(4).width = 32;

  const coverage = workbook.addWorksheet(input.locale === "en" ? "Design Coverage" : "设计覆盖清单");
  styleCompactSheet(coverage, input.locale === "en" ? "Design coverage ledger" : "设计覆盖清单", 10);
  coverage.getRow(3).values = input.locale === "en"
    ? ["Page", "Node", "Name", "Correspondence", "Reason", "Actual", "Issue refs", "Review", "Design crop", "Actual crop"]
    : ["页面", "节点", "名称", "对应关系", "原因", "实际元素", "问题引用", "审查结果", "设计裁图", "实际裁图"];
  const scopeSheet = workbook.addWorksheet(input.locale === "en" ? "Review Scope" : "审查范围");
  styleCompactSheet(scopeSheet, input.locale === "en" ? "Measured pixel scope" : "像素审查范围", 5);
  scopeSheet.getRow(3).values = input.locale === "en" ? ["Page", "Reviewed pixels", "Changed pixels", "Exempt pixels", "Canvas pixels"] : ["页面", "已审查像素", "变化像素", "豁免像素", "整图像素"];
  for (const page of input.pages.map(asPageResult)) {
    const scope = page.report?.matching.visualScope;
    if (scope) scopeSheet.addRow([page.pageName, scope.reviewedPixels, scope.changedPixels, scope.excludedPixels, scope.canvasPixels]);
  }
  const checks = workbook.addWorksheet(input.locale === "en" ? "Property Checks" : "逐属性检查");
  styleCompactSheet(checks, input.locale === "en" ? "Measured checks and exemptions" : "测量检查与豁免", 10);
  checks.getRow(3).values = input.locale === "en" ? ["Page", "Node", "Property", "Design", "Actual", "Tolerance", "Result", "Reason", "Selector", "Actual box"]
    : ["页面", "节点", "属性", "设计值", "实际值", "容差", "结果", "原因", "实际元素", "实际坐标"];
  const actualCoverage = workbook.addWorksheet(input.locale === "en" ? "Actual Coverage" : "实际内容覆盖");
  styleCompactSheet(actualCoverage, input.locale === "en" ? "Actual content without design correspondence" : "无设计对应的实际内容", 6);
  actualCoverage.getRow(3).values = input.locale === "en" ? ["Page", "Name", "Selector", "Status", "Box", "Issue refs"] : ["页面", "名称", "元素", "状态", "坐标", "问题引用"];
  for (const page of input.pages.map(asPageResult)) {
    for (const item of [...(page.report?.matching.designCoverage?.items ?? [])].sort((a, b) => (a.designBox?.y ?? Infinity) - (b.designBox?.y ?? Infinity) || (a.designBox?.x ?? 0) - (b.designBox?.x ?? 0))) {
      const row = coverage.addRow([page.pageName, item.figmaNodeId, item.name, item.status, item.reasonCode, item.selector ?? "-", item.issueIds.map(id => `review-issue:${id}`).join(", "), item.reviewStatus ?? "pending"]);
      for (const [column, image, box] of [[8, page.report!.images.reference, item.designBox], [9, page.report!.images.actual, item.status === "missing" ? undefined : item.actualBox]] as const) {
        if (!box || box.width <= 0 || box.height <= 0 || box.x >= page.report!.viewport.width || box.y >= page.report!.viewport.height) continue;
        const buffer = await annotatedCrop(image, page.report!.viewport, box);
        const imageId = workbook.addImage({ buffer: buffer as never, extension: "png" });
        const meta = await sharp(buffer).metadata();
        const scale = Math.min(148 / meta.width!, 96 / meta.height!);
        coverage.addImage(imageId, { tl: { col: column + 0.05, row: row.number - 0.95 }, ext: { width: meta.width! * scale, height: meta.height! * scale }, editAs: "oneCell" });
        row.height = 82;
      }
      for (const check of item.checks ?? []) checks.addRow([page.pageName, item.figmaNodeId, check.property, check.expected ?? "—", check.actual ?? "—", check.tolerance ?? "—", check.status, check.reason, check.selector, formatAbsoluteBox(check.actualBox)]);
    }
    for (const item of page.report?.matching.designCoverage?.actualItems ?? []) actualCoverage.addRow([page.pageName, item.name, item.selector, item.status, formatAbsoluteBox(item.actualBox), item.issueIds.join(", ")]);
  }
  coverage.getColumn(9).width = 23; coverage.getColumn(10).width = 23;
  const pageAlignment = workbook.addWorksheet(
    input.locale === "en" ? "Page Alignment" : "页面结构对齐",
    { views: [{ showGridLines: false }] }
  );
  styleCompactSheet(
    pageAlignment,
    input.locale === "en" ? "Page alignment evidence index" : "页面结构对齐证据索引",
    10
  );
  pageAlignment.getRow(3).values = input.locale === "en"
    ? ["Client page ID", "Page", "Evidence ref", "Design region", "Alignment status", "Actual region", "Displacement", "Decision source", "EvidenceConfidence", "Rationale"]
    : ["调用方页面标识", "页面名称", "证据引用", "设计区域", "对齐状态", "开发区域", "整体位移", "决策来源", "EvidenceConfidence", "判断依据"];
  for (const page of input.pages.map(asPageResult)) {
    for (const region of page.report?.matching.pageAlignment.regions ?? []) {
      pageAlignment.addRow([
        page.clientPageId,
        page.pageName,
        `page-alignment:${region.designParentFigmaNodeId}`,
        region.designPath.join(" / "),
        region.status,
        region.actualParentSelector ?? "-",
        formatDisplacement(region.displacement),
        region.source,
        region.evidenceConfidence.score,
        region.reason
      ]);
    }
  }
  pageAlignment.getColumn(3).width = 40;
  pageAlignment.getColumn(4).width = 36;
  pageAlignment.getColumn(6).width = 38;
  pageAlignment.getColumn(10).width = 48;
  pageAlignment.getColumn(9).numFmt = "0.0%";
  pageAlignment.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) row.alignment = { vertical: "top", wrapText: true };
  });

  const aiAdvice = workbook.addWorksheet(input.locale === "en" ? "AI Advice" : "AI改进建议", {
    views: [{ showGridLines: false }]
  });
  styleCompactSheet(aiAdvice, input.locale === "en" ? "AI comparison conclusions" : "AI 比对判断与改进建议", 9);
  aiAdvice.getRow(3).values = input.locale === "en"
    ? ["Page", "AI model", "Overall assessment", "Summary evidence refs", "Priority", "Improvement", "Reason", "Suggested action", "Priority evidence refs"]
    : ["页面名称", "AI 模型", "整体判断", "汇总证据引用", "优先级", "改进项", "原因", "建议动作", "建议证据引用"];
  for (const page of input.pages.map(asPageResult)) {
    const advice = page.report?.aiAdvice;
    if (!advice) continue;
    const summaryEvidenceRefs = advice.summaryEvidenceRefs.join("\n") || "-";
    if (advice.priorities.length === 0) {
      aiAdvice.addRow([
        page.pageName,
        advice.model ?? "-",
        advice.summary,
        summaryEvidenceRefs,
        "-",
        "-",
        "-",
        "-",
        "-"
      ]);
      continue;
    }
    advice.priorities.forEach((item, index) => {
      aiAdvice.addRow([
        page.pageName,
        advice.model ?? "-",
        advice.summary,
        summaryEvidenceRefs,
        index + 1,
        item.title,
        item.reason,
        item.action,
        item.evidenceRefs.join("\n") || "-"
      ]);
    });
  }
  aiAdvice.getColumn(3).width = 48;
  aiAdvice.getColumn(4).width = 36;
  aiAdvice.getColumn(6).width = 30;
  aiAdvice.getColumn(7).width = 42;
  aiAdvice.getColumn(8).width = 42;
  aiAdvice.getColumn(9).width = 36;
  aiAdvice.eachRow((row, rowNumber) => {
    if (rowNumber >= 4) row.alignment = { vertical: "top", wrapText: true };
  });

  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.font = { ...cell.font, name: FONT_FAMILY };
      });
    });
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    kind: "excel",
    filename: `${safeFilename(input.reviewName)}UI走查结果.xlsx`,
    contentType: CONTENT_TYPE,
    buffer
  };
}

async function buildRecheckExcel(input: BuildExcelReportArtifactInput): Promise<ExcelArtifact> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DiffLab";
  const sheet = workbook.addWorksheet(input.locale === "en" ? "Issue Rechecks" : "问题复核");
  styleCompactSheet(sheet, input.locale === "en" ? "Selected issue verification (not whole-page acceptance)" : "指定问题复核（非整页验收）", 11);
  sheet.getRow(3).values = ["Page", "Issue ID", "Rule", "Property", "Figma node", "Verdict", "Reason", "Message", "Evidence refs", "Design crop", "Actual crop"];
  const checks = workbook.addWorksheet(input.locale === "en" ? "Property Checks" : "逐属性检查");
  checks.addRow(["Issue ID", "Property", "Expected", "Actual", "Tolerance", "Status", "Reason", "Selector"]);
  for (const page of input.pages) {
    const target = page.recheck;
    if (!target) continue;
    const row = sheet.addRow([page.pageName, target.issueId, target.rule, target.property ?? "", target.figmaNodeId,
      target.verdict, target.reasonCode, target.message, target.evidenceRefs.join(", ")]);
    row.height = 90;
    for (const check of target.checks) checks.addRow([target.issueId, check.property, check.expected ?? "", check.actual ?? "", check.tolerance ?? "", check.status, check.reason, check.selector]);
    if (!page.report) continue;
    for (const [column, source, box] of [[9, page.report.images.reference, target.designBox], [10, page.report.images.actual, target.actualBox]] as const) {
      if (!box || box.width <= 0 || box.height <= 0 || box.x >= page.report.viewport.width || box.y >= page.report.viewport.height) continue;
      const buffer = await annotatedCrop(source, page.report.viewport, box);
      const meta = await sharp(buffer).metadata();
      const scale = Math.min(148 / meta.width!, 96 / meta.height!);
      const id = workbook.addImage({ buffer: buffer as never, extension: "png" });
      sheet.addImage(id, { tl: { col: column, row: row.number - 1 }, ext: { width: meta.width! * scale, height: meta.height! * scale } });
    }
  }
  sheet.getColumn(8).width = 55;
  sheet.getColumn(10).width = 24;
  sheet.getColumn(11).width = 24;
  sheet.eachRow(row => { row.alignment = { wrapText: true, vertical: "top" }; });
  return { kind: "excel", filename: `${safeFilename(input.reviewName)}-recheck.xlsx`, contentType: CONTENT_TYPE,
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()) };
}
