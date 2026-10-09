import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import sharp from "sharp";
import ExcelJS from "exceljs";
import { ReviewService } from "./review";
import { createPublicApiApp, type PublicApiOptions } from "./public-api";
import type { FigmaDesignTruth, LiveActualEvidence } from "../src/types";

// Only external Figma/browser evidence and the clock are substituted. Comparison,
// Review orchestration, Excel, HTTP serialization and downloads execute normally.
export async function reviewFixture(options: Partial<PublicApiOptions> = {}) {
  const image = await sharp({ create: { width: 100, height: 200, channels: 4, background: "white" } }).png().toBuffer();
  const box = { x: 10, y: 130, width: 60, height: 30 };
  const design: FigmaDesignTruth = {
    source: { kind: "figma", fileKey: "FILE", frameId: "1:1", frameName: "Page" },
    render: { image, viewport: { width: 100, height: 200 } },
    root: { id: "1:1", name: "Page", type: "FRAME", box: { x: 0, y: 0, width: 100, height: 200 }, style: {},
      children: [{ id: "1:2", parentId: "1:1", name: "Submit", type: "RECTANGLE", box, style: { borderRadius: 8 }, children: [] }] },
    diagnostics: [], resources: { components: {}, componentSets: {}, styles: {} }
  };
  const evidence: LiveActualEvidence = {
    kind: "live", sourceUrl: "https://h5.example.com/page", finalUrl: "https://h5.example.com/page",
    viewport: { width: 100, height: 200 }, canonicalSampleIndex: 0,
    samples: [0, 1, 2].map(index => ({ index, capturedAtMs: index * 1000, image,
      coverage: { fullDocument: true, elementLimitReached: false, opaqueContent: false, excludedContent: false },
      elements: [{ selector: "button", tag: "button", text: "", dataFigmaId: "1:2", box: { ...box }, style: { borderRadius: 4 },
        fingerprint: { key: "figma:1:2", identitySource: "figma-id", tag: "button", selector: "button", region: "bottom", geometryBucket: "", styleSignature: "" } }], audits: [] })),
    elementChanges: [], pixelVariance: { image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1 }, diagnostics: []
  };
  const captureControl: { beforeCapture?: () => Promise<void> } = {};
  const service = new ReviewService({ environment: {}, dependencies: {
    buildDesignTruthFromFigma: async () => structuredCloneDesign(),
    captureLiveActualEvidence: async () => { await captureControl.beforeCapture?.(); return evidence; }
  } });
  function structuredCloneDesign() { return { ...design, root: structuredClone(design.root) }; }
  let now = Date.parse("2026-09-16T00:00:00Z");
  const app = createPublicApiApp({
    serviceTokens: { a: { tenantId: "a", scopes: ["reviews:create", "reviews:read", "reviews:cancel"] }, b: { tenantId: "b", scopes: ["reviews:create", "reviews:read"] } },
    allowedHosts: ["h5.example.com"], lookupHost: async () => ["93.184.216.34"], resolveCredential: async () => "secret",
    signingSecret: "test-secret", now: () => new Date(now),
    executeReview: (input, context) => service.reviewPagePairs(input, context), ...options
  });
  return { app, design, evidence, captureControl, advance: (ms: number) => { now += ms; } };
}

export const pagePair = { clientPageId: "page-1", pageName: "Page",
  design: { kind: "figma", frameUrl: "https://www.figma.com/design/FILE/page?node-id=1-1", credentialRef: "figma" },
  actual: { kind: "live", url: "https://h5.example.com/page" } };
export const headers = { authorization: "Bearer a", "content-type": "application/json" };
export async function withServer(app: ReturnType<typeof createPublicApiApp>, run: (base: string) => Promise<void>) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>(resolve => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
export async function completed(base: string, path = "/v1/reviews", body: unknown = { name: "Review", pagePairs: [pagePair] }, allowFailed = false) {
  const response = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  assert.equal(response.status, 202, await response.clone().text());
  const accepted = await response.json();
  for (let i = 0; i < 100; i++) {
    const result = await fetch(base + accepted.resultUrl, { headers });
    if (result.status === 200) return { accepted, result: await result.json() };
    const status = await (await fetch(base + accepted.statusUrl, { headers })).json();
    if (status.status === "failed" && !allowFailed) assert.fail(JSON.stringify(status));
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail("Review did not complete");
}

test("public results link to downloadable full-page evidence without embedding image bytes", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    const { result } = await completed(base);
    const page = result.pageResults[0];
    assert.ok(page.pageEvidence?.designImage?.downloadUrl);
    for (const name of ["designImage", "actualImage", "diffImage"]) {
      const ref = page.pageEvidence[name];
      assert.equal(ref.width, 100);
      assert.equal(ref.height, 200);
      const response = await fetch(base + ref.downloadUrl);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
      assert.equal(metadata.height, 200);
    }
    assert.ok(!JSON.stringify(result).includes("base64"));
  });
});

