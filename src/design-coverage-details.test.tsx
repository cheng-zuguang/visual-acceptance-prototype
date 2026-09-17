import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DesignCoverageDetails, ModuleCoverageFindings } from "./design-coverage-details";
import type { ReviewIssue } from "./types";

test("module verification advice is visible without opening details or enabling AI", () => {
  const issue = { id: "coverage:vote", rule: "design_coverage_unverified", severity: "pending", title: "投票 模块疑似缺失（待核验）",
    summary: "采集区域不完整", primaryAction: "核查投票模块；确认缺失后补齐", coverageModule: { id: "vote", name: "投票", nodeIds: ["vote"] } } as ReviewIssue;
  const html = renderToStaticMarkup(<ModuleCoverageFindings issues={[issue]} title="模块核验建议" />);
  assert.match(html, /投票 模块疑似缺失/);
  assert.match(html, /确认缺失后补齐/);
  assert.doesNotMatch(html, /<details/);
});

test("coverage details show unresolved items and linked issues without expanding technical noise", () => {
  const html = renderToStaticMarkup(<DesignCoverageDetails title="设计覆盖清单" coverage={{ policy: "design-driven", items: [{
    figmaNodeId: "poll", name: "投票<模块>", status: "unverified", reasonCode: "scope-incomplete", issueIds: ["coverage:poll"]
  }] }} />);
  assert.match(html, /<summary>设计覆盖清单/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /投票&lt;模块&gt;/);
  assert.match(html, /coverage:poll/);
});

test("the primary checklist exposes passing measurements, exemptions and unmatched actual content", () => {
  const html = renderToStaticMarkup(<DesignCoverageDetails title="设计走查清单" primary coverage={{ policy: "design-driven", items: [{
    figmaNodeId: "date", name: "会议日期", status: "matched", reviewStatus: "passed", reasonCode: "verified-binding", selector: ".date", issueIds: [],
    designBox: { x: 0, y: 0, width: 100, height: 20 }, actualBox: { x: 0, y: 0, width: 100, height: 20 },
    checks: [{ property: "fontSize", rule: "typography", selector: ".date", actualBox: { x: 0, y: 0, width: 100, height: 20 }, expected: 16, actual: 16, tolerance: 1, status: "passed", reason: "measured" },
      { property: "text", rule: "content", selector: ".date", actualBox: { x: 0, y: 0, width: 100, height: 20 }, expected: "3月19日", actual: "4月30日", status: "exempt", reason: "normalize-date-time-text" }]
  }], actualItems: [{ selector: ".extra", name: "额外入口", actualBox: { x: 0, y: 100, width: 50, height: 20 }, status: "unverified", reasonCode: "design-counterpart-unresolved", issueIds: ["extra"] }] }} />);
  assert.match(html, /<h2>设计走查清单/);
  assert.match(html, /fontSize/);
  assert.match(html, /通过/);
  assert.match(html, /动态豁免/);
  assert.match(html, /normalize-date-time-text/);
  assert.match(html, /额外入口/);
});
