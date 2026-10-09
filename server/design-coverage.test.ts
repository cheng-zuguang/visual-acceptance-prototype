import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDesignCoverage } from "./design-coverage";
import type { DesignTruth, LiveActualEvidence } from "../src/types";

const box = { x: 0, y: 0, width: 100, height: 50 };
test("the real VECTOR policy card publishes one pending module while retaining original Figma identities", () => {
  const input = vectorPolicyScenario();
  const before = structuredClone(input.design.root);
  const result = evaluateDesignCoverage(input);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].title, "最新货币政策 模块疑似缺失（待核验）");
  assert.equal(result.issues[0].coverageModule?.id, "0:110");
  assert.equal(result.issues[0].severity, "pending");
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === "0:110")?.nodeType, "VECTOR");
  const title = result.coverage.items.find(i => i.figmaNodeId === "0:112")!;
  assert.equal(title.parentFigmaNodeId, "root");
  assert.equal(title.groupedParentFigmaNodeId, "0:110");
  assert.equal(title.coveredBy, result.issues[0].id);
  assert.equal(result.coverage.items.length, 3);
  assert.deepEqual(input.design.root, before);
});

test("page-sized VECTOR artwork cannot absorb independent coverage modules", () => {
  const input = vectorPolicyScenario();
  const artwork = input.design.root.children[1];
  artwork.box = { x: 0, y: 0, width: 375, height: 2370 };
  const result = evaluateDesignCoverage(input);
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === "0:112")?.groupedParentFigmaNodeId, "root");
});

test("overlapping VECTOR and rectangle backgrounds leave ambiguous children independently accountable", () => {
  const input = vectorPolicyScenario();
  input.design.root.children.push({ ...input.design.root.children[1], id: "overlap", type: "RECTANGLE" });
  const result = evaluateDesignCoverage(input);
  assert.equal(result.coverage.items.length, 4);
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === "0:112")?.groupedParentFigmaNodeId, "root");
  assert.ok(result.issues.every(i => !i.coverageModule));
});

test("small VECTOR icons do not group labels and verified children retain their own coverage", () => {
  const input = vectorPolicyScenario();
  input.design.root.children[1].box!.width = 250;
  let result = evaluateDesignCoverage(input);
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === "0:112")?.groupedParentFigmaNodeId, "root");
  input.design.root.children[1].box!.width = 355;
  input.matches.push({ figmaNodeId: "0:112", selector: ".policy-title", method: "stable-text" });
  result = evaluateDesignCoverage(input);
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === "0:112")?.status, "matched");
  assert.ok(!result.issues.some(i => i.rule === "missing_module"));
});

test("VECTOR grouping uses the existing complete-capture absence gate, never grouping alone", () => {
  const input = vectorPolicyScenario();
  for (const sample of input.evidence.samples) sample.coverage!.fullDocument = true;
  const result = evaluateDesignCoverage(input);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].title, "最新货币政策 模块缺失");
  assert.deepEqual(result.coverage.items.find(i => i.figmaNodeId === "0:110")?.absenceEvidence, {
    staticLabels: ["决议时间", "最新货币政策"], sampleIndexes: [0, 1, 2]
  });
});

