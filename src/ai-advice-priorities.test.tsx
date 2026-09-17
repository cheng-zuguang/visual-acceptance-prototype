import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AiAdvicePriorities } from "./ai-advice-priorities";
import type { ReviewIssue } from "./types";

test("advice separates verification status, action and explicitly named issue navigation", () => {
  const issue = { id: "vote", title: "投票待核验", summary: "尚未确认对应关系", primaryAction: "核对投票模块",
    rule: "design_coverage_unverified", severity: "pending", location: {}, evidence: [] } as unknown as ReviewIssue;
  const html = renderToStaticMarkup(<AiAdvicePriorities priorities={[{ title: issue.title, reason: issue.summary,
    action: issue.primaryAction, evidenceRefs: ["review-issue:vote"] }]} issues={[issue]} label="关联证据与技术详情" onSelect={() => undefined} />);
  assert.match(html, /待核验/);
  assert.match(html, /建议操作/);
  assert.match(html, /定位问题/);
  assert.match(html, /aria-label="定位问题：投票待核验"/);
  assert.match(html, /技术标识/);
});

test("keeps raw advice evidence inside a closed native disclosure", () => {
  const html = renderToStaticMarkup(<AiAdvicePriorities priorities={[{
    title: "利率观察位置偏移", reason: "整体上移", action: "复核模块定位",
    evidenceRefs: ["review-issue:one"]
  }]} issues={[]} label="关联证据与技术详情" onSelect={() => undefined} />);
  assert.match(html, /<details/);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /<summary>关联证据与技术详情/);
  assert.match(html, /review-issue:one/);
});
