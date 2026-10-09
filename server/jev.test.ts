import assert from "node:assert/strict";
import test from "node:test";
import type { ReviewIssue } from "../src/types";
import { generateJevAdvice } from "./jev";

const groundedIssue: ReviewIssue = {
  id: "issue-position-1",
  category: "布局",
  severity: "error",
  title: "利率观察模块整体位置偏移",
  summary: "已匹配模块相对设计稿下移 24px。",
  expected: "y=120",
  actual: "y=144",
  suggestion: "调整已匹配模块的容器位置。",
  rule: "position",
  evidenceConfidence: {
    score: 0.98,
    level: "high",
    basis: ["geometric-alignment"],
    reasons: ["两个稳定结构锚点支持该结论。"]
  },
  priority: "P0",
  location: {
    selector: "#rate-observation",
    figmaNodeId: "2:matched",
    description: "利率观察"
  },
  primaryAction: "将 #rate-observation 上移 24px。",
  evidence: []
};

const base = { apiKey: "secret-key", locale: "zh-CN" as const,
  pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 } };

function answers(body: any, score: (index: number) => number = () => 0.8) {
  return { answers: Object.fromEntries(Object.keys(body.questions).map(key =>
    [key, { type: "noul", noul: score(Number(key.slice(1))) }])) };
}

test("Jev batches all evidence with bounded concurrency and preserves low-ranked mandatory coverage", async t => {
  let active = 0, peak = 0;
  const seen = new Set<number>();
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://api.typesafe.ai/v1/systemone");
    assert.equal(init.redirect, "error");
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, "jev-1.13.0");
    assert.ok(body.state.length <= 48);
    assert.ok(Buffer.byteLength(JSON.stringify(body)) < 64_000);
    for (const item of body.state) {
      assert.ok(!seen.has(item.index)); seen.add(item.index);
      assert.ok(!item.text.includes("secret-key"));
    }
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--;
    return Response.json(answers(body, index => index < 108 ? 0.9 : 0));
  });
  const issues: ReviewIssue[] = Array.from({ length: 110 }, (_, i) => ({ ...groundedIssue, id: `issue-${i}` }));
  issues[108] = { ...issues[108], rule: "missing_module" };
  issues[109] = { ...issues[109], rule: "design_coverage_unverified", severity: "pending", priority: "Pending",
    title: "模块待核验", primaryAction: "核验该模块是否存在", coverageModule: { id: "module", name: "模块", nodeIds: ["module"] } };
  const advice = await generateJevAdvice({ ...base, issues });
  assert.equal(seen.size, 110);
  assert.equal(peak, 2);
  for (const id of [108, 109]) {
    assert.ok(advice.summaryEvidenceRefs.includes(`review-issue:issue-${id}`));
    assert.ok(advice.priorities.some(item => item.evidenceRefs.includes(`review-issue:issue-${id}`)));
  }
  assert.equal(advice.priorities.find(item => item.title === "模块待核验")?.action, "核验该模块是否存在");
});

for (const [name, value] of Object.entries({
  missing: { answers: {} },
  unknown: { answers: { q0: { type: "noul", noul: 0.2 }, injected: { type: "noul", noul: 1 } } },
  invalid: { answers: { q0: { type: "noul", noul: 2 } } },
  wrongType: { answers: { q0: { type: "score", noul: 0.5 } } }
})) test(`Jev rejects ${name} answers`, async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json(value));
  await assert.rejects(generateJevAdvice({ ...base, issues: [groundedIssue] }), /AI advice Jev/);
});

test("Jev does not echo credential-bearing provider failures or retry 429", async t => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return new Response("secret-key", { status: 429 }); });
  await assert.rejects(generateJevAdvice({ ...base, issues: [groundedIssue] }), error => {
    assert.match(String(error), /HTTP 429/); assert.ok(!String(error).includes("secret-key")); return true;
  });
  assert.equal(calls, 1);
});

test("Jev requires its own credential before any network request", async t => {
  t.mock.method(globalThis, "fetch", async () => { assert.fail("unexpected network request"); });
  await assert.rejects(generateJevAdvice({ ...base, apiKey: "", issues: [groundedIssue] }), /TYPESAFE_API_KEY/);
});

test("Jev orders references by probability and breaks ties in original order", async t => {
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) =>
    Response.json(answers(JSON.parse(String(init.body)), index => index === 2 ? 1 : 0.5)));
  const advice = await generateJevAdvice({ ...base,
    issues: [0, 1, 2].map(index => ({ ...groundedIssue, id: String(index) })) });
  assert.deepEqual(advice.summaryEvidenceRefs, ["review-issue:2", "review-issue:0", "review-issue:1"]);
});

test("Jev cancels an in-flight sibling batch after failure and publishes no partial ranking", async t => {
  let calls = 0;
  let cancelled = false;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    if (++calls === 1) {
      await new Promise(resolve => setTimeout(resolve, 5));
      return new Response("unavailable", { status: 503 });
    }
    return new Promise<Response>((_resolve, reject) => {
      init.signal!.addEventListener("abort", () => { cancelled = true; reject(init.signal!.reason); }, { once: true });
    });
  });
  await assert.rejects(generateJevAdvice({ ...base,
    issues: Array.from({ length: 110 }, (_, index) => ({ ...groundedIssue, id: String(index) })) }), /HTTP 503/);
  assert.equal(calls, 2);
  assert.equal(cancelled, true);
});
