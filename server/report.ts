import { issuePresentation, similarityPresentation } from "../src/issue-presentation";
import { randomUUID } from "node:crypto";
import { reviewVerdict } from "../src/review-verdict";
import type {
  AcceptanceConfig,
  AiAdvice,
  AiAdviceRejection,
  CompareReport,
  DynamicNormalizationSummary,
  ElementMatchingEvidence,
  Issue,
  PageAlignmentPlan,
  PageAlignmentRegionDecision,
  ReviewIssue
} from "../src/types";
import type { ComparisonResult } from "./compare";
import { localText, type Locale } from "./i18n";
import { buildStructureReportModel } from "../src/structure-report";

function incompleteReviewWarning(input: {issues: ReviewIssue[]; matching: ElementMatchingEvidence}, locale: Locale): string {
  const model = buildStructureReportModel(input);
  if (input.matching.designCoverage?.policy === "actual-driven") {
    return model.incomplete ? localText(locale, "元素对应关系审查未完整完成，请复核待确认项或重新走查。", "Element correspondence review is incomplete; inspect pending findings or rerun the review.") : "";
  }
  if (model.coverageIncomplete) return localText(locale,
    "设计覆盖未完成：仍有设计区域未能验证。规则通过不代表所有设计项已验收，请核查待确认问题与覆盖清单。",
    "Design coverage is incomplete: some regions remain unverified. Passing measured rules does not establish full design acceptance; inspect pending findings and the coverage ledger.");
  return model.incomplete ? localText(locale,
    "AI 结构审查失败，本次审查不完整。缺失数量为 0 不代表没有缺失；请重新走查。",
    "AI structural review failed; this review is incomplete. Zero missing modules does not mean none are missing. Please run the review again.") : "";
}

function dataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function severityLabel(locale: Locale): Record<Issue["severity"], string> {
  return locale === "en"
    ? { error: "Error", warning: "Warning", pending: "Pending", info: "Info" }
    : { error: "错误", warning: "警告", pending: "待确认", info: "信息" };
}

function markdownCell(value: unknown): string {
  return String(value ?? "-")
    .replaceAll("|", "\\|")
    .replace(/\r?\n/g, "<br>");
}

function markdownEvidenceRefs(
  refs: AiAdvice["summaryEvidenceRefs"],
  locale: Locale
): string {
  return refs
    .map((ref) => `\`${ref.replaceAll("`", "\\`")}\``)
    .join(locale === "en" ? ", " : "、") || "-";
}

function evidenceAnchor(ref: string): string {
  return `evidence-${encodeURIComponent(ref)}`;
}

function htmlEvidenceRefs(refs: AiAdvice["summaryEvidenceRefs"]): string {
  return refs
    .map((ref) => `<a href="#${evidenceAnchor(ref)}"><code>${escapeHtml(ref)}</code></a>`)
    .join(" ") || "-";
}

function validateAiAdviceEvidenceRefs(input: {
  advice?: AiAdvice;
  issues: ReviewIssue[];
  pageAlignment: PageAlignmentPlan;
  locale: Locale;
}): { advice?: AiAdvice; rejection?: AiAdviceRejection } {
  if (!input.advice) return {};
  const allowedRefs = new Set<string>([
    ...input.issues.map((issue) => `review-issue:${issue.id}`),
    ...input.pageAlignment.regions
      .filter((region) => region.status === "matched" && Boolean(region.actualParentSelector))
      .map((region) => `page-alignment:${region.designParentFigmaNodeId}`)
  ]);
  const locations: AiAdviceRejection["locations"] = [];
  const addLocation = (
    scope: "summary" | "priority",
    refs: AiAdvice["summaryEvidenceRefs"],
    priorityNumber?: number
  ) => {
    if (refs.length === 0) {
      locations.push({ scope, ...(priorityNumber ? { priorityNumber } : {}), reason: "missing", refs: [] });
      return;
    }
    const unresolved = refs.filter((ref) => !allowedRefs.has(ref));
    if (unresolved.length > 0) {
      locations.push({
        scope,
        ...(priorityNumber ? { priorityNumber } : {}),
        reason: "unresolved",
        refs: [...new Set(unresolved)]
      });
    }
  };
  addLocation("summary", input.advice.summaryEvidenceRefs);
  input.advice.priorities.forEach((priority, index) => {
    addLocation("priority", priority.evidenceRefs, index + 1);
  });
  if (locations.length === 0) {
    return { advice: input.advice };
  }
  const unresolvedRefs = [...new Set(
    locations.flatMap((location) => location.reason === "unresolved" ? location.refs : [])
  )];
  const missingEvidenceLocations = locations
    .filter((location) => location.reason === "missing")
    .map((location) => location.scope === "summary"
      ? localText(input.locale, "汇总", "summary")
      : localText(input.locale, `建议 ${location.priorityNumber}`, `priority ${location.priorityNumber}`)
    );
  const details = [
    ...(missingEvidenceLocations.length > 0
      ? [localText(
          input.locale,
          `缺少证据引用：${missingEvidenceLocations.join("、")}`,
          `missing evidence refs: ${missingEvidenceLocations.join(", ")}`
        )]
      : []),
    ...(unresolvedRefs.length > 0
      ? [localText(
          input.locale,
          `证据引用无法解析：${unresolvedRefs.join("、")}`,
          `unresolved evidence refs: ${unresolvedRefs.join(", ")}`
        )]
      : [])
  ];
  const message = localText(
      input.locale,
      `AI 建议未发布：${details.join("；")}。`,
      `AI advice was not published: ${details.join("; ")}.`
    );
  return {
    rejection: {
      code: "evidence_integrity_failed",
      message,
      danglingRefs: unresolvedRefs,
      locations
    }
  };
}

