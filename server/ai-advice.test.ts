import assert from "node:assert/strict";
import test from "node:test";
import { buildAiAdviceEvidence } from "./ai-advice";
import type { ReviewIssue } from "../src/types";

test("advice ranking receives concrete findings rather than the overall similarity gate", () => {
  const issue=(id:string,rule:string)=>({id,rule,title:id,summary:id,primaryAction:id,location:{},severity:"error",priority:"P1",evidenceConfidence:{score:1,level:"high",basis:[],reasons:[]}} as unknown as ReviewIssue);
  const evidence=buildAiAdviceEvidence([issue("score","visual_similarity"),issue("label","alignment")],{regions:[],summary:"",rejectedRegionCount:0},"zh-CN");
  assert.deepEqual(evidence.map(item=>item.ref),["review-issue:label"]);
});

test("relative-only review cannot turn diagnostic whole-module displacement into an AI modification", () => {
  const region={status:"matched",designParentFigmaNodeId:"card",actualParentSelector:".card",designPath:["利率观察"],displacement:{x:0,y:-375},reason:"历史全页位移诊断"};
  const plan={regions:[region],summary:"",rejectedRegionCount:0} as Parameters<typeof buildAiAdviceEvidence>[1];
  assert.deepEqual(buildAiAdviceEvidence([],plan,"zh-CN",true),[]);
  assert.equal(buildAiAdviceEvidence([],plan,"zh-CN").length,1,"historical design-driven advice remains available");
});
