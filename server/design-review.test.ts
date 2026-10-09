import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type { DesignTruth, LiveActualEvidence } from "../src/types";
import { compareDesignToPage } from "./compare";
import { parseAcceptanceYaml } from "./default-rules";

async function fixture() {
  const image = await sharp({ create: { width: 400, height: 600, channels: 4, background: "white" } }).png().toBuffer();
  const box = { x: 20, y: 20, width: 100, height: 24 };
  const design: DesignTruth = { source: { kind: "figma", fileKey: "fixture", frameId: "root", frameName: "Page" },
    render: { image, viewport: { width: 400, height: 600 } }, diagnostics: [],
    root: { id: "root", name: "Page", type: "FRAME", box: { x: 0, y: 0, width: 400, height: 600 }, style: {}, children: [
      { id: "heading", parentId: "root", name: "Heading", type: "TEXT", text: "Overview", box,
        style: { fontSize: 16, fontFamily: "Arial" }, children: [] }
    ] } };
  const element = { selector: "h1", dataFigmaId: "heading", tag: "h1", text: "Overview", box: { ...box }, style: { fontSize: 16 },
    fingerprint: { key: "heading", identitySource: "figma-id" as const, tag: "h1", selector: "h1", region: "top", geometryBucket: "", styleSignature: "" } };
  const evidence: LiveActualEvidence = { kind: "live", sourceUrl: "https://example.test", finalUrl: "https://example.test", viewport: design.render.viewport,
    samples: [0, 1, 2].map(index => ({ index, capturedAtMs: index * 750, image, elements: [structuredClone(element)], audits: [],
      coverage: { fullDocument: true, elementLimitReached: false, opaqueContent: false, excludedContent: false } })),
    canonicalSampleIndex: 2, elementChanges: [], pixelVariance: { image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1 }, diagnostics: [] };
  return { design, evidence };
}

test("a matched design item exposes measured passing checks and distinguishes unavailable evidence", async () => {
  const { design, evidence } = await fixture();
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const item = result.matching.designCoverage!.items.find(item => item.figmaNodeId === "heading")!;
  assert.equal(item.checks?.find(check => check.property === "fontSize")?.status, "passed");
  assert.equal(item.checks?.find(check => check.property === "fontSize")?.actual, 16);
  assert.equal(item.checks?.find(check => check.property === "fontFamily")?.status, "pending");
  assert.equal(item.reviewStatus, "pending");
});

test("the design checklist retains every executed layout and style comparison, including disabled rules", async () => {
  const { design, evidence } = await fixture();
  const style = { fontSize: 16, fontFamily: "Arial", fontWeight: 400, lineHeight: 24, textAlign: "left", color: "#111111", borderRadius: 0, borderWidth: 0, opacity: 1 };
  design.root.children[0].style = style;
  for (const sample of evidence.samples) {
    sample.elements[0].style = { ...style, fontWeight: 500 };
    sample.elements[0].box.x += 8;
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml("rules:\n  color: ignore"), "en");
  const checks = result.matching.designCoverage!.items[0].checks!;
  const outcome = (name: string) => checks.find(check => check.property === name)?.status;
  assert.equal(outcome("x"), "pending");
  assert.equal(outcome("y"), "pending");
  assert.equal(outcome("width"), "passed");
  assert.equal(outcome("text"), "passed");
  assert.equal(outcome("fontWeight"), "difference");
  assert.equal(outcome("textAlign"), "pending"); // CSS equality without rendered bounds does not prove visual alignment.
  assert.equal(outcome("color"), "not-run");
  assert.equal(outcome("borderWidth"), "passed");
  assert.equal(outcome("opacity"), "passed");
});