function vectorPolicyScenario() {
  const input = scenario();
  // Minimal geometry/type reproduction from Review a51bfa05, not a full capture replay.
  const card = { id: "0:110", name: "矩形 4备份 5", type: "VECTOR", box: { x: 10, y: 405, width: 355, height: 122 }, style: {}, children: [] };
  const title = { ...card, id: "0:112", name: "最新货币政策", type: "TEXT", text: "最新货币政策", box: { x: 20, y: 416, width: 96, height: 20 } };
  const time = { ...title, id: "0:111", name: "决议时间", text: "决议时间", box: { x: 236, y: 418, width: 119, height: 36 } };
  input.design.root.box = { x: 0, y: 0, width: 375, height: 2370 };
  input.design.root.children = [time, card, title];
  for (const sample of input.evidence.samples) sample.coverage!.fullDocument = false;
  return input;
}
test("a generic news card is named by its short static header, not its dynamic headline", () => {
  const input = scenario();
  input.design.root.box = { x: 0, y: 0, width: 375, height: 2370 };
  const card = input.design.root.children[0].children[1];
  card.name = "编组"; card.box = { x: 10, y: 248, width: 355, height: 145 };
  card.children[0].text = card.children[0].name = "中果网：质量差异明显 优果优价…";
  card.children[0].box = { x: 64, y: 260, width: 210, height: 20 };
  card.children[1].text = card.children[1].name = "快评";
  card.children[1].box = { x: 20, y: 262, width: 30, height: 16 };
  input.design.root.children = [card];
  assert.equal(evaluateDesignCoverage(input).issues[0].coverageModule?.name, "快评");
});
test("a flat card retains raw Figma type and grouping identity for report replay", () => {
  const input = scenario();
  const result = evaluateDesignCoverage(input);
  const item = result.coverage.items.find(item => item.figmaNodeId === "policy")!;
  assert.equal(item.nodeType, "GROUP");
  assert.equal(item.originalName, "最新货币政策");
  assert.equal(item.groupedParentFigmaNodeId, "wrapper");
});
test("a scroll limitation owned by a verified sibling does not veto an unrelated missing module", () => {
  const input = scenario();
  const sibling = input.design.root.children[0].children[0];
  sibling.type = "FRAME";
  sibling.box = { ...box, y: 60 };
  input.matches[0].selector = ".rates";
  for (const sample of input.evidence.samples) sample.coverage = {
    fullDocument: false, documentBoundsComplete: true, elementLimitReached: false,
    opaqueContent: false, excludedContent: false,
    limitations: [{ reason: "scroll-container", selector: ".rates > .dates", box }]
  };
  assert.ok(evaluateDesignCoverage(input).issues.some(i => i.rule === "missing_module" && i.figmaNodeId === "policy"));
  // A text anchor cannot establish ownership of an entire scrollable subtree.
  sibling.type = "TEXT";
  assert.ok(!evaluateDesignCoverage(input).issues.some(i => i.rule === "missing_module"));
});