test("image downloads preserve tenant authorization, signature scope, expiry and URL renewal", async () => {
  const fixture = await reviewFixture();
  await withServer(fixture.app, async base => {
    const { accepted, result } = await completed(base);
    const ref = result.pageResults[0].pageEvidence.actualImage;
    const path = ref.downloadUrl.split("?")[0];
    assert.equal((await fetch(base + path)).status, 401);
    assert.equal((await fetch(base + path, { headers: { authorization: "Bearer b" } })).status, 404);
    assert.equal((await fetch(base + accepted.resultUrl, { headers: { authorization: "Bearer b" } })).status, 404);
    assert.equal((await fetch(base + path, { headers })).status, 200);
    assert.equal((await fetch(base + ref.downloadUrl.replace("_actual?", "_reference?"))).status, 403);
    fixture.advance(11 * 60 * 1000);
    assert.equal((await fetch(base + ref.downloadUrl)).status, 410);
    const renewed = await (await fetch(base + accepted.resultUrl, { headers })).json();
    assert.equal((await fetch(base + renewed.pageResults[0].pageEvidence.actualImage.downloadUrl)).status, 200);
    assert.equal(renewed.pageResults[0].pageEvidence.actualImage.sha256, ref.sha256);
  });
});

test("issue crops use each side's full-image coordinates and appear in the artifact inventory", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    const { result, accepted } = await completed(base);
    const issue = result.pageResults[0].issues.find((item: { rule: string }) => item.rule === "decoration");
    assert.ok(issue, JSON.stringify(result.pageResults[0].issues));
    for (const side of ["designCrop", "actualCrop"]) {
      const crop = issue[side];
      assert.ok(crop?.downloadUrl);
      assert.deepEqual(crop.box, { x: 10, y: 130, width: 60, height: 30 });
      const response = await fetch(base + crop.downloadUrl);
      const meta = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
      assert.equal(meta.width, 60);
      assert.equal(meta.height, 30);
      const inventory = await (await fetch(base + accepted.artifactsUrl, { headers })).json();
      assert.ok(inventory.artifacts.some((item: { artifactId: string }) => item.artifactId === crop.artifactId));
    }
  });
});

test("a selected issue is passed only after fresh measurement of its verified target", async () => {
  const { app, evidence } = await reviewFixture();
  for (const sample of evidence.samples) sample.elements[0].style.borderRadius = 8;
  await withServer(app, async base => {
    const { result } = await completed(base, "/v1/issue-rechecks", {
      name: "Recheck", pagePair, issue: { issueId: "admin-501", rule: "decoration", property: "borderRadius", figmaNodeId: "1:2" }
    });
    assert.equal(result.mode, "issue_recheck");
    assert.equal(result.results.length, 1);
    const target = result.results[0];
    assert.equal(target.issueId, "admin-501");
    assert.equal(target.verdict, "passed");
    assert.equal(target.checks[0].actual, 8);
    assert.equal(target.checks[0].expected, 8);
    assert.ok(target.designCrop?.downloadUrl);
    assert.ok(target.actualCrop?.downloadUrl);
    assert.ok(result.pageEvidence.actualImage.downloadUrl);
    assert.equal(result.pageResults, undefined);
  });
});

test("a formerly missing target is fixed when its current existence is independently verified", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    const { result } = await completed(base, "/v1/issue-rechecks", {
      name: "Missing module recheck", pagePair, issue: { issueId: 502, rule: "missing_module", figmaNodeId: "1:2" }
    });
    assert.equal(result.results[0].verdict, "passed");
    assert.equal(result.results[0].reasonCode, "VERIFIED_PRESENT");
    assert.ok(result.results[0].actualCrop?.downloadUrl);
    // Its unrelated radius defect is not silently promoted to this existence check.
    assert.equal(result.issues, undefined);
  });
});