test("unmapped visible actual content is reported while boxless-purpose wrappers do not become extra UI findings", async () => {
  const { design, evidence } = await fixture();
  for (const sample of evidence.samples) {
    const base = sample.elements[0];
    sample.elements.push({ ...base, dataFigmaId: undefined, selector: "section", text: "", tag: "section", style: {},
      fingerprint: { ...base.fingerprint, key: "wrapper" } });
    sample.elements.push({ ...base, dataFigmaId: undefined, selector: "section > button", parentSelector: "section", text: "Extra action", tag: "button", style: {},
      box: { x: 200, y: 400, width: 100, height: 30 }, fingerprint: { ...base.fingerprint, key: "extra" } });
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const extras = result.matching.designCoverage!.actualItems!;
  assert.deepEqual(extras.map(item => item.selector), ["section > button"]);
  const issue = result.issues.find(issue => issue.rule === "actual_coverage_unverified");
  assert.equal(issue?.selector, "section > button");
  assert.equal(issue?.severity, "pending");
  assert.deepEqual(extras[0].issueIds, [issue!.id]);
});

test("a verified date field is normalized without AI even when its value stays unchanged during capture", async () => {
  const { design, evidence } = await fixture();
  design.root.children[0].text = "3月19日";
  design.root.children[0].name = "会议日期";
  for (const sample of evidence.samples) sample.elements[0].text = "4月30日";
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.dynamicNormalization.regions[0]?.kind, "date-time");
  assert.ok(!result.issues.some(issue => issue.rule === "content"));
  assert.equal(result.matching.designCoverage!.items[0].checks!.find(check => check.property === "text")?.status, "exempt");
});

test("dynamic glyph width is exempt but its vertical size and font differences remain reviewable", async () => {
  const { design, evidence } = await fixture();
  design.root.children[0].name = "Market price";
  design.root.children[0].layout = { sizingHorizontal: "HUG" };
  design.root.children[0].text = "9.9";
  for (const sample of evidence.samples) {
    sample.elements[0].text = "10,000.00";
    sample.elements[0].box.width = 160;
    sample.elements[0].box.height = 32;
    sample.elements[0].style.fontSize = 20;
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const checks = result.matching.designCoverage!.items[0].checks!;
  assert.equal(checks.find(check => check.property === "width")?.status, "exempt");
  assert.equal(checks.find(check => check.property === "height")?.status, "difference");
  assert.equal(checks.find(check => check.property === "fontSize")?.status, "difference");
  const size = result.issues.find(issue => issue.rule === "size");
  assert.match(size!.summary, /8px/);
});

test("flat side-by-side cards use visual containment without forcing full-width three-level modules", async () => {
  const { design, evidence } = await fixture();
  design.root.children = [
    { id: "card", parentId: "root", type: "RECTANGLE", name: "Rectangle", box: { x: 10, y: 100, width: 160, height: 100 }, style: { backgroundColor: "#ffffff" }, children: [] },
    { id: "title", parentId: "root", type: "TEXT", name: "Title", text: "Policy decisions", box: { x: 20, y: 110, width: 130, height: 20 }, style: {}, children: [] },
    { id: "label", parentId: "root", type: "TEXT", name: "Label", text: "Publication date", box: { x: 20, y: 140, width: 130, height: 20 }, style: {}, children: [] }
  ];
  for (const sample of evidence.samples) sample.elements = [];
  const before = structuredClone(design.root);
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.issues.filter(issue => issue.rule === "missing_module").length, 0);
  assert.equal(result.matching.designCoverage!.items.length, 3);
  assert.ok(result.matching.designCoverage!.items.every(item => item.status === "outside-scope" && item.reviewStatus === "not-applicable"));
  const title = result.matching.designCoverage!.items.find(item => item.figmaNodeId === "title")!;
  assert.equal(title.groupedParentFigmaNodeId, "card");
  assert.equal(title.parentFigmaNodeId, "root");
  assert.deepEqual(design.root, before);
});

test("nested visual backgrounds choose the innermost unambiguous region and preserve raw parent identity", async () => {
  const { design, evidence } = await fixture();
  const box = { x: 10, y: 100, width: 360, height: 200 };
  design.root.children = [
    { id: "outer", parentId: "root", type: "RECTANGLE", name: "Outer", box, style: {}, children: [] },
    { id: "inner", parentId: "root", type: "RECTANGLE", name: "Inner", box: { ...box, x: 20, y: 110, width: 330, height: 100 }, style: {}, children: [] },
    { id: "title", parentId: "root", type: "TEXT", name: "Title", text: "Policy decisions", box: { x: 30, y: 120, width: 130, height: 20 }, style: {}, children: [] }
  ];
  for (const sample of evidence.samples) sample.elements = [];
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const title = result.matching.designCoverage!.items.find(item => item.figmaNodeId === "title")!;
  assert.equal(title.groupedParentFigmaNodeId, "inner");
  assert.equal(title.parentFigmaNodeId, "root");
});