test("a VECTOR region identified by stable descendants can own an unrelated local capture limitation", () => {
  const input = scenario();
  input.design.root.children[0].children[0].type = "VECTOR";
  input.design.root.children[0].children[0].box = { ...box, y: 60 };
  input.matches[0].selector = ".rates";
  input.matches[0].method = "verified-region";
  for (const sample of input.evidence.samples) sample.coverage = {
    fullDocument: false, documentBoundsComplete: true, elementLimitReached: false,
    opaqueContent: false, excludedContent: false,
    limitations: [{ reason: "scroll-container", selector: ".rates > .dates", box }]
  };
  assert.ok(evaluateDesignCoverage(input).issues.some(issue => issue.rule === "missing_module" && issue.figmaNodeId === "policy"));
  input.matches[0].method = "structure-geometry";
  assert.ok(!evaluateDesignCoverage(input).issues.some(issue => issue.rule === "missing_module"));
});
test("an unresolved vote card becomes one named module finding, not a list of child coverage noise", () => {
  const input = scenario();
  input.design.root.box = { x: 0, y: 0, width: 375, height: 2370 };
  const vote = input.design.root.children[0].children[1];
  vote.id = "vote"; vote.name = "编组"; vote.box = { x: 10, y: 1090, width: 355, height: 261 };
  vote.children[0].text = "投票"; vote.children[0].name = "投票";
  input.design.root.children = [vote];
  for (const sample of input.evidence.samples) sample.coverage!.fullDocument = false;
  const result = evaluateDesignCoverage(input);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].title, "投票 模块疑似缺失（待核验）");
  assert.equal(result.issues[0].coverageModule?.id, "vote");
  assert.ok(result.issues[0].primaryAction.includes("确认缺失后"));
});
test("a geometry-only child candidate cannot certify module presence or suppress its unresolved finding", () => {
  const input = scenario();
  input.matches.push({ figmaNodeId: "title", selector: ".unrelated", method: "structure-geometry" });
  const result = evaluateDesignCoverage({ ...input, matches: input.matches.map(match => ({ ...match,
    method: match.figmaNodeId === "title" ? "structure-geometry" : "exact-id" })) });
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === "title")?.reasonCode, "parent-finding");
  assert.ok(result.issues.some(i => i.figmaNodeId === "policy"));
});
test("bounded inline text clipping does not hide a card, but an unsearched scroll container does", () => {
  const input = scenario();
  for (const sample of input.evidence.samples) sample.coverage = {
    fullDocument: false, elementLimitReached: false, opaqueContent: false, excludedContent: false,
    documentBoundsComplete: true,
    limitations: [{ reason: "text-clipping", selector: ".date", box: { x: 0, y: 0, width: 40, height: 20 } }]
  } as any;
  assert.ok(evaluateDesignCoverage(input).issues.some(i => i.rule === "missing_module"));
  for (const sample of input.evidence.samples) (sample.coverage as any).limitations[0].reason = "scroll-container";
  assert.ok(!evaluateDesignCoverage(input).issues.some(i => i.rule === "missing_module"));
});
test("flat Figma policy card is reviewed once with its visible heading, preserving every original node", () => {
  const input = scenario();
  const card = { id: "0:110", name: "矩形 4备份 5", type: "RECTANGLE", box: { x: 10, y: 405, width: 355, height: 122 }, style: {}, children: [] };
  const title = { ...card, id: "0:112", name: "最新货币政策", type: "TEXT", text: "最新货币政策", box: { x: 20, y: 416, width: 96, height: 20 } };
  const time = { ...title, id: "0:111", name: "决议时间", text: "决议时间", box: { x: 236, y: 418, width: 119, height: 36 } };
  input.design.root.box = { x: 0, y: 0, width: 375, height: 2370 };
  input.design.root.children = [time, card, title];
  const result = evaluateDesignCoverage(input);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].title, "最新货币政策 模块缺失");
  assert.equal(result.issues[0].figmaNodeId, card.id);
  assert.equal(result.coverage.items.length, 3);
  assert.equal(result.coverage.items.find(i => i.figmaNodeId === title.id)?.parentFigmaNodeId, "root");
});
function scenario() {
  const leaf = (id: string, text: string) => ({ id, name: text, text, type: "TEXT", box, style: {}, children: [] });
  const design: DesignTruth = {
    source: { kind: "demo", name: "page" }, render: { image: Buffer.alloc(0), viewport: box }, diagnostics: [],
    root: { id: "root", name: "root", type: "FRAME", box, style: {}, children: [{
      id: "wrapper", name: "编组", type: "GROUP", box, style: {}, children: [leaf("visible", "利率观察"), {
        id: "policy", name: "最新货币政策", type: "GROUP", box, style: {},
        children: [leaf("title", "最新货币政策"), leaf("label", "决议时间")]
      }]
    }] }
  };
  const evidence: LiveActualEvidence = {
    kind: "live", sourceUrl: "https://example.test", finalUrl: "https://example.test", viewport: box,
    samples: [0, 1, 2].map(index => ({ index, capturedAtMs: index, image: Buffer.alloc(0), elements: [], audits: [],
      coverage: { fullDocument: true, elementLimitReached: false, opaqueContent: false, excludedContent: false } })),
    canonicalSampleIndex: 2, elementChanges: [], diagnostics: [],
    pixelVariance: { image: Buffer.alloc(0), changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1 }
  };
  return { design, evidence, matches: [{ figmaNodeId: "visible", selector: "h1", method: "exact-id" }], issues: [], locale: "zh-CN" as const };
}

test("an unmatched wrapper does not swallow a missing child module next to a verified sibling", () => {
  const result = evaluateDesignCoverage(scenario());
  assert.equal(result.issues.filter(issue => issue.rule === "missing_module").length, 1);
  assert.equal(result.issues.find(issue => issue.rule === "missing_module")?.figmaNodeId, "policy");
  assert.equal(result.coverage.items.find(item => item.figmaNodeId === "visible")?.status, "matched");
  assert.deepEqual(result.coverage.items.find(item => item.figmaNodeId === "policy")?.absenceEvidence, {
    staticLabels: ["最新货币政策", "决议时间"], sampleIndexes: [0, 1, 2]
  });
});

test("dynamic news content is unresolved rather than a fabricated static missing module", () => {
  const input = scenario();
  input.design.root.children[0].children[1].name = "热点解读";
  const result = evaluateDesignCoverage(input);
  assert.ok(!result.issues.some(issue => issue.rule === "missing_module"));
  assert.ok(result.issues.some(issue => issue.figmaNodeId === "policy" && issue.severity === "pending"));
});

