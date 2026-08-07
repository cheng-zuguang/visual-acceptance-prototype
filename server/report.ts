import { randomUUID } from "node:crypto";
import type { AcceptanceConfig, AiAdvice, CompareReport, Issue } from "../src/types";
import type { ComparisonResult } from "./compare";

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

const severityLabel = {
  error: "错误",
  warning: "警告",
  pending: "待确认",
  info: "信息"
};

function issueLine(issue: Issue): string {
  const details = [issue.expected ? `设计值：${issue.expected}` : "", issue.actual ? `实际值：${issue.actual}` : ""]
    .filter(Boolean)
    .join("；");
  return `- **${severityLabel[issue.severity]}｜${issue.title}**：${issue.summary}${details ? `（${details}）` : ""} 建议：${issue.suggestion}`;
}

function markdownFor(input: {
  status: CompareReport["status"];
  similarity: number;
  issues: Issue[];
  source: CompareReport["source"];
  viewport: CompareReport["viewport"];
  aiAdvice?: AiAdvice;
}): string {
  const errors = input.issues.filter((issue) => issue.severity === "error").length;
  const warnings = input.issues.filter((issue) => issue.severity === "warning").length;
  const pending = input.issues.filter((issue) => issue.severity === "pending").length;
  return `# 视觉验收报告

**结论：${input.status === "passed" ? "通过" : "不通过"}**

- 设计来源：${input.source.design}
- H5 来源：${input.source.h5}
- 视口：${input.viewport.width} × ${input.viewport.height}
- 视觉相似度：${(input.similarity * 100).toFixed(2)}%
- 错误：${errors}；警告：${warnings}；待确认：${pending}

## 问题清单

${input.issues.length ? input.issues.map(issueLine).join("\n") : "未发现超出验收阈值的问题。"}

${
  input.aiAdvice
    ? `## AI 改进建议

${input.aiAdvice.summary}

${input.aiAdvice.priorities.map((item, index) => `${index + 1}. **${item.title}**：${item.reason}；${item.action}`).join("\n")}
`
    : ""
}
---

此报告由 DiffLab 可抛弃原型生成。通过/不通过仅由 YAML 规则决定，AI 不参与门禁。
`;
}