test("two stable descendant anchors identify a shifted region despite flattened Figma grouping and nested DOM", async () => {
  const { design, evidence } = await fixture();
  const text = (id: string, value: string, y: number) => ({ id, parentId: "root", name: value, type: "TEXT", text: value,
    box: { x: 20, y, width: 120, height: 20 }, style: { fontSize: 16 }, children: [] });
  design.root.children = [{ id: "card", parentId: "root", name: "Rectangle", type: "RECTANGLE", box: { x: 10, y: 200, width: 360, height: 160 },
    style: { backgroundColor: "#ffffff" }, children: [] }, text("title", "Rate outlook", 210), text("caption", "Publication details", 330)];
  for (const sample of evidence.samples) {
    const base = sample.elements[0];
    sample.elements = [{ ...base, dataFigmaId: undefined, selector: "article", text: "", tag: "article", style: {}, box: { x: 10, y: 100, width: 360, height: 160 },
      fingerprint: { ...base.fingerprint, key: "card-actual" } },
      ...design.root.children.slice(1).map(node => ({ ...base, dataFigmaId: undefined, selector: `article > .${node.id}`, parentSelector: "article", text: node.text,
        box: { ...node.box!, y: node.box!.y - 100 }, fingerprint: { ...base.fingerprint, key: node.id } }))];
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const card = result.matching.designCoverage!.items.find(item => item.figmaNodeId === "card")!;
  assert.equal(card.status, "matched");
  assert.equal(card.selector, "article");
  const region = result.matching.pageAlignment.regions.find(region => region.designParentFigmaNodeId === "card");
  assert.equal(region?.displacement?.y, -100);
});

test("a verified container and its heading isolate regional displacement from internal column offsets", async () => {
  const { design, evidence } = await fixture();
  const children = [0, 1, 2].map(index => ({ id: `field${index}`, parentId: "card", name: `Field ${index}`, text: ["Overview", "Latest probability", "Previous probability"][index], type: "TEXT",
    box: { x: 20 + index * 100, y: index ? 300 : 210, width: 90, height: 20 }, style: {}, children: [] }));
  design.root.children = [{ id: "card", parentId: "root", name: "Card", type: "GROUP", box: { x: 10, y: 200, width: 360, height: 160 }, style: {}, children }];
  for (const sample of evidence.samples) {
    const base = sample.elements[0];
    sample.elements = [{ ...base, dataFigmaId: undefined, selector: "article", text: "", style: {}, box: { x: 10, y: 100, width: 360, height: 160 }, fingerprint: { ...base.fingerprint, key: "article" } },
      ...children.map((node, index) => ({ ...base, dataFigmaId: undefined, selector: `article > .${node.id}`, parentSelector: "article", text: node.text, style: {},
        box: { ...node.box, x: node.box.x + (index ? 15 : 0), y: node.box.y - 100 }, fingerprint: { ...base.fingerprint, key: node.id } }))];
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const region = result.matching.pageAlignment.regions.find(region => region.designParentFigmaNodeId === "card");
  assert.deepEqual(region?.displacement, { x: 0, y: -100 });
  const local = result.issues.find(issue => issue.rule === "position" && issue.figmaNodeId === "field1");
  assert.match(local!.summary, /15px/);
  assert.ok(!result.issues.some(issue => issue.rule === "position" && issue.figmaNodeId === "field0"));
  assert.ok(!result.issues.some(issue => issue.rule === "region_displacement"));
});

test("local pixel acceptance compares reliable matched content while keeping the original diagnostic diff", async () => {
  const { design, evidence } = await fixture();
  const draw = (dy: number) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="400" height="600" fill="white"/><rect x="10" y="${200+dy}" width="360" height="160" fill="blue"/><rect x="20" y="${210+dy}" width="100" height="20" fill="black"/><rect x="20" y="${330+dy}" width="100" height="20" fill="black"/></svg>`)).png().toBuffer();
  design.render.image = await draw(0);
  design.root.children = [{ id: "card", name: "Card", type: "GROUP", parentId: "root", box: { x: 10, y: 200, width: 360, height: 160 }, style: {}, children:
    ["Heading", "Caption"].map((text, index) => ({ id: `text${index}`, parentId: "card", name: text, text, type: "TEXT", box: { x: 20, y: 210 + index * 120, width: 100, height: 20 }, style: {}, children: [] })) }];
  const image = await draw(-100);
  for (const sample of evidence.samples) {
    const base = sample.elements[0]; sample.image = image;
    sample.elements = [{ ...base, dataFigmaId: undefined, selector: "article", text: "", style: {}, box: { x: 10, y: 100, width: 360, height: 160 }, fingerprint: { ...base.fingerprint, key: "article" } },
      ...design.root.children[0].children.map(node => ({ ...base, dataFigmaId: undefined, selector: `article > .${node.id}`, parentSelector: "article", text: node.text, style: {},
        box: { ...node.box!, y: node.box!.y - 100 }, fingerprint: { ...base.fingerprint, key: node.id } }))];
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.similarity, 1);
  assert.equal(result.matching.visualScope?.reviewedPixels, 2 * 100 * 20);
  assert.ok(result.matching.visualScope!.reviewedPixels < 360 * 160);
  assert.equal(result.matching.visualScope?.canvasPixels, 400 * 600);
  assert.ok(!result.issues.some(issue => issue.rule === "visual_similarity"));
  const diff = await sharp(result.diffImage).ensureAlpha().raw().toBuffer();
  assert.ok(diff.some((value, index) => index % 4 === 3 && value > 0));
  const defect = await sharp(image).composite([{ input: await sharp({ create: { width: 50, height: 20, channels: 4, background: "white" } }).png().toBuffer(), left: 50, top: 110 }]).png().toBuffer();
  for (const sample of evidence.samples) sample.image = defect;
  const withDefect = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.ok(withDefect.similarity < result.similarity);
  assert.equal(withDefect.similarity, 0.75);
  assert.ok(withDefect.issues.some(issue => issue.rule === "visual_similarity" && issue.severity === "error"));
  const matchedHeading = withDefect.matching.designCoverage!.items.find(item => item.figmaNodeId === "text0")!;
  assert.equal(matchedHeading.designBox!.y - matchedHeading.actualBox!.y, 100);

});

test("overlapping inner backgrounds fall back to their unambiguous enclosing region", async () => {
  const { design, evidence } = await fixture();
  const rectangle = (id: string, x: number, width: number) => ({ id, parentId: "root", name: id, type: "RECTANGLE", box: { x, y: 100, width, height: 150 }, style: {}, children: [] });
  design.root.children = [rectangle("outer", 0, 400), rectangle("left", 10, 290), rectangle("right", 100, 290),
    { id: "label", parentId: "root", name: "label", type: "TEXT", text: "Shared label", box: { x: 170, y: 120, width: 50, height: 20 }, style: {}, children: [] }];
  for (const sample of evidence.samples) sample.elements = [];
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.matching.designCoverage!.items.find(item => item.figmaNodeId === "label")?.groupedParentFigmaNodeId, "outer");
});

test("a design-only short-title module stays outside H5 scope without shifting downstream position checks", async () => {
  const { design, evidence } = await fixture();
  const group = (id: string, y: number, labels: string[]) => ({ id, parentId: "root", name: id, type: "GROUP", box: { x: 10, y, width: 360, height: 100 }, style: {},
    children: labels.map((text, i) => ({ id: `${id}-${i}`, parentId: id, name: text, type: "TEXT", text, box: { x: 20, y: y + 10 + i * 50, width: 100, height: 20 }, style: {}, children: [] })) });
  design.root.children = [group("before", 50, ["上方模块", "上方说明"]), group("omitted", 170, ["投票", "投票"]), group("after", 290, ["下方模块", "下方说明"])];
  for (const sample of evidence.samples) {
    const base = sample.elements[0];
    sample.elements = design.root.children.filter(node => node.id !== "omitted").flatMap(node => {
      const dy = node.id === "after" ? -120 : 0;
      return [{ ...base, dataFigmaId: undefined, selector: node.id, text: "", style: {}, box: { ...node.box!, y: node.box!.y + dy }, fingerprint: { ...base.fingerprint, key: node.id } },
        ...node.children.map(child => ({ ...base, dataFigmaId: undefined, selector: `${node.id} > ${child.id}`, parentSelector: node.id, text: child.text, style: {}, box: { ...child.box!, y: child.box!.y + dy }, fingerprint: { ...base.fingerprint, key: child.id } }))];
    });
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  const assertOutsideScope = (review: typeof result) => {
    assert.equal(review.matching.designCoverage!.items.length, 9);
    const omitted = review.matching.designCoverage!.items.filter(item => item.figmaNodeId.startsWith("omitted"));
    assert.equal(omitted.length, 3);
    assert.ok(omitted.every(item => item.status === "outside-scope" && item.reviewStatus === "not-applicable" && item.issueIds.length === 0));
    assert.ok(!review.issues.some(issue => ["missing_module", "region_displacement"].includes(issue.rule)));
    assert.ok(!review.issues.some(issue => issue.rule === "position" && issue.figmaNodeId?.startsWith("after")));
  };
  assertOutsideScope(result);
  // Alignment displacement remains reproducible diagnostic evidence, not an acceptance finding.
  assert.equal(result.matching.pageAlignment.regions.find(region => region.designParentFigmaNodeId === "after")?.displacement?.y, -120);
  design.root.children[2].children[1].text = "关于投票的报道";
  for (const sample of evidence.samples) sample.elements.find(item => item.selector === "after > after-1")!.text = "关于投票的报道";
  assertOutsideScope(await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en"));
  // A shared page translation must not turn the intentional omission into a positional defect.
  for (const sample of evidence.samples) for (const element of sample.elements) element.box.y -= 20;
  assertOutsideScope(await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en"));
  // Nor may a different collapsed gap reintroduce cumulative top-to-bottom checks.
  for (const sample of evidence.samples) for (const element of sample.elements.filter(item => item.selector.startsWith("after"))) element.box.y += 70;
  assertOutsideScope(await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en"));
});

test("normalizing a date never hides a changed fixed label in the same text node", async () => {
  const { design, evidence } = await fixture();
  design.root.children[0].name = "Meeting date";
  design.root.children[0].text = "Meeting time: 2027/03/18 02:00";
  for (const sample of evidence.samples) sample.elements[0].text = "Publication time: 2027/04/18 03:00";
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.ok(result.issues.some(issue => issue.rule === "content"));
  assert.equal(result.dynamicNormalization.regions.length, 0);
});

test("unmatched design content cannot steal a nested actual element from another verified region", async () => {
  const { design, evidence } = await fixture();
  const title = design.root.children[0];
  const caption = { ...structuredClone(title), id: "caption", text: "Publication details", box: { ...title.box!, y: 80 } };
  design.root.children = [{ id: "known", name: "Known", type: "GROUP", parentId: "root", box: { x: 10, y: 10, width: 360, height: 150 }, style: {}, children: [title, caption] },
    { id: "other", name: "Other", type: "GROUP", parentId: "root", box: { x: 10, y: 200, width: 360, height: 150 }, style: {}, children: [
      { id: "other-shape", name: "Shape", type: "RECTANGLE", parentId: "other", box: { x: 40, y: 120, width: 60, height: 20 }, style: {}, children: [] }] }];
  title.parentId = "known"; caption.parentId = "known";
  for (const sample of evidence.samples) {
    const base = sample.elements[0];
    sample.elements = [{ ...base, dataFigmaId: undefined, selector: "article", text: "", style: {}, box: { x: 10, y: 10, width: 360, height: 150 }, fingerprint: { ...base.fingerprint, key: "article" } },
      ...[title, caption].map(node => ({ ...base, dataFigmaId: undefined, selector: `article > ${node.id}`, parentSelector: "article", text: node.text, box: node.box!, fingerprint: { ...base.fingerprint, key: node.id } })),
      { ...base, dataFigmaId: undefined, selector: "shell", parentSelector: "article", text: "", style: {}, box: { x: 30, y: 110, width: 100, height: 30 }, fingerprint: { ...base.fingerprint, key: "shell" } },
      { ...base, dataFigmaId: undefined, selector: "nested", parentSelector: "shell", text: "", style: {}, box: { x: 40, y: 120, width: 60, height: 20 }, fingerprint: { ...base.fingerprint, key: "nested" } }];
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.ok(!result.matching.matches.some(match => match.figmaNodeId === "other-shape"));
});

test("verified horizontal date slots use purpose rules without AI while retaining typography differences", async () => {
  const { design, evidence } = await fixture();
  design.root.children = [{ id: "dates", parentId: "root", name: "Meeting dates", type: "GROUP", box: { x: 10, y: 20, width: 300, height: 40 }, style: {},
    children: ["3月19日", "4月30日"].map((text, i) => ({ id: `date${i}`, parentId: "dates", name: "日期", type: "TEXT", text, box: { x: 20 + i * 140, y: 30, width: 100, height: 20 }, style: { fontSize: 16 }, children: [] })) }];
  for (const sample of evidence.samples) {
    const base = sample.elements[0];
    sample.elements = [{ ...base, dataFigmaId: "dates", selector: "nav", text: "", box: { x: 10, y: 20, width: 300, height: 40 }, style: {}, fingerprint: { ...base.fingerprint, key: "dates" } },
      ...design.root.children[0].children.map((node, i) => ({ ...base, dataFigmaId: undefined, selector: `nav > date${i}`, parentSelector: "nav", text: ["9月17日", "10月29日"][i], box: node.box!, style: { fontSize: 18 }, fingerprint: { ...base.fingerprint, key: node.id } }))];
  }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.dynamicNormalization.regions.length, 2);
  assert.equal(result.matching.designCoverage!.items.find(item => item.figmaNodeId === "date0")?.status, "matched");
  assert.ok(result.issues.some(issue => issue.figmaNodeId === "date0" && issue.rule === "typography"));
});

test("a dynamic text width without a design sizing constraint stays pending rather than passing or failing", async () => {
  const { design, evidence } = await fixture();
  design.root.children[0].name = "Market price"; design.root.children[0].text = "9.9";
  for (const sample of evidence.samples) { sample.elements[0].text = "10,000.00"; sample.elements[0].box.width += 60; }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.matching.designCoverage!.items[0].checks?.find(check => check.property === "width")?.status, "pending");
  assert.ok(!result.issues.some(issue => issue.rule === "size" && issue.severity === "error"));
});

test("typed probability cells bind within independently identified columns and keep their style defects", async () => {
  const { design, evidence } = await fixture();
  const fields = ["Latest probability", "Previous probability"].flatMap((text, i) => [
    { id: `header${i}`, parentId: "table", name: text, text, type: "TEXT", box: { x: 20 + i * 170, y: 210, width: 140, height: 20 }, style: {}, children: [] },
    { id: `value${i}`, parentId: "table", name: "数值", text: "41.40%", type: "TEXT", box: { x: 20 + i * 170, y: 250, width: 70, height: 20 }, style: { fontSize: 16 }, children: [] }]);
  design.root.children = [{ id: "table", parentId: "root", name: "Probability table", type: "GROUP", box: { x: 10, y: 200, width: 360, height: 100 }, style: {}, children: fields }];
  for (const sample of evidence.samples) { const base = sample.elements[0];
    sample.elements = [{ ...base, dataFigmaId: undefined, selector: "table", text: "", style: {}, box: { x: 10, y: 100, width: 360, height: 100 }, fingerprint: { ...base.fingerprint, key: "table" } },
      ...fields.map(node => ({ ...base, dataFigmaId: undefined, selector: `table > ${node.id}`, parentSelector: "table", text: node.id.startsWith("value") ? "20.30%" : node.text,
        box: { ...node.box, y: node.box.y - 100 }, style: node.id.startsWith("value") ? { fontSize: 20 } : {}, fingerprint: { ...base.fingerprint, key: node.id } }))]; }
  const result = await compareDesignToPage(design, evidence, parseAcceptanceYaml(), "en");
  assert.equal(result.dynamicNormalization.regions.filter(region => region.kind === "probability").length, 2);
  assert.ok(result.issues.some(issue => issue.rule === "typography" && issue.figmaNodeId === "value0"));
  assert.ok(!result.issues.some(issue => issue.rule === "content" && issue.figmaNodeId === "value0"));
});

test("local child offsets remain actionable while nested page displacement stays diagnostic", async () => {
  const {design,evidence}=await fixture();
  const fields=['Latest probability','Previous probability','Weekly probability'].map((text,i)=>({id:`f${i}`,parentId:'table',name:text,text,type:'TEXT',box:{x:30+i*100,y:300,width:90,height:20},style:{},children:[]}));
  const table={id:'table',parentId:'card',name:'Probability table',type:'GROUP',box:{x:20,y:280,width:340,height:80},style:{},children:fields};
  const heading={id:'title',parentId:'card',name:'Rates',text:'Rates',type:'TEXT',box:{x:20,y:210,width:90,height:20},style:{},children:[]};
  design.root.children=[{id:'card',parentId:'root',name:'Card',type:'GROUP',box:{x:10,y:200,width:360,height:160},style:{},children:[heading,table]}];
  for(const sample of evidence.samples){const base=sample.elements[0];sample.elements=[
    {node:design.root.children[0],selector:'article',parentSelector:undefined,dx:0},
    {node:heading,selector:'article > h2',parentSelector:'article',dx:0},
    {node:table,selector:'article > section',parentSelector:'article',dx:0},
    ...fields.map(node=>({node,selector:`article > section > .${node.id}`,parentSelector:'article > section',dx:-15}))
  ].map(({node,selector,parentSelector,dx})=>({...base,dataFigmaId:node.id,selector,parentSelector,text:('text' in node ? node.text : '')??'',style:{},box:{...node.box!,x:node.box!.x+dx,y:node.box!.y-100},fingerprint:{...base.fingerprint,key:node.id}}));}
  const result=await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
  const item=result.matching.designCoverage!.items.find(i=>i.figmaNodeId==='table')!;
  assert.ok(!result.issues.some(i=>i.rule==='region_displacement'));
  assert.ok(!result.issues.some(i=>i.figmaNodeId==='table' && i.rule==='position'));
  assert.equal(item.checks?.find(check => check.property === 'x')?.status, 'passed');
  assert.equal(item.checks?.find(check => check.property === 'y')?.status, 'passed');
  for (const field of fields) {
    const coverage = result.matching.designCoverage!.items.find(i => i.figmaNodeId === field.id)!;
    assert.equal(coverage.checks?.find(check => check.property === 'x')?.status, 'difference');
    assert.ok(result.issues.some(issue => issue.figmaNodeId === field.id && issue.evidence.some(e => e.rule === 'position')));
  }
});

test("a graphical instruction marker cannot bind to a nearby price label by geometry", async () => {
  const {design,evidence}=await fixture();
  Object.assign(design.root.children[0],{type:'VECTOR',name:'Chart arrow',text:undefined});
  for(const sample of evidence.samples)Object.assign(sample.elements[0],{dataFigmaId:undefined,tag:'span',text:'¥666'});
  const result=await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
  assert.equal(result.matching.matches.length,0);
  assert.ok(!result.issues.some(i=>i.figmaNodeId==='heading'&&['position','size','decoration','typography'].includes(i.rule)));
  assert.equal(result.matching.designCoverage!.items[0].reviewStatus,'not-applicable');
  assert.equal(result.matching.designCoverage!.items[0].status,'outside-scope');
  assert.ok(result.issues.some(issue => issue.rule === 'actual_coverage_unverified' && issue.selector === 'h1' && issue.severity === 'pending'));
});

test("an unverified geometric candidate produces coverage work instead of CSS repair instructions", async () => {
  const {design,evidence}=await fixture();
  Object.assign(design.root.children[0],{type:'RECTANGLE',name:'Mask',text:undefined});
  for(const sample of evidence.samples)Object.assign(sample.elements[0],{dataFigmaId:undefined,text:undefined,tag:'div',style:{backgroundColor:'#111111'},box:{x:28,y:20,width:120,height:24}});
  const result=await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
  assert.ok(result.issues.some(i=>i.rule==='actual_coverage_unverified' && i.selector === 'h1' && i.severity === 'pending'));
  assert.equal(result.matching.designCoverage!.items[0].status, 'outside-scope');
  assert.equal(result.matching.designCoverage!.actualItems![0].status, 'unverified');
  assert.ok(!result.issues.some(i=>i.figmaNodeId==='heading'&&['position','size','typography','decoration'].includes(i.rule)));
});

test("nested design regions never reverse their actual ancestor ordering", async () => {
  const {design,evidence}=await fixture();
  const fields=['First heading','Second heading'].map((text,i)=>({id:`anchor${i}`,parentId:'inner',name:text,text,type:'TEXT',box:{x:20,y:60+i*50,width:100,height:20},style:{},children:[]}));
  design.root.children=[{id:'outer',name:'Outer',type:'GROUP',box:{x:10,y:40,width:360,height:240},style:{},children:[{id:'inner',parentId:'outer',name:'Inner',type:'GROUP',box:{x:10,y:40,width:360,height:180},style:{},children:fields}]}];
  for(const sample of evidence.samples){const base=sample.elements[0];sample.elements=[
    {...base,dataFigmaId:undefined,selector:'article',text:'',parentSelector:undefined,box:{x:10,y:40,width:360,height:240},fingerprint:{...base.fingerprint,key:'article'}},
    {...base,dataFigmaId:undefined,selector:'article > section',text:'',parentSelector:'article',box:{x:10,y:40,width:360,height:180},fingerprint:{...base.fingerprint,key:'section'}},
    ...fields.map(node=>({...base,dataFigmaId:undefined,selector:`article > section > .${node.id}`,parentSelector:'article > section',text:node.text,box:node.box,fingerprint:{...base.fingerprint,key:node.id}}))];}
  const result=await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
  const regions=result.matching.pageAlignment.regions;
  for (const region of regions) {
    const binding=result.matching.matches.find(match=>match.figmaNodeId===region.designParentFigmaNodeId && match.method==='verified-region');
    if(binding) assert.ok(binding.evidenceConfidence.score <= region.evidenceConfidence.score);
  }
  assert.ok(!regions.some(p=>p.designParentFigmaNodeId==='outer'&&p.actualParentSelector==='article > section')||!regions.some(c=>c.designParentFigmaNodeId==='inner'&&c.actualParentSelector==='article'));
});

test("a verified collapsed control cannot supply a page reference for downstream horizontal or vertical placement", async () => {
  const {design,evidence}=await fixture();
  const heading=design.root.children[0]; heading.box={x:20,y:300,width:100,height:24};
  design.root.children.unshift({id:'instructions',name:'Instructions',type:'FRAME',box:{x:10,y:20,width:360,height:250},style:{},children:[]});
  for(const sample of evidence.samples){const base=sample.elements[0];base.box={...heading.box,y:150,x:28};sample.elements.push({...base,dataFigmaId:'instructions',selector:'section',text:'',box:{x:10,y:20,width:360,height:100},fingerprint:{...base.fingerprint,key:'section'}});sample.elements.push({...base,dataFigmaId:undefined,selector:'section > button',parentSelector:'section',text:'Expand',expanded:false,box:{x:20,y:90,width:60,height:20},fingerprint:{...base.fingerprint,key:'toggle'}} as typeof base);}
  const result=await compareDesignToPage(design,evidence,parseAcceptanceYaml(),'en');
  const checks=result.matching.designCoverage!.items.find(i=>i.figmaNodeId==='heading')!.checks!;
  assert.equal(checks.find(c=>c.property==='y')?.status,'pending');
  assert.equal(checks.find(c=>c.property==='x')?.status,'pending');
  assert.ok(!result.issues.some(issue => issue.rule === 'position' && issue.figmaNodeId === 'heading'));
});