function issueTable(
  issues: ReviewIssue[],
  pageName: string,
  locale: Locale
): string {
  if (!issues.length) {
    return localText(locale, "未发现超出验收阈值的问题。", "No issues exceeded the acceptance thresholds.");
  }
  const labels = severityLabel(locale);
  const headers = locale === "en"
    ? ["No.", "Page", "Location", "Design", "Actual", "Modification", "Design evidence", "Actual evidence", "Priority", "Confidence", "Evidence ref"]
    : ["序号", "页面名称", "差异位置", "设计稿表现", "开发表现", "修改内容", "设计稿图", "开发图", "优先级", "置信度", "证据引用"];
  const rows = issues.filter(issue => issue.rule !== "visual_similarity").map((issue, index) => [
    index + 1,
    pageName,
    `${issuePresentation(issue, locale).location} · ${issuePresentation(issue, locale).title}`,
    issue.expected ?? "-",
    issue.actual ?? "-",
    issuePresentation(issue, locale).suggestion,
    localText(locale, "见设计基准图", "See design reference"),
    localText(locale, "见开发实际图", "See actual evidence"),
    `${issue.priority} / ${labels[issue.severity]}`,
    `${Math.round(issue.evidenceConfidence.score * 100)}% · ${issue.evidenceConfidence.basis.join(" + ")}`,
    `\`review-issue:${issue.id}\``
  ]);
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function displacementLabel(
  displacement: { x: number; y: number } | undefined
): string {
  if (!displacement) return "-";
  return `x ${displacement.x}px / y ${displacement.y}px`;
}

function anchorStatsLabel(
  region: PageAlignmentRegionDecision,
  locale: Locale
): string {
  const stats = region.anchorStats;
  const residual = stats.residualPx === null ? "-" : `${stats.residualPx}px`;
  return localText(
    locale,
    `候选 ${stats.candidateCount} · 稳定 ${stats.stableCount} · 动态排除 ${stats.dynamicExcludedCount} · 结构 ${stats.structuralAnchorCount} · RANSAC 内点 ${stats.inlierCount} · 残差 ${residual}`,
    `Candidates ${stats.candidateCount} · stable ${stats.stableCount} · dynamic excluded ${stats.dynamicExcludedCount} · structural ${stats.structuralAnchorCount} · RANSAC inliers ${stats.inlierCount} · residual ${residual}`
  );
}

function scorePercent(value: number): string {
  return `${Math.round(value * 10_000) / 100}%`;
}

function scoreBreakdownLabel(
  region: PageAlignmentRegionDecision,
  locale: Locale
): string {
  const breakdown = region.scoreBreakdown;
  const labels = locale === "en"
    ? {
        stabilityCoverage: "Stable coverage",
        anchorSufficiency: "Anchor sufficiency",
        inlierRatio: "Inlier ratio",
        residualQuality: "Residual quality",
        dynamicCleanliness: "Dynamic cleanliness",
        structuralSupport: "Structural support"
      }
    : {
        stabilityCoverage: "稳定覆盖",
        anchorSufficiency: "锚点充足",
        inlierRatio: "内点率",
        residualQuality: "残差质量",
        dynamicCleanliness: "动态纯净",
        structuralSupport: "结构支持"
      };
  const components = Object.entries(breakdown.components).map(([name, item]) =>
    `${labels[name as keyof typeof labels]} ${scorePercent(item.value)}×${scorePercent(item.weight)}=${scorePercent(item.contribution)}`
  );
  return [
    ...components,
    localText(locale, `加权 ${scorePercent(breakdown.weightedScore)}`, `Weighted ${scorePercent(breakdown.weightedScore)}`),
    localText(locale, `上限 ${scorePercent(breakdown.baseScoreCap)}`, `Cap ${scorePercent(breakdown.baseScoreCap)}`),
    localText(locale, `最终 ${scorePercent(breakdown.finalScore)}`, `Final ${scorePercent(breakdown.finalScore)}`),
    `H≥${scorePercent(breakdown.levelThresholds.highMin)} · M≥${scorePercent(breakdown.levelThresholds.mediumMin)} · L≥${scorePercent(breakdown.levelThresholds.lowMin)}`
  ].join(" · ");
}

function pageAlignmentMarkdown(
  plan: PageAlignmentPlan | undefined,
  locale: Locale
): string {
  if (!plan || (!plan.summary && plan.regions.length === 0)) return "";
  const status = locale === "en"
    ? { matched: "Matched", "missing-in-actual": "Missing in actual", uncertain: "Uncertain" }
    : { matched: "已匹配", "missing-in-actual": "开发页缺失", uncertain: "待确认" };
  const headers = locale === "en"
    ? ["Design region", "Status", "Actual region", "Displacement", "Anchor stats", "Score breakdown", "Confidence", "Evidence", "Evidence ref"]
    : ["设计模块", "状态", "开发区域", "整体位移", "锚点统计", "评分分量", "置信度", "判断依据", "证据引用"];
  const rows = plan.regions.map((region) => [
    region.designPath.join(" / ") || region.designParentFigmaNodeId,
    status[region.status],
    region.actualParentSelector ?? "-",
    displacementLabel(region.displacement),
    anchorStatsLabel(region, locale),
    scoreBreakdownLabel(region, locale),
    `${Math.round(region.evidenceConfidence.score * 100)}%`,
    region.reason,
    `\`page-alignment:${region.designParentFigmaNodeId}\``
  ]);
  return `${locale === "en" ? "## Page structure alignment" : "## 页面结构对齐"}

${plan.summary || "-"}

| ${headers.join(" | ")} |
| ${headers.map(() => "---").join(" | ")} |
${rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`).join("\n")}
${plan.rejectedRegionCount > 0
    ? `\n${localText(locale, `已拒绝 ${plan.rejectedRegionCount} 条无法验证的模块判断。`, `${plan.rejectedRegionCount} unverifiable region decision(s) were rejected.`)}`
    : ""}
