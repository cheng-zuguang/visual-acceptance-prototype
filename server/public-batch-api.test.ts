import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { Express } from "express";
import type { BatchReviewResult } from "../src/types";
import { createPublicApiApp } from "./public-api";

async function withServer<T>(app: Express, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function livePage(clientPageId: string, pageName: string, path: string) {
  return {
    clientPageId,
    pageName,
    design: {
      kind: "figma",
      frameUrl: `https://www.figma.com/design/FILE_KEY/market?node-id=${path}`,
      credentialRef: "cred_figma"
    },
    actual: { kind: "live", url: `https://h5.example.com/${path}` }
  };
}

function batchResult(): BatchReviewResult {
  return {
    reviewName: "行情批量走查",
    executionStatus: "succeeded",
    verdict: "needs_review",
    summary: {
      totalPages: 2,
      completedPages: 2,
      executionFailedPages: 0,
      passedPages: 1,
      failedPages: 0,
      needsReviewPages: 1,
      issues: { p0: 0, p1: 0, p2: 0, pending: 1 }
    },
    pages: [
      { clientPageId: "market-home", pageName: "行情首页", executionStatus: "succeeded", verdict: "passed" },
      { clientPageId: "market-list", pageName: "行情列表", executionStatus: "succeeded", verdict: "needs_review" }
    ],
    excel: {
      kind: "excel",
      filename: "行情批量走查UI走查结果.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("batch-xlsx")
    }
  };
}

test("submits multiple public PagePairs and preserves every client page identity", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async (input) => {
      assert.deepEqual(input.pagePairs.map((page) => page.clientPageId), ["market-home", "market-list"]);
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "行情批量走查",
        pagePairs: [
          livePage("market-home", "行情首页", "1-2"),
          livePage("market-list", "行情列表", "1-3")
        ]
      })
    });
    assert.equal(response.status, 202);
    const accepted = await response.json() as { statusUrl: string; resultUrl: string; artifactsUrl: string };
    let status: { status?: string; summary?: { totalPages: number } } = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const current = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      status = await current.json() as typeof status;
      if (status.status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.summary?.totalPages, 2);

    const resultResponse = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(resultResponse.status, 200);
    const result = await resultResponse.json() as {
      pageResults: Array<{ clientPageId: string; pageName: string }>;
      artifactIds: string[];
    };
    assert.deepEqual(result.pageResults.map((page) => [page.clientPageId, page.pageName]), [
      ["market-home", "行情首页"],
      ["market-list", "行情列表"]
    ]);
    assert.deepEqual(result.artifactIds, ["art_excel"]);
  });
});

test("reuses an idempotent Review and rejects the same key with different content", async () => {
  let executions = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxReviewSubmissionsPerMinute: 1,
    executeReview: async () => {
      executions += 1;
      return batchResult();
    }
  });
  const body = {
    name: "行情批量走查",
    pagePairs: [livePage("market-home", "行情首页", "1-2")]
  };

  await withServer(app, async (baseUrl) => {
    const submit = (requestBody: unknown) => fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: {
        authorization: "Bearer service-token",
        "content-type": "application/json",
        "idempotency-key": "release-2026-09-08"
      },
      body: JSON.stringify(requestBody)
    });
    const first = await submit(body);
    const firstBody = await first.json() as { reviewId: string; statusUrl: string };
    const repeated = await submit(body);
    const repeatedBody = await repeated.json() as { reviewId: string; statusUrl: string };
    assert.equal(first.status, 202);
    assert.equal(repeated.status, 202);
    assert.equal(repeated.headers.get("idempotency-replayed"), "true");
    assert.equal(repeatedBody.reviewId, firstBody.reviewId);
    assert.equal(repeatedBody.statusUrl, firstBody.statusUrl);

    const conflict = await submit({ ...body, name: "另一个走查" });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json() as { error: { code: string } }).error.code, "IDEMPOTENCY_CONFLICT");
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(executions, 1);
  });
});