function htmlFor(report: Omit<CompareReport, "reportHtml">): string {
  const issues = report.issues
    .map(
      (issue) => `<article class="issue ${issue.severity}">
        <header><span>${escapeHtml(severityLabel[issue.severity])}</span><strong>${escapeHtml(issue.title)}</strong></header>
        <p>${escapeHtml(issue.summary)}</p>
        ${issue.expected ? `<dl><dt>设计值</dt><dd>${escapeHtml(issue.expected)}</dd></dl>` : ""}
        ${issue.actual ? `<dl><dt>实际值</dt><dd>${escapeHtml(issue.actual)}</dd></dl>` : ""}
        <p class="suggestion">建议：${escapeHtml(issue.suggestion)}</p>
        <small>${escapeHtml(issue.selector ?? issue.figmaNodeId ?? issue.rule)}</small>
      </article>`
    )
    .join("");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DiffLab 视觉验收报告</title>
<style>
  :root{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111;background:#f5f5f2}*{box-sizing:border-box}
  body{margin:0}.wrap{max-width:1440px;margin:auto;padding:48px 32px 80px}.eyebrow{font:600 12px ui-monospace;letter-spacing:.12em;text-transform:uppercase}
  h1{font-size:44px;letter-spacing:-.04em;margin:12px 0}.lead{color:#666;max-width:760px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:32px 0}
  .metric,.panel,.issue{background:#fff;border:1px solid #deded8;border-radius:12px}.metric{padding:20px}.metric b{display:block;font-size:28px;margin-top:8px}.status{color:${report.status === "passed" ? "#08783e" : "#c43333"}}
  .images{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:12px;overflow:hidden}.panel h2{font-size:13px;margin:2px 4px 12px;color:#666}.panel img{display:block;width:100%;height:auto;border-radius:7px;background:#eee}
  .issues{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}.issue{padding:18px}.issue header{display:flex;gap:10px;align-items:center}.issue header span{font-size:11px;border:1px solid;border-radius:999px;padding:3px 8px}.issue.error header span{color:#b42318}.issue.warning header span{color:#9a6700}.issue.pending header span{color:#6941c6}.issue p{color:#555;line-height:1.55}.issue dl{display:grid;grid-template-columns:64px 1fr;margin:4px 0;font-size:13px}.issue dt{color:#888}.issue dd{margin:0;font-family:ui-monospace}.issue .suggestion{color:#111}.issue small{color:#777;font-family:ui-monospace;word-break:break-all}
  @media(max-width:800px){.summary,.images,.issues{grid-template-columns:1fr 1fr}.images{grid-template-columns:1fr}}@media(max-width:560px){.summary,.issues{grid-template-columns:1fr}.wrap{padding:28px 16px}}
</style></head><body><main class="wrap">
  <div class="eyebrow">DiffLab · Prototype report</div>
  <h1 class="status">${report.status === "passed" ? "通过验收" : "未通过验收"}</h1>
  <p class="lead">${escapeHtml(report.source.design)} 对比 ${escapeHtml(report.source.h5)}，视口 ${report.viewport.width} × ${report.viewport.height}。</p>
  <section class="summary">
    <div class="metric"><span>视觉相似度</span><b>${(report.summary.similarity * 100).toFixed(2)}%</b></div>
    <div class="metric"><span>错误</span><b>${report.summary.errors}</b></div>
    <div class="metric"><span>警告</span><b>${report.summary.warnings}</b></div>
    <div class="metric"><span>待确认</span><b>${report.summary.pending}</b></div>
  </section>
  <section class="images"><div class="panel"><h2>设计基准</h2><img src="${report.images.reference}" alt="设计基准"></div><div class="panel"><h2>H5 实际截图</h2><img src="${report.images.actual}" alt="H5 实际截图"></div></section>
  <section class="panel" style="margin-top:16px"><h2>差异热力图</h2><img src="${report.images.diff}" alt="差异热力图"></section>
  <section class="issues">${issues || '<div class="issue"><strong>未发现超出验收阈值的问题。</strong></div>'}</section>
</main></body></html>`;
}

export function createReport(input: {
  comparison: ComparisonResult;
  source: CompareReport["source"];
  viewport: CompareReport["viewport"];
  rules: AcceptanceConfig;
  diagnostics: string[];
  durationMs: number;
  aiAdvice?: AiAdvice;
}): CompareReport {
  const errors = input.comparison.issues.filter((issue) => issue.severity === "error").length;
  const warnings = input.comparison.issues.filter((issue) => issue.severity === "warning").length;
  const pending = input.comparison.issues.filter((issue) => issue.severity === "pending").length;
  const status = errors > 0 ? "failed" : "passed";
  const base: Omit<CompareReport, "reportHtml"> = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    durationMs: input.durationMs,
    status,
    summary: {
      errors,
      warnings,
      pending,
      similarity: input.comparison.similarity,
      matchedElements: input.comparison.matchedElements
    },
    viewport: input.viewport,
    source: input.source,
    images: {
      reference: dataUrl(input.comparison.referenceImage),
      actual: dataUrl(input.comparison.actualImage),
      diff: dataUrl(input.comparison.diffImage)
    },
    issues: input.comparison.issues,
    rules: input.rules,
    diagnostics: input.diagnostics,
    aiAdvice: input.aiAdvice,
    markdown: ""
  };
  base.markdown = markdownFor({
    status,
    similarity: input.comparison.similarity,
    issues: input.comparison.issues,
    source: input.source,
    viewport: input.viewport,
    aiAdvice: input.aiAdvice
  });
  return { ...base, reportHtml: htmlFor(base) };
}