`;
}

function pageAlignmentHtml(
  plan: PageAlignmentPlan | undefined,
  locale: Locale
): string {
  if (!plan || (!plan.summary && plan.regions.length === 0)) return "";
  const status = locale === "en"
    ? { matched: "Matched", "missing-in-actual": "Missing in actual", uncertain: "Uncertain" }
    : { matched: "已匹配", "missing-in-actual": "开发页缺失", uncertain: "待确认" };
  const headers = locale === "en"
    ? ["Design region", "Status", "Actual region", "Displacement", "Anchor stats", "Score breakdown", "Confidence", "Evidence", "Evidence ref"]
    : ["设计模块", "状态", "开发区域", "整体位移", "锚点统计", "评分分量", "置信度", "判断依据", "证据引用"];
  const rows = plan.regions.map((region) => {
    const ref = `page-alignment:${region.designParentFigmaNodeId}`;
    return `<tr id="${evidenceAnchor(ref)}">
    <td>${escapeHtml(region.designPath.join(" / ") || region.designParentFigmaNodeId)}</td>
    <td>${escapeHtml(status[region.status])}</td>
    <td>${escapeHtml(region.actualParentSelector ?? "-")}</td>
    <td>${escapeHtml(displacementLabel(region.displacement))}</td>
    <td>${escapeHtml(anchorStatsLabel(region, locale))}</td>
    <td>${escapeHtml(scoreBreakdownLabel(region, locale))}</td>
    <td>${Math.round(region.evidenceConfidence.score * 100)}%</td>
    <td>${escapeHtml(region.reason)}</td>
    <td><code>${escapeHtml(ref)}</code></td>
  </tr>`;
  }).join("");
  const rejected = plan.rejectedRegionCount > 0
    ? `<p class="alignment-rejections">${escapeHtml(localText(
        locale,
        `已拒绝 ${plan.rejectedRegionCount} 条无法验证的模块判断。`,
        `${plan.rejectedRegionCount} unverifiable region decision(s) were rejected.`
      ))}</p>`
    : "";
  return `<section class="panel page-alignment">
    <h2>${localText(locale, "页面结构对齐", "Page structure alignment")}</h2>
    <p>${escapeHtml(plan.summary || "-")}</p>
    <table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
    ${rejected}
  </section>`;
}

function coverageTable(matching: ElementMatchingEvidence, locale: Locale, html: boolean): string {
  const coverage = matching.designCoverage;
  if (!coverage) return "";
  const en = locale === "en";
  const title = localText(locale, "设计覆盖清单", "Design coverage ledger");
  const headers = en ? ["Node", "Name", "Correspondence", "Review", "Reason", "Actual", "Issue refs"] : ["节点", "名称", "对应关系", "审查结果", "原因", "实际元素", "问题引用"];
  const table = (heads: string[], rows: string[][]) => html
    ? `<table><thead><tr>${heads.map(cell => `<th scope="col">${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
    : `| ${heads.join(" | ")} |\n| ${heads.map(() => "---").join(" | ")} |\n${rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`).join("\n")}`;
  const items = [...coverage.items].sort((a, b) => (a.designBox?.y ?? Infinity) - (b.designBox?.y ?? Infinity) || (a.designBox?.x ?? 0) - (b.designBox?.x ?? 0));
  const rows = items.map(item => [item.figmaNodeId, item.name, item.status, item.reviewStatus ?? "pending", item.reasonCode, item.selector ?? "-", item.issueIds.map(id => `review-issue:${id}`).join(", ") || "-"]);
  const checkHeads = en ? ["Property", "Design", "Actual", "Tolerance", "Result", "Reason", "Selector / actual box"] : ["属性", "设计值", "实际值", "容差", "结果", "原因", "实际元素 / 坐标"];
  const checks = items.map(item => {
    const detail = table(checkHeads, (item.checks ?? []).map(check => [check.property, String(check.expected ?? "—"), String(check.actual ?? "—"), String(check.tolerance ?? "—"), check.status, check.reason, `${check.selector} · ${JSON.stringify(check.actualBox)}`]));
    const coords = `Design: ${JSON.stringify(item.designBox ?? null)} / Actual: ${JSON.stringify(item.actualBox ?? null)}${item.displacement ? ` · Displacement y ${item.displacement.y}px; explained ${item.displacement.explainedY}px; unverified remainder ${item.displacement.unexplainedY}px (${item.displacement.causeStatus})` : ""}`;
    const crop = (box: typeof item.designBox, source: string) => box && box.width > 0 && box.height > 0 ? `<svg role="img" aria-label="${source}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" style="width:45%;max-height:200px"><use href="#coverage-${source}" /></svg>` : "";
    return html ? `<details><summary>${escapeHtml(item.name)} · ${escapeHtml(item.reviewStatus ?? "pending")}</summary><p>${escapeHtml(coords)}</p>${crop(item.designBox, "design")}${item.status !== "missing" ? crop(item.actualBox, "actual") : "<p>Missing / 缺失</p>"}${detail}</details>`
      : `### ${markdownCell(item.name)} · ${item.figmaNodeId}\n\n${coords}\n\n${detail}`;
  }).join(html ? "" : "\n\n");
  const scope = matching.visualScope;
  const scopeText = scope ? `${en ? "Pixel scope: reviewed / excluded / canvas" : "像素范围：已审查 / 已豁免 / 整图"} ${scope.reviewedPixels} / ${scope.excludedPixels} / ${scope.canvasPixels}` : "";
  const extras = table(en ? ["Extra actual content", "Selector", "Status", "Box", "Issue refs"] : ["无设计对应的实际内容", "元素", "状态", "坐标", "问题引用"],
    (coverage.actualItems ?? []).map(item => [item.name, item.selector, item.status, JSON.stringify(item.actualBox), item.issueIds.join(", ")]));
  return html ? `<details class="panel page-alignment"><summary>${title} (${rows.length}) · ${en ? "Expand diagnostics" : "展开诊断明细"}</summary><p>${escapeHtml(scopeText)}</p>${table(headers, rows)}${checks}${extras}</details>`
    : `## ${title}\n\n${scopeText}\n\n${table(headers, rows)}\n\n${checks}\n\n${extras}`;
}

function moduleVerification(issues: ReviewIssue[], locale: Locale, html: boolean): string {
  const modules = issues.filter(issue => issue.coverageModule && issue.rule === "design_coverage_unverified");
  if (!modules.length) return "";
  const title = localText(locale, "模块核验建议（非确认缺失）", "Modules to verify (not confirmed missing)");
  if (html) return `<section class="panel"><h2>${title}</h2><ul>${modules.map(issue => `<li><b>${escapeHtml(issue.title)}</b><p>${escapeHtml(issue.primaryAction)}</p>${htmlEvidenceRefs([`review-issue:${issue.id}`])}</li>`).join("")}</ul></section>`;
  return `## ${title}\n\n${modules.map(issue => `- ${markdownCell(issue.title)}：${markdownCell(issue.primaryAction)} (${markdownEvidenceRefs([`review-issue:${issue.id}`], locale)})`).join("\n")}`;
}

function markdownFor(input: {
  status: CompareReport["status"];
  similarity: number;
  issues: ReviewIssue[];
  source: CompareReport["source"];
  viewport: CompareReport["viewport"];
  matching: ElementMatchingEvidence;
  dynamicNormalization: DynamicNormalizationSummary;
  aiAdvice?: AiAdvice;
  locale: Locale;
  evidenceMode: CompareReport["evidenceMode"];
}): string {
  const errors = input.issues.filter((issue) => issue.severity === "error").length;
  const warnings = input.issues.filter((issue) => issue.severity === "warning").length;
  const pending = input.issues.filter((issue) => issue.severity === "pending").length;
  const issuesTable = issueTable(input.issues, input.source.design, input.locale);
  const visualSummary = input.issues.filter(issue => issue.rule === "visual_similarity")
    .map(issue => `${issue.summary} (${markdownEvidenceRefs([`review-issue:${issue.id}`], input.locale)})`).join("\n\n");
  const alignment = [incompleteReviewWarning(input, input.locale), moduleVerification(input.issues, input.locale, false), coverageTable(input.matching, input.locale, false), pageAlignmentMarkdown(input.matching.pageAlignment, input.locale)].filter(Boolean).join("\n\n");
  if (input.locale === "en") {
    return `# Visual Acceptance Report

**Result: ${input.status === "passed" ? "Passed" : input.status === "needs_review" ? "Needs review" : "Failed"}**

- Design source: ${input.source.design}
- Actual source: ${input.source.actual}
- Evidence mode: ${input.evidenceMode}
- Viewport: ${input.viewport.width} × ${input.viewport.height}
- Stable-region similarity: ${similarityPresentation(input.dynamicNormalization.stableSimilarity, input.matching, input.locale)}
- Dynamic-region ratio: ${(input.dynamicNormalization.dynamicRegionAreaRatio * 100).toFixed(2)}%
- Normalization strategies: ${input.dynamicNormalization.strategies.join(", ") || "none"}
- Errors: ${errors}; warnings: ${warnings}; pending: ${pending}
- Intersection coverage: ${input.matching.matches.length} matched; ${input.matching.unmatchedDesignCount} design unmatched; ${input.matching.unmatchedActualCount} actual unmatched

${visualSummary}

${alignment}

${
  input.aiAdvice
    ? `## AI Improvement Advice

${input.aiAdvice.summary}

Summary evidence: ${markdownEvidenceRefs(input.aiAdvice.summaryEvidenceRefs, input.locale)}

${input.aiAdvice.priorities.map((item, index) => `${index + 1}. **${item.title}**: ${item.reason}; ${item.action}\n   - Evidence refs: ${markdownEvidenceRefs(item.evidenceRefs, input.locale)}`).join("\n")}
`
    : ""
}
## Issues

${issuesTable}

---

Generated by the DiffLab throwaway prototype. Pass/fail is determined exclusively by the YAML rules; AI does not participate in the gate.
`;
  }
  return `# 视觉验收报告

**结论：${input.status === "passed" ? "通过" : input.status === "needs_review" ? "待复核" : "不通过"}**

- 设计来源：${input.source.design}
- 实际来源：${input.source.actual}
- 证据模式：${input.evidenceMode}
- 视口：${input.viewport.width} × ${input.viewport.height}
- 稳定区域相似度：${similarityPresentation(input.dynamicNormalization.stableSimilarity, input.matching, input.locale)}
- 动态区域占比：${(input.dynamicNormalization.dynamicRegionAreaRatio * 100).toFixed(2)}%
- 归一化策略：${input.dynamicNormalization.strategies.join("、") || "无"}
- 错误：${errors}；警告：${warnings}；待确认：${pending}
- 交集覆盖：匹配 ${input.matching.matches.length}；设计未匹配 ${input.matching.unmatchedDesignCount}；开发未匹配 ${input.matching.unmatchedActualCount}

${visualSummary}

${alignment}

${
  input.aiAdvice
    ? `## AI 改进建议

${input.aiAdvice.summary}

汇总证据：${markdownEvidenceRefs(input.aiAdvice.summaryEvidenceRefs, input.locale)}

${input.aiAdvice.priorities.map((item, index) => `${index + 1}. **${item.title}**：${item.reason}；${item.action}\n   - 建议证据：${markdownEvidenceRefs(item.evidenceRefs, input.locale)}`).join("\n")}
`
    : ""
}
## 问题清单

${issuesTable}

---

此报告由 DiffLab 可抛弃原型生成。通过/不通过仅由 YAML 规则决定，AI 不参与门禁。
`;
}

function htmlFor(report: Omit<CompareReport, "reportHtml">, locale: Locale): string {
  const labels = severityLabel(locale);
  const text = locale === "en"
    ? {
        expected: "Expected", actual: "Actual", suggestion: "Suggestion", title: "DiffLab Visual Acceptance Report",
        passed: "Acceptance passed", failed: "Acceptance failed", versus: "compared with", viewport: "viewport",
        similarity: "Stable-region similarity", dynamicRatio: "Dynamic-region ratio", strategy: "Normalization strategies", errors: "Errors", warnings: "Warnings", pending: "Pending",
        reference: "Design reference", actualImage: "H5 screenshot", diff: "Difference heatmap",
        empty: "No issues exceeded the acceptance thresholds.", issues: "Issue table", no: "No.", page: "Page", location: "Location", design: "Design", actualValue: "Actual", modification: "Modification", designEvidence: "Design evidence", actualEvidence: "Actual evidence", priority: "Priority", confidence: "Confidence", evidenceRef: "Evidence ref", seeDesign: "See design reference", seeActual: "See actual evidence", aiTitle: "AI improvement advice", aiPriority: "Priority"
      }
    : {
        expected: "设计值", actual: "实际值", suggestion: "建议", title: "DiffLab 视觉验收报告",
        passed: "通过验收", failed: "未通过验收", versus: "对比", viewport: "视口",
        similarity: "稳定区域相似度", dynamicRatio: "动态区域占比", strategy: "归一化策略", errors: "错误", warnings: "警告", pending: "待确认",
        reference: "设计基准", actualImage: "H5 实际截图", diff: "差异热力图",
        empty: "未发现超出验收阈值的问题。", issues: "问题清单", no: "序号", page: "页面名称", location: "差异位置", design: "设计稿表现", actualValue: "开发表现", modification: "修改内容", designEvidence: "设计稿图", actualEvidence: "开发图", priority: "优先级", confidence: "置信度", evidenceRef: "证据引用", seeDesign: "查看设计基准", seeActual: "查看开发实际", aiTitle: "AI 改进建议", aiPriority: "优先级"
      };
  const issues = report.issues.filter(issue => issue.rule !== "visual_similarity")
    .map(
      (issue, index) => {
        const ref = `review-issue:${issue.id}`;
        return `<tr class="${issue.severity}" id="${evidenceAnchor(ref)}">
        <td>${index + 1}</td>
        <td>${escapeHtml(report.source.design)}</td>
        <td><strong>${escapeHtml(issuePresentation(issue, locale).location)}</strong><small>${escapeHtml(issuePresentation(issue, locale).title)}</small>${issue.selector ? `<details><summary>${locale === "en" ? "Technical location" : "技术定位"}</summary><code>${escapeHtml(issue.selector)}</code></details>` : ""}</td>
        <td>${escapeHtml(issue.expected ?? "-")}</td>
        <td>${escapeHtml(issue.actual ?? "-")}</td>
        <td>${escapeHtml(issuePresentation(issue, locale).suggestion)}</td>
        <td><a href="#design-reference">${text.seeDesign}</a></td>
        <td><a href="#actual-evidence">${text.seeActual}</a></td>
        <td><b>${escapeHtml(issue.priority)}</b><small>${escapeHtml(labels[issue.severity])}</small></td>
        <td><b>${Math.round(issue.evidenceConfidence.score * 100)}%</b><small>${escapeHtml(issue.evidenceConfidence.level)} · ${escapeHtml(issue.evidenceConfidence.basis.join(" + "))}</small></td>
        <td><code>${escapeHtml(ref)}</code></td>
      </tr>`;
      }
    )
    .join("");
  const visualSummary = report.issues.filter(issue => issue.rule === "visual_similarity").map(issue => `<p id="${evidenceAnchor(`review-issue:${issue.id}`)}">${escapeHtml(issue.summary)}</p>`).join("");
  const aiAdvice = report.aiAdvice
    ? `<section class="panel ai-advice"><h2>${text.aiTitle}${report.aiAdvice.model ? ` · ${escapeHtml(report.aiAdvice.model)}` : ""}</h2><p>${escapeHtml(report.aiAdvice.summary)}</p><small class="ai-summary-evidence">${locale === "en" ? "Summary evidence" : "汇总证据"}: ${htmlEvidenceRefs(report.aiAdvice.summaryEvidenceRefs)}</small><ol>${report.aiAdvice.priorities.map((item, index) => `<li><b>${text.aiPriority} ${index + 1} · ${escapeHtml(item.title)}</b><span>${escapeHtml(item.reason)}</span><strong>${escapeHtml(item.action)}</strong><small class="ai-priority-evidence">${locale === "en" ? "Evidence refs" : "建议证据"}: ${htmlEvidenceRefs(item.evidenceRefs)}</small></li>`).join("")}</ol></section>`
    : "";
  const warning = incompleteReviewWarning(report, locale);
  const pageAlignment = `${warning ? `<p role="alert" class="panel">${escapeHtml(warning)}</p>` : ""}${moduleVerification(report.issues, locale, true)}${coverageTable(report.matching, locale, true)}${pageAlignmentHtml(report.matching.pageAlignment, locale)}`;
  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${text.title}</title>
<style>
  :root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#f5f5f2}*{box-sizing:border-box}
  body{margin:0}.wrap{max-width:1440px;margin:auto;padding:48px 32px 80px}.eyebrow{font:600 12px ui-monospace;letter-spacing:.12em;text-transform:uppercase}
  h1{font-size:44px;letter-spacing:-.04em;margin:12px 0}.lead{color:#666;max-width:760px}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:32px 0}
  .metric,.panel,.issue{background:#fff;border:1px solid #deded8;border-radius:12px}.metric{padding:20px}.metric b{display:block;font-size:28px;margin-top:8px}.status{color:${report.status === "passed" ? "#08783e" : "#c43333"}}
  .images{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:12px;overflow:hidden}.panel h2{font-size:13px;margin:2px 4px 12px;color:#666}.panel img{display:block;width:100%;height:auto;border-radius:7px;background:#eee}
  .issue-table{margin-top:16px;padding:0;overflow:auto}.issue-table h2{padding:16px 16px 0}.issue-table table,.page-alignment table{width:100%;border-collapse:collapse;font-size:12px}.issue-table th,.page-alignment th{background:#1f2937;color:#fff;text-align:left;padding:10px;white-space:nowrap}.issue-table th{position:sticky;top:0}.issue-table td,.page-alignment td{border-top:1px solid #e5e7eb;padding:10px;vertical-align:top;min-width:96px;line-height:1.45}.issue-table td:nth-child(2),.issue-table td:nth-child(6){min-width:180px}.issue-table td small{display:block;color:#777;margin-top:5px}.issue-table tr.error td:first-child{box-shadow:inset 3px 0 #b42318}.issue-table tr.warning td:first-child{box-shadow:inset 3px 0 #9a6700}.issue-table tr.pending td:first-child{box-shadow:inset 3px 0 #6941c6}.issue-table a{color:#2457c5}.ai-advice,.page-alignment{margin-top:16px;padding:20px}.ai-advice p,.page-alignment p{line-height:1.65}.ai-advice li{margin:12px 0}.ai-advice li span,.ai-advice li strong,.ai-advice li small{display:block;margin-top:4px}.ai-advice li span,.ai-advice small{color:#666}.ai-advice code{background:#f3f4f6;border-radius:4px;padding:2px 5px;font-size:11px}
  @media(max-width:800px){.summary,.images{grid-template-columns:1fr 1fr}.images{grid-template-columns:1fr}}@media(max-width:560px){.summary{grid-template-columns:1fr}.wrap{padding:28px 16px}}
</style></head><body><main class="wrap">
  <div class="eyebrow">DiffLab · Prototype report</div>
  <h1 class="status">${report.status === "passed" ? text.passed : report.status === "needs_review" ? localText(locale, "待复核", "Needs review") : text.failed}</h1>
  <p class="lead">${escapeHtml(report.source.design)} ${text.versus} ${escapeHtml(report.source.actual)}, ${text.viewport} ${report.viewport.width} × ${report.viewport.height}. ${escapeHtml(report.evidenceMode)}</p>
  <svg width="0" height="0" aria-hidden="true"><defs><image id="coverage-design" href="${report.images.reference}"/><image id="coverage-actual" href="${report.images.actual}"/></defs></svg>
  ${pageAlignment}
  ${visualSummary}${aiAdvice}
  <section class="summary">
    <div class="metric"><span>${text.similarity}</span><b>${similarityPresentation(report.summary.stableSimilarity, report.matching, locale)}</b></div>
    <div class="metric"><span>${text.dynamicRatio}</span><b>${(report.summary.dynamicRegionAreaRatio * 100).toFixed(2)}%</b></div>
    <div class="metric"><span>${text.strategy}</span><b style="font-size:14px">${escapeHtml(report.dynamicNormalization.strategies.join(", ") || "—")}</b></div>
    <div class="metric"><span>${text.errors}</span><b>${report.summary.errors}</b></div>
    <div class="metric"><span>${text.warnings}</span><b>${report.summary.warnings}</b></div>
    <div class="metric"><span>${text.pending}</span><b>${report.summary.pending}</b></div>
  </section>
  <section class="images"><div class="panel" id="design-reference"><h2>${text.reference}</h2><img src="${report.images.reference}" alt="${text.reference}"></div><div class="panel" id="actual-evidence"><h2>${text.actualImage}</h2><img src="${report.images.actual}" alt="${text.actualImage}"></div></section>
  <section class="panel" style="margin-top:16px"><h2>${text.diff}</h2><img src="${report.images.diff}" alt="${text.diff}"></section>
  <section class="panel issue-table"><h2>${text.issues}</h2>${issues ? `<table><thead><tr><th>${text.no}</th><th>${text.page}</th><th>${text.location}</th><th>${text.design}</th><th>${text.actualValue}</th><th>${text.modification}</th><th>${text.designEvidence}</th><th>${text.actualEvidence}</th><th>${text.priority}</th><th>${text.confidence}</th><th>${text.evidenceRef}</th></tr></thead><tbody>${issues}</tbody></table>` : `<p>${text.empty}</p>`}</section>
</main></body></html>`;
}

export function createReport(input: {
  comparison: ComparisonResult;
  source: CompareReport["source"];
  viewport: CompareReport["viewport"];
  rules: AcceptanceConfig;
  diagnostics: string[];
  durationMs: number;
  phaseTimings?: CompareReport["phaseTimings"];
  aiAdvice?: AiAdvice;
  aiAdviceRejection?: AiAdviceRejection;
  locale: Locale;
  evidenceMode: CompareReport["evidenceMode"];
}): CompareReport {
  const errors = input.comparison.issues.filter((issue) => issue.severity === "error").length;
  const warnings = input.comparison.issues.filter((issue) => issue.severity === "warning").length;
  const pending = input.comparison.issues.filter((issue) => issue.severity === "pending").length;
  const status = reviewVerdict({ summary: { errors, pending }, matching: input.comparison.matching });
  const validatedAiAdvice = validateAiAdviceEvidenceRefs({
    advice: input.aiAdvice,
    issues: input.comparison.issues,
    pageAlignment: input.comparison.matching.pageAlignment,
    locale: input.locale
  });
  const aiAdviceRejection = validatedAiAdvice.rejection ?? input.aiAdviceRejection;
  const presentedIssues = input.comparison.issues.map(issue => {
    const presentation = issuePresentation(issue, input.locale, input.comparison.matching);
    return {...issue, expected: presentation.expected, actual: presentation.actual, summary: presentation.summary,
      suggestion: presentation.suggestion, primaryAction: presentation.suggestion};
  });
  const base: Omit<CompareReport, "reportHtml"> = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    durationMs: input.durationMs,
    ...(input.phaseTimings ? { phaseTimings: input.phaseTimings } : {}),
    status,
    evidenceMode: input.evidenceMode,
    ...(input.comparison.alignment ? { alignment: input.comparison.alignment } : {}),
    summary: {
      errors,
      warnings,
      pending,
      similarity: input.comparison.similarity,
      stableSimilarity: input.comparison.dynamicNormalization.stableSimilarity,
      dynamicRegionAreaRatio: input.comparison.dynamicNormalization.dynamicRegionAreaRatio,
      matchedElements: input.comparison.matching.matches.length,
      unmatchedDesignElements: input.comparison.matching.unmatchedDesignCount,
      unmatchedActualElements: input.comparison.matching.unmatchedActualCount
    },
    dynamicNormalization: input.comparison.dynamicNormalization,
    marketVariants: input.comparison.marketVariants,
    marketLists: input.comparison.marketLists,
    matching: input.comparison.matching,
    viewport: input.viewport,
    source: input.source,
    images: {
      reference: dataUrl(input.comparison.referenceImage),
      actual: dataUrl(input.comparison.actualImage),
      diff: dataUrl(input.comparison.diffImage)
    },
    issues: presentedIssues,
    rules: input.rules,
    diagnostics: [
      ...input.diagnostics,
      ...input.comparison.matching.diagnostics,
      ...(aiAdviceRejection ? [aiAdviceRejection.message] : [])
    ],
    ...(validatedAiAdvice.advice ? { aiAdvice: validatedAiAdvice.advice } : {}),
    ...(aiAdviceRejection ? { aiAdviceRejection } : {}),
    markdown: ""
  };
  base.markdown = markdownFor({
    status,
    similarity: input.comparison.similarity,
    issues: presentedIssues,
    source: input.source,
    viewport: input.viewport,
    matching: input.comparison.matching,
    dynamicNormalization: input.comparison.dynamicNormalization,
    aiAdvice: validatedAiAdvice.advice,
    locale: input.locale,
    evidenceMode: input.evidenceMode
  });
  return { ...base, reportHtml: htmlFor(base, input.locale) };
}