test("reports per-page progress and retains partial results when one page execution fails", async () => {
  let finish: (() => void) | undefined;
  const hold = new Promise<void>((resolve) => { finish = resolve; });
  const partial = batchResult();
  partial.executionStatus = "failed";
  partial.verdict = "passed";
  partial.summary.executionFailedPages = 1;
  partial.summary.passedPages = 1;
  partial.summary.needsReviewPages = 0;
  partial.pages[1] = {
    clientPageId: "market-list",
    pageName: "行情列表",
    executionStatus: "failed",
    error: { code: "PAGE_REVIEW_FAILED", message: "capture failed", retryable: true }
  };
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async (_input, context) => {
      context?.onPageUpdate({ clientPageId: "market-home", status: "running", stage: "capture" });
      context?.onPageUpdate({ clientPageId: "market-home", status: "succeeded", verdict: "passed", stage: "compare" });
      context?.onPageUpdate({ clientPageId: "market-list", status: "running", stage: "capture" });
      await hold;
      context?.onPageUpdate({
        clientPageId: "market-list",
        status: "failed",
        stage: "capture",
        error: { code: "PAGE_REVIEW_FAILED", message: "capture failed", retryable: true }
      });
      return partial;
    }
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "行情批量走查",
        pagePairs: [
          livePage("market-home", "行情首页", "1-2"),
          livePage("market-list", "行情列表", "1-3")
        ]
      })
    });
    const accepted = await created.json() as { statusUrl: string; resultUrl: string; artifactsUrl: string };
    let running: {
      progress?: { totalPages: number; completedPages: number; currentStage: string };
      pagePairs?: Array<{ clientPageId: string; status: string }>;
    } = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      running = await status.json() as typeof running;
      if (running.progress?.completedPages === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.deepEqual(running.progress, {
      totalPages: 2,
      completedPages: 1,
      currentStage: "capture"
    });
    assert.deepEqual(running.pagePairs?.map((page) => [page.clientPageId, page.status]), [
      ["market-home", "succeeded"],
      ["market-list", "running"]
    ]);

    finish?.();
    let terminalStatus = "";
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      terminalStatus = (await status.json() as { status: string }).status;
      if (terminalStatus === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(terminalStatus, "failed");
    const resultResponse = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(resultResponse.status, 200);
    const result = await resultResponse.json() as {
      pageResults: Array<{ clientPageId: string; status: string; verdict?: string; error?: { code: string } }>;
    };
    assert.deepEqual(result.pageResults.map((page) => ({
      clientPageId: page.clientPageId,
      status: page.status,
      verdict: page.verdict,
      errorCode: page.error?.code
    })), [
      { clientPageId: "market-home", status: "succeeded", verdict: "passed", errorCode: undefined },
      { clientPageId: "market-list", status: "failed", verdict: undefined, errorCode: "PAGE_REVIEW_FAILED" }
    ]);
    const artifacts = await fetch(`${baseUrl}${accepted.artifactsUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(artifacts.status, 200);
  });
});

test("rejects a public batch that exceeds the configured page quota", async () => {
  let executions = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxPages: 1,
    executeReview: async () => {
      executions += 1;
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "超额批量走查",
        pagePairs: [
          livePage("market-home", "行情首页", "1-2"),
          livePage("market-list", "行情列表", "1-3")
        ]
      })
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json() as { error: { code: string; retryable: boolean } }).error.code, "REVIEW_QUOTA_EXCEEDED");
    assert.equal(executions, 0);
  });
});

test("fails a public Review at its total runtime limit without losing stable status", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    reviewTimeoutMs: 10,
    executeReview: async () => new Promise<BatchReviewResult>(() => {})
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "限时走查",
        pagePairs: [livePage("market-home", "行情首页", "1-2")]
      })
    });
    const accepted = await created.json() as { statusUrl: string };
    let body: {
      status?: string;
      error?: { code: string; retryable: boolean };
      progress?: { currentStage: string };
    } = {};
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      body = await status.json() as typeof body;
      if (body.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(body.status, "failed");
    assert.deepEqual(body.error && { code: body.error.code, retryable: body.error.retryable }, {
      code: "REVIEW_TIMEOUT",
      retryable: true
    });
    assert.equal(body.progress?.currentStage, "failed");
  });
});

test("keeps excess Reviews queued until a global execution slot is released", async () => {
  let releaseFirst: (() => void) | undefined;
  const firstHold = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const started: string[] = [];
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxConcurrentReviews: 1,
    executeReview: async (input) => {
      started.push(input.reviewName);
      if (input.reviewName === "first") await firstHold;
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = async (name: string) => {
      const response = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: "Bearer service-token", "content-type": "application/json" },
        body: JSON.stringify({ name, pagePairs: [livePage(`${name}-page`, name, "1-2")] })
      });
      assert.equal(response.status, 202);
      return await response.json() as { statusUrl: string };
    };

    const first = await submit("first");
    const second = await submit("second");
    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondStatus = await fetch(`${baseUrl}${second.statusUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    const queued = await secondStatus.json() as { status: string; queuePosition?: number };
    assert.equal(queued.status, "queued");
    assert.equal(queued.queuePosition, 1);
    assert.deepEqual(started, ["first"]);

    releaseFirst?.();
    for (let attempt = 0; attempt < 30 && !started.includes("second"); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.deepEqual(started, ["first", "second"]);

    // Keep the first status URL observable so the server cannot optimise away the completed job.
    const firstStatus = await fetch(`${baseUrl}${first.statusUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal((await firstStatus.json() as { status: string }).status, "succeeded");
  });
});

test("limits concurrent Reviews per tenant without blocking another tenant", async () => {
  let release: (() => void) | undefined;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const started: string[] = [];
  const app = createPublicApiApp({
    serviceTokens: {
      "tenant-a-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] },
      "tenant-b-token": { tenantId: "tenant-b", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxConcurrentReviews: 2,
    maxConcurrentReviewsPerTenant: 1,
    executeReview: async (input) => {
      started.push(input.reviewName);
      await hold;
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = async (token: string, name: string) => {
      const response = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          name,
          pagePairs: [livePage(`${name}-page`, name, "1-2")]
        })
      });
      assert.equal(response.status, 202);
      return response.json() as Promise<{ statusUrl: string }>;
    };

    await submit("tenant-a-token", "a-first");
    const aSecond = await submit("tenant-a-token", "a-second");
    await submit("tenant-b-token", "b-first");
    for (let attempt = 0; attempt < 20 && started.length < 2; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.deepEqual(started, ["a-first", "b-first"]);
    const queued = await fetch(`${baseUrl}${aSecond.statusUrl}`, {
      headers: { authorization: "Bearer tenant-a-token" }
    });
    assert.equal((await queued.json() as { status: string }).status, "queued");
    release?.();
  });
});

test("rejects excess Reviews with retry guidance when the execution queue is full", async () => {
  let release: (() => void) | undefined;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxConcurrentReviews: 1,
    maxQueuedReviews: 1,
    capacityRetryAfterSeconds: 7,
    executeReview: async () => {
      await hold;
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = (name: string) => fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({ name, pagePairs: [livePage(name, name, name)] })
    });

    assert.equal((await submit("running")).status, 202);
    assert.equal((await submit("queued")).status, 202);
    const rejected = await submit("rejected");
    assert.equal(rejected.status, 429);
    assert.equal(rejected.headers.get("retry-after"), "7");
    const body = await rejected.json() as { error: { code: string; retryable: boolean } };
    assert.equal(body.error.code, "REVIEW_CAPACITY_EXCEEDED");
    assert.equal(body.error.retryable, true);
    release?.();
  });
});

test("reserves queue capacity by rejecting a tenant that exceeds its queued Review limit", async () => {
  let release: (() => void) | undefined;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  const app = createPublicApiApp({
    serviceTokens: {
      "tenant-a-token": { tenantId: "tenant-a", scopes: ["reviews:create"] },
      "tenant-b-token": { tenantId: "tenant-b", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxConcurrentReviews: 2,
    maxConcurrentReviewsPerTenant: 1,
    maxQueuedReviews: 3,
    maxQueuedReviewsPerTenant: 1,
    executeReview: async () => {
      await hold;
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = (token: string, name: string) => fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ name, pagePairs: [livePage(name, name, name)] })
    });

    assert.equal((await submit("tenant-a-token", "a-running")).status, 202);
    assert.equal((await submit("tenant-a-token", "a-queued")).status, 202);
    const tenantRejected = await submit("tenant-a-token", "a-rejected");
    assert.equal(tenantRejected.status, 429);
    assert.equal((await tenantRejected.json() as { error: { code: string } }).error.code, "REVIEW_CAPACITY_EXCEEDED");
    assert.equal((await submit("tenant-b-token", "b-running")).status, 202);
    release?.();
  });
});

test("shares a bounded global PagePair concurrency budget across running Reviews", async () => {
  const releases = new Map<string, () => void>();
  const grantedConcurrency = new Map<string, number>();
  const app = createPublicApiApp({
    serviceTokens: {
      "tenant-a-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] },
      "tenant-b-token": { tenantId: "tenant-b", scopes: ["reviews:create", "reviews:read"] },
      "tenant-c-token": { tenantId: "tenant-c", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    maxConcurrentReviews: 3,
    maxConcurrentPages: 3,
    maxConcurrentPagePairs: 4,
    executeReview: async (input, context) => {
      grantedConcurrency.set(input.reviewName, context?.maxConcurrency ?? 0);
      await new Promise<void>((resolve) => { releases.set(input.reviewName, resolve); });
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = async (token: string, name: string) => {
      const response = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          name,
          pagePairs: [
            livePage(`${name}-1`, `${name}-1`, `${name}-1`),
            livePage(`${name}-2`, `${name}-2`, `${name}-2`),
            livePage(`${name}-3`, `${name}-3`, `${name}-3`)
          ]
        })
      });
      return response.json() as Promise<{ statusUrl: string }>;
    };

    await submit("tenant-a-token", "first");
    await submit("tenant-b-token", "second");
    const third = await submit("tenant-c-token", "third");
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.deepEqual([...grantedConcurrency.entries()], [["first", 3], ["second", 1]]);
    const thirdStatus = await fetch(`${baseUrl}${third.statusUrl}`, {
      headers: { authorization: "Bearer tenant-c-token" }
    });
    assert.equal((await thirdStatus.json() as { status: string }).status, "queued");

    releases.get("second")?.();
    for (let attempt = 0; attempt < 20 && !grantedConcurrency.has("third"); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(grantedConcurrency.get("third"), 1);
    releases.get("first")?.();
    releases.get("third")?.();
  });
});

test("rate limits Review submissions per tenant before execution resources are saturated", async () => {
  let clock = Date.parse("2026-09-09T12:00:00.000Z");
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    now: () => new Date(clock),
    maxReviewSubmissionsPerMinute: 1,
    executeReview: async () => batchResult()
  });

  await withServer(app, async (baseUrl) => {
    const submit = (name: string) => fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({ name, pagePairs: [livePage(name, name, name)] })
    });

    assert.equal((await submit("first")).status, 202);
    const limited = await submit("second");
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.equal(
      (await limited.json() as { error: { code: string } }).error.code,
      "REVIEW_RATE_LIMITED"
    );

    clock += 60_000;
    assert.equal((await submit("after-window")).status, 202);
  });
});