test("incomplete, capped, opaque or excluded captures never prove absence", () => {
  for (const flag of ["fullDocument", "elementLimitReached", "opaqueContent", "excludedContent"] as const) {
    const input = scenario();
    input.evidence.samples[1].coverage![flag] = flag !== "fullDocument";
    const result = evaluateDesignCoverage(input);
    assert.ok(!result.issues.some(issue => issue.rule === "missing_module"), flag);
    assert.equal(result.coverage.items.find(item => item.figmaNodeId === "policy")?.reasonCode, "scope-incomplete");
  }
});

test("published missing evidence is reused rather than duplicated or labelled unverified", () => {
  const input = scenario();
  const first = evaluateDesignCoverage(input);
  const again = evaluateDesignCoverage({ ...input, issues: first.issues });
  assert.equal(again.issues.length, 0);
  assert.deepEqual(again.coverage.items.find(item => item.figmaNodeId === "policy")?.issueIds, [first.issues[0].id]);
});

test("generic Figma groups use their visible title in actionable coverage findings", () => {
  const input = scenario();
  input.design.root.children[0].children[1].name = "编组";
  const result = evaluateDesignCoverage(input);
  assert.match(result.issues[0].title, /最新货币政策/);
});

test("a matched element links to its final aggregated issue rather than losing its findings", () => {
  const input = scenario();
  const issue = evaluateDesignCoverage(input).issues[0];
  const result = evaluateDesignCoverage({ ...input,
    findings: [{ id: "raw-position", figmaNodeId: "visible" }],
    issues: [{ ...issue, id: "module-position", figmaNodeId: "wrapper", rule: "position",
      evidence: [{ ...issue.evidence[0], sourceIssueId: "raw-position" }] }]
  });
  assert.deepEqual(result.coverage.items.find(item => item.figmaNodeId === "visible")?.issueIds, ["module-position"]);
});

test("a fixed date label contributes absence evidence without comparing its dynamic value", () => {
  const input = vectorPolicyScenario();
  for (const sample of input.evidence.samples) sample.coverage!.fullDocument = true;
  input.design.root.children.find(node => node.text === "决议时间")!.text = "决议时间:2027/03/18";
  const result = evaluateDesignCoverage(input);
  assert.equal(result.coverage.items.find(item => item.figmaNodeId === "0:110")?.status, "missing");
  assert.ok(result.coverage.items.find(item => item.figmaNodeId === "0:110")?.absenceEvidence?.staticLabels.includes("决议时间"));
});

test("a derived enclosing region never certifies its own unsearched descendants as unrelated", () => {
  const input = vectorPolicyScenario();
  input.design.root.children.push({ id: "outer", name: "Outer", type: "VECTOR", box: { x: 0, y: 390, width: 375, height: 160 }, style: {}, children: [] });
  input.matches = [{ figmaNodeId: "outer", selector: ".outer", method: "verified-region" }];
  for (const sample of input.evidence.samples) sample.coverage = { fullDocument: false, documentBoundsComplete: true, elementLimitReached: false, opaqueContent: false, excludedContent: false,
    limitations: [{ reason: "scroll-container", selector: ".outer > .scroll", box: { x: 10, y: 410, width: 350, height: 100 } }] };
  const result = evaluateDesignCoverage(input);
  assert.ok(!result.issues.some(issue => issue.rule === "missing_module"));
  assert.equal(result.coverage.items.find(item => item.figmaNodeId === "0:110")?.reasonCode, "scope-incomplete");  input.design.root.children.find(item => item.id === "outer")!.box!.height = 50;
  assert.ok(!evaluateDesignCoverage(input).issues.some(issue => issue.rule === "missing_module"));
});


test("actual-driven scope accounts for design-only modules without publishing absence", () => {
  const input = scenario();
  const result = evaluateDesignCoverage({ ...input, policy: "actual-driven" });
  assert.equal(result.coverage.policy, "actual-driven");
  assert.equal(result.coverage.items.length, 5);
  assert.deepEqual(result.issues, []);
  const extra = result.coverage.items.find(item => item.figmaNodeId === "policy")!;
  assert.equal(extra.status, "outside-scope");
  assert.equal(extra.reasonCode, "outside-actual-scope");
  assert.equal(extra.reviewStatus, "not-applicable");
  assert.deepEqual(extra.issueIds, []);
  assert.equal(extra.absenceEvidence, undefined);
});