test("verified static absence remains failed and never fabricates an actual crop", async () => {
  const fixture = await reviewFixture();
  fixture.design.root.children = [{ id: "module", parentId: "1:1", type: "FRAME", name: "Policy", box: { x: 10, y: 20, width: 80, height: 100 }, style: {}, children: [
    { id: "title", parentId: "module", type: "TEXT", name: "Policy title", text: "Policy overview", box: { x: 12, y: 25, width: 70, height: 20 }, style: {}, children: [] },
    { id: "detail", parentId: "module", type: "TEXT", name: "Decision title", text: "Latest decision", box: { x: 12, y: 55, width: 70, height: 20 }, style: {}, children: [] }
  ] }];
  for (const sample of fixture.evidence.samples) sample.elements = [];
  await withServer(fixture.app, async base => {
    const { result: review } = await completed(base);
    const missing = review.pageResults[0].issues.find((issue: { rule: string }) => issue.rule === "missing_module");
    assert.ok(missing, JSON.stringify(review.pageResults[0].matching.designCoverage));
    assert.equal(missing.actualCrop, null);
    const { result } = await completed(base, "/v1/issue-rechecks", {
      name: "Absence recheck", pagePair, issue: { issueId: 503, rule: "missing_module", figmaNodeId: missing.figmaNodeId }
    });
    assert.equal(result.results[0].verdict, "failed");
    assert.equal(result.results[0].reasonCode, "VERIFIED_ABSENT");
    assert.equal(result.results[0].actualCrop, null);
    assert.ok(result.results[0].designCrop.downloadUrl);
  });
});

test("remaining differences fail while missing targets, unsupported properties and obscured evidence stay unverified", async () => {
  const fixture = await reviewFixture();
  await withServer(fixture.app, async base => {
    const run = async (issue: Record<string, unknown>) => (await completed(base, "/v1/issue-rechecks", {
      name: "Target review", pagePair, issue: { issueId: "same-client-id", rule: "decoration", figmaNodeId: "1:2", ...issue }
    })).result.results[0];
    const difference = await run({ property: "borderRadius" });
    assert.equal(difference.verdict, "failed");
    assert.equal(difference.checks[0].actual, 4);
    assert.equal((await run({ property: "unsupported-property" })).verdict, "needs_review");
    assert.equal((await run({ rule: "unsupported-rule" })).verdict, "needs_review");
    assert.equal((await run({ figmaNodeId: "stale-node" })).verdict, "needs_review");
    for (const sample of fixture.evidence.samples) sample.elements[0].visuallyObscured = true;
    assert.equal((await run({ property: "borderRadius" })).verdict, "needs_review");
    for (const sample of fixture.evidence.samples) sample.elements = [];
    const notLocated = await run({ property: "borderRadius" });
    assert.equal(notLocated.verdict, "needs_review");
    assert.equal(notLocated.actualCrop, null);
  });
});

test("recheck evidence and Excel describe only the selected issue even when other properties still fail", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    const { accepted, result } = await completed(base, "/v1/issue-rechecks", {
      name: "Width recheck", locale: "en", pagePair, issue: { issueId: "width-1", rule: "size", property: "width", figmaNodeId: "1:2" }
    });
    assert.equal(result.results[0].verdict, "passed");
    const inventory = await (await fetch(base + accepted.artifactsUrl, { headers })).json();
    const excel = inventory.artifacts.find((item: { kind: string }) => item.kind === "excel");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await (await fetch(base + excel.downloadUrl)).arrayBuffer()) as never);
    const sheet = workbook.getWorksheet("Issue Rechecks");
    assert.ok(sheet);
    const content = JSON.stringify(sheet.getSheetValues());
    assert.ok(content.includes("width-1"));
    assert.ok(content.includes("passed"));
    assert.ok(!content.includes("borderRadius"));
    assert.equal(workbook.getWorksheet("Issues"), undefined);
    const status = await (await fetch(base + accepted.statusUrl, { headers })).json();
    assert.equal(status.verdict, "passed");
    assert.equal(status.summary.issues.p1, 0);
  });
});

test("recheck evidence references resolve to published target evidence in the same response", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    for (const rule of ["decoration", "missing_module"]) {
      const { result } = await completed(base, "/v1/issue-rechecks", {
        name: "Evidence refs", pagePair, issue: { issueId: 10, rule, figmaNodeId: "1:2" }
      });
      const target = result.results[0];
      assert.ok(target.evidenceRefs.length > 0);
      for (const ref of target.evidenceRefs) {
        const resolved = ref.startsWith("review-issue:") ? target.evidence?.some((issue: { id: string }) => `review-issue:${issue.id}` === ref)
          : ref === `design-coverage:${target.coverage?.figmaNodeId}`;
        assert.ok(resolved, `Dangling evidence ref: ${ref}`);
      }
    }
  });
});

