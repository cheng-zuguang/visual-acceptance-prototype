import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AiAdvicePriorities } from "./ai-advice-priorities";
import type { AiAdvice, ReviewIssue } from "./types";

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

test("overall similarity stays out of actionable advice while mixed groups still locate their concrete issue", () => {
  const summary={id:"score",rule:"visual_similarity",title:"整体相似度",summary:"相似度不足",primaryAction:"泛化建议",location:{},evidence:[]} as unknown as ReviewIssue;
  const issue={id:"label",rule:"alignment",title:"概率对齐",summary:"文字位置不同",primaryAction:"调整概率位置",location:{},evidence:[]} as unknown as ReviewIssue;
  const priorities: AiAdvice["priorities"]=[{title:"汇总",reason:"汇总",action:"汇总",evidenceRefs:["review-issue:score"]},{title:"混合组",reason:"混合组",action:"混合组",evidenceRefs:["review-issue:score","review-issue:label"]}];
  const html=renderToStaticMarkup(<AiAdvicePriorities priorities={priorities} issues={[summary,issue]} label="关联证据" onSelect={()=>undefined}/>);
  assert.doesNotMatch(html,/<h3>整体相似度<\/h3>/);
  assert.match(html,/aria-label="定位问题：概率对齐"/);
});