test("actual-driven scope retains uncertainty for visible actual content without correspondence", () => {
  const input = scenario();
  const element = { selector: ".actual", tag: "p", text: "实际内容", box, style: {},
    fingerprint: { key: "actual", identitySource: "dom-structure" as const, tag: "p", selector: ".actual", region: "page", geometryBucket: "g", styleSignature: "s" } };
  for (const sample of input.evidence.samples) sample.elements = [element];
  const result = evaluateDesignCoverage({ ...input, policy: "actual-driven" });
  assert.deepEqual(result.issues.map(issue => issue.rule), ["actual_coverage_unverified"]);
  assert.equal(result.issues[0].severity, "pending");
  assert.equal(result.coverage.actualItems?.length, 1);
});


test("a geometry-only guess leaves visible actual content pending in actual-driven scope", () => {
  const input = scenario();
  const element = { selector: ".guess", tag: "p", text: "实际可见内容", box, style: {},
    fingerprint: { key: "guess", identitySource: "dom-structure" as const, tag: "p", selector: ".guess", region: "page", geometryBucket: "g", styleSignature: "s" } };
  for (const sample of input.evidence.samples) sample.elements = [element];
  input.matches = [{ figmaNodeId: "visible", selector: ".guess", method: "structure-geometry" }];
  const result = evaluateDesignCoverage({ ...input, policy: "actual-driven" });
  assert.equal(result.coverage.items.find(item => item.figmaNodeId === "visible")?.status, "outside-scope");
  assert.equal(result.coverage.actualItems?.[0].status, "unverified");
  assert.equal(result.issues[0].rule, "actual_coverage_unverified");
});

test("actual coverage reports the unresolved content instead of a page wrapper containing verified content", () => {
  const input = scenario();
  const element = (selector: string, parentSelector?: string) => ({selector,parentSelector,tag:"div",box,style:{backgroundColor:"#ffffff"},fingerprint:{key:selector,identitySource:"dom-structure" as const,tag:"div",selector,region:"page",geometryBucket:"g",styleSignature:"s"}});
  for (const sample of input.evidence.samples) sample.elements = [element(".page"), {...element("h1",".page"),text:"利率观察"}, {...element(".news",".page"),text:"实际新增资讯",box:{x:10,y:20,width:80,height:20}}];
  const result = evaluateDesignCoverage({...input,policy:"actual-driven"});
  assert.deepEqual(result.issues.map(issue => [issue.selector,issue.actualBox]), [[".news",{x:10,y:20,width:80,height:20}]]);
  assert.match(result.issues[0].title,/实际新增资讯/);
});

test("unresolved fields within a bounded card are one local verification action even when its heading is matched", () => {
  const input=scenario();
  const element=(selector:string,parentSelector:string|undefined,region:typeof box,text?:string)=>({selector,parentSelector,tag:"div",box:region,text,style:{backgroundColor:"#ffffff"},fingerprint:{key:selector,identitySource:"dom-structure" as const,tag:"div",selector,region:"page",geometryBucket:"g",styleSignature:"s"}});
  const card={x:5,y:5,width:90,height:35};
  for(const sample of input.evidence.samples)sample.elements=[element(".page",undefined,box),element(".card",".page",card),element("h1",".card",{x:10,y:8,width:70,height:8},"利率观察"),element(".first",".card",{x:10,y:20,width:30,height:8},"未匹配字段一"),element(".second",".card",{x:45,y:20,width:30,height:8},"未匹配字段二")];
  const result=evaluateDesignCoverage({...input,policy:"actual-driven"});
  assert.deepEqual(result.issues.map(issue=>issue.actualBox),[card]);
  assert.ok(result.coverage.actualItems?.filter(item=>item.selector===".first"||item.selector===".second").every(item=>item.issueIds[0]===result.issues[0].id));
  assert.match(result.issues[0].title,/利率观察/);
});