test("simultaneous idempotent rechecks share one execution and conflicting targets are rejected", async () => {
  const { app } = await reviewFixture({ resolveCredential: async () => { await new Promise(resolve => setTimeout(resolve, 25)); return "secret"; } });
  await withServer(app, async base => {
    const body = { name: "Retry", pagePair, issue: { issueId: 11, rule: "decoration", figmaNodeId: "1:2" } };
    const submit = (value = body) => fetch(base + "/v1/issue-rechecks", {
      method: "POST", headers: { ...headers, "idempotency-key": "recheck-same" }, body: JSON.stringify(value)
    });
    const responses = await Promise.all([submit(), submit(), submit()]);
    assert.ok(responses.every(response => response.status === 202));
    const accepted = await Promise.all(responses.map(response => response.json()));
    assert.equal(new Set(accepted.map(item => item.reviewId)).size, 1);
    const conflict = await submit({ ...body, issue: { ...body.issue, rule: "size" } });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).error.code, "IDEMPOTENCY_CONFLICT");
  });
});

test("rechecks share Review queue capacity and cancellation without publishing a late result", async () => {
  const fixture = await reviewFixture({ maxConcurrentReviews: 1, maxConcurrentPagePairs: 1, maxQueuedReviews: 1 });
  let release!: () => void;
  fixture.captureControl.beforeCapture = () => new Promise<void>(resolve => { release = resolve; });
  await withServer(fixture.app, async base => {
    const first = await fetch(base + "/v1/reviews", { method: "POST", headers, body: JSON.stringify({ name: "Running", pagePairs: [pagePair] }) });
    const firstJob = await first.json();
    const body = { name: "Queued target", pagePair, issue: { issueId: 12, rule: "size", figmaNodeId: "1:2" } };
    const submit = () => fetch(base + "/v1/issue-rechecks", { method: "POST", headers, body: JSON.stringify(body) });
    try {
      const queued = await submit();
      assert.equal(queued.status, 202);
      const job = await queued.json();
      assert.equal((await (await fetch(base + job.statusUrl, { headers })).json()).status, "queued");
      const rejected = await submit();
      assert.equal(rejected.status, 429);
      assert.ok(rejected.headers.get("retry-after"));
      assert.equal((await rejected.json()).error.code, "REVIEW_CAPACITY_EXCEEDED");
      assert.equal((await fetch(base + job.statusUrl + "/cancel", { method: "POST", headers })).status, 200);
      assert.equal((await (await fetch(base + job.statusUrl, { headers })).json()).status, "cancelled");
      assert.equal((await fetch(base + job.resultUrl, { headers })).status, 409);
    } finally {
      await fetch(base + firstJob.statusUrl + "/cancel", { method: "POST", headers });
      release?.();
    }
  });
});

test("capture failure preserves the selected issue identity and exports a failed-execution recheck", async () => {
  const fixture = await reviewFixture();
  fixture.captureControl.beforeCapture = async () => { throw new Error("Capture unavailable"); };
  await withServer(fixture.app, async base => {
    const { result, accepted } = await completed(base, "/v1/issue-rechecks", {
      name: "Unavailable target", locale: "en", pagePair, issue: { issueId: 50, rule: "size", figmaNodeId: "1:2" }
    }, true);
    assert.equal(result.status, "failed");
    assert.equal(result.results[0].issueId, 50);
    assert.equal(result.results[0].verdict, "needs_review");
    assert.equal(result.results[0].reasonCode, "EXECUTION_FAILED");
    assert.equal(result.pageEvidence.actualImage, null);
    const inventory = await (await fetch(base + accepted.artifactsUrl, { headers })).json();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await (await fetch(base + inventory.artifacts[0].downloadUrl)).arrayBuffer()) as never);
    assert.ok(workbook.getWorksheet("Issue Rechecks"));
  });
});

test("duplicate page identities are rejected so evidence cannot be attached to the wrong page", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    const response = await fetch(base + "/v1/reviews", { method: "POST", headers,
      body: JSON.stringify({ name: "Duplicate", pagePairs: [pagePair, { ...pagePair, pageName: "Other page" }] }) });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  });
});

test("recheck route variants preserve target semantics and idempotent replay", async () => {
  const { app } = await reviewFixture();
  await withServer(app, async base => {
    const body = JSON.stringify({ name: "Route variant", pagePair, issue: { issueId: 51, rule: "size", figmaNodeId: "1:2" } });
    const options = { method: "POST", headers: { ...headers, "Idempotency-Key": "route-variant" }, body };
    const first = await fetch(base + "/v1/issue-rechecks", options);
    const second = await fetch(base + "/v1/issue-rechecks/", options);
    assert.equal(second.status, 202);
    assert.equal((await second.json()).reviewId, (await first.json()).reviewId);
  });
});
