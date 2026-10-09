import assert from "node:assert/strict";
import test from "node:test";
import { issuePresentation } from "./issue-presentation";
import type { ReviewIssue } from "./types";

test("acceptance labels never expose DOM-derived issue identifiers", () => {
  const issue={id:"actual-coverage:body > div > div",rule:"actual_coverage_unverified",selector:"body > div > div",title:"内容待核验",summary:"对应关系待核验",primaryAction:"核对对应设计",location:{description:"内容"}} as ReviewIssue;
  const display=issuePresentation(issue);
  assert.equal(display.identifier,"待核验");
});

test("partial pixel review is explicitly described as local similarity rather than whole-page restoration", async () => {
  const {pixelScopePresentation}=await import("./issue-presentation");
  assert.equal(pixelScopePresentation({reviewedPixels:116737,canvasPixels:888750}),"仅审查整图的 13.1%，相似度仅代表这些对应区域。");
});
