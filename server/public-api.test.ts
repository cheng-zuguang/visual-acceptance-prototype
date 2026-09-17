import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { Express } from "express";
import type { BatchReviewResult, CompareReport } from "../src/types";
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

function successfulReview(): BatchReviewResult {
  return {
    reviewName: "行情首页",
    executionStatus: "succeeded",
    verdict: "passed",
    summary: {
      totalPages: 1,
      completedPages: 1,
      executionFailedPages: 0,
      passedPages: 1,
      failedPages: 0,
      needsReviewPages: 0,
      issues: { p0: 0, p1: 0, p2: 0, pending: 0 }
    },
    pages: [{
      clientPageId: "market-home",
      pageName: "行情首页",
      executionStatus: "succeeded",
      verdict: "passed"
    }],
    excel: {
      kind: "excel",
      filename: "行情首页UI走查结果.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("xlsx")
    }
  };
}

const createBody = {
  name: "行情首页",
  locale: "zh-CN",
  pagePairs: [{
    clientPageId: "market-home",
    pageName: "行情首页",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
      credentialRef: "cred_figma"
    },
    actual: { kind: "live", url: "https://h5.example.com/market" }
  }]
};

test("accepts an authenticated Live Review asynchronously and exposes its final status", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read", "reviews:cancel"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => successfulReview()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: {
        authorization: "Bearer service-token",
        "content-type": "application/json"
      },
      body: JSON.stringify(createBody)
    });
    assert.equal(created.status, 202);
    const accepted = await created.json() as {
      reviewId: string;
      status: string;
      statusUrl: string;
      resultUrl: string;
      artifactsUrl: string;
    };
    assert.match(accepted.reviewId, /^rev_/);
    assert.equal(accepted.status, "queued");
    assert.equal(created.headers.get("location"), accepted.statusUrl);

    let status: Record<string, unknown> = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      assert.equal(response.status, 200);
      status = await response.json() as Record<string, unknown>;
      if (status.status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "succeeded");
    assert.equal(status.verdict, "passed");
    assert.equal(status.schemaVersion, "1.0");
  });
});

test("returns stable authentication and authorization errors with a request id", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "create-only": { tenantId: "tenant-a", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => successfulReview()
  });

  await withServer(app, async (baseUrl) => {
    const unauthenticated = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "req-caller-1" },
      body: JSON.stringify(createBody)
    });
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.headers.get("x-request-id"), "req-caller-1");
    const unauthorizedBody = await unauthenticated.json() as { error: Record<string, unknown> };
    assert.deepEqual(unauthorizedBody.error, {
      code: "UNAUTHORIZED",
      message: "Valid service authentication is required.",
      retryable: false,
      requestId: "req-caller-1"
    });

    const forbidden = await fetch(`${baseUrl}/v1/reviews/rev_missing`, {
      headers: { authorization: "Bearer create-only" }
    });
    assert.equal(forbidden.status, 403);
    const forbiddenBody = await forbidden.json() as { error: { code: string; retryable: boolean; requestId: string } };
    assert.equal(forbiddenBody.error.code, "FORBIDDEN");
    assert.equal(forbiddenBody.error.retryable, false);
    assert.match(forbiddenBody.error.requestId, /^req_/);
  });
});

test("rejects an allowed hostname when DNS resolves to a private address", async () => {
  let executions = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["127.0.0.1"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => {
      executions += 1;
      return successfulReview();
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    assert.equal(response.status, 403);
    const body = await response.json() as { error: { code: string; retryable: boolean } };
    assert.equal(body.error.code, "H5_ACCESS_DENIED");
    assert.equal(body.error.retryable, false);
    assert.equal(executions, 0);
  });
});

test("revalidates DNS during capture and blocks a changed resolution", async () => {
  let lookups = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => [lookups++ === 0 ? "93.184.216.34" : "1.1.1.1"],
    resolveCredential: async () => "figma-token",
    executeReview: async (input) => {
      const actual = input.pagePairs[0].actual;
      assert.equal(actual.kind, "live");
      await actual.validateNavigationUrl?.(actual.url);
      return successfulReview();
    }
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string };
    let status: { status?: string; error?: { code: string } } = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      status = await response.json() as typeof status;
      if (status.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "failed");
    assert.equal(status.error?.code, "H5_ACCESS_DENIED");
  });
});

test("blocks a redirect target outside the project allowlist", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async (input) => {
      const actual = input.pagePairs[0].actual;
      assert.equal(actual.kind, "live");
      await actual.validateNavigationUrl?.("https://internal.example/redirected");
      return successfulReview();
    }
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string };
    let status: { status?: string; error?: { code: string } } = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      status = await response.json() as typeof status;
      if (status.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "failed");
    assert.equal(status.error?.code, "H5_ACCESS_DENIED");
  });
});

test("returns compact structured results and a protected Excel download reference", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => successfulReview()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as {
      statusUrl: string;
      resultUrl: string;
      artifactsUrl: string;
    };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      const status = await response.json() as { status: string };
      if (status.status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const resultResponse = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(resultResponse.status, 200);
    const resultText = await resultResponse.text();
    assert.doesNotMatch(resultText, /data:image|base64|buffer/i);
    const result = JSON.parse(resultText) as {
      schemaVersion: string;
      status: string;
      verdict: string;
      pageResults: Array<Record<string, unknown>>;
      artifactIds: string[];
    };
    assert.equal(result.schemaVersion, "1.0");
    assert.equal(result.status, "succeeded");
    assert.equal(result.verdict, "passed");
    assert.deepEqual(result.artifactIds, ["art_excel"]);
    assert.deepEqual(result.pageResults, [{
      clientPageId: "market-home",
      pageName: "行情首页",
      status: "succeeded",
      verdict: "passed"
    }]);

    const artifactsResponse = await fetch(`${baseUrl}${accepted.artifactsUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(artifactsResponse.status, 200);
    const artifacts = await artifactsResponse.json() as {
      artifacts: Array<{ artifactId: string; downloadUrl: string; filename: string; sizeBytes: number }>;
    };
    assert.equal(artifacts.artifacts[0].artifactId, "art_excel");
    assert.equal(artifacts.artifacts[0].filename, "行情首页UI走查结果.xlsx");
    assert.equal(artifacts.artifacts[0].sizeBytes, 4);

    const unauthenticatedDownload = await fetch(
      `${baseUrl}/v1/reviews/${accepted.statusUrl.split("/").at(-1)}/artifacts/art_excel`
    );
    assert.equal(unauthenticatedDownload.status, 401);
    const download = await fetch(`${baseUrl}${artifacts.artifacts[0].downloadUrl}`);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    assert.equal(Buffer.from(await download.arrayBuffer()).toString(), "xlsx");
  });
});

test("exposes AI advice rejection metadata in the public structured result", async () => {
  const completed = successfulReview();
  completed.pages[0].report = {
    evidenceMode: "live",
    diagnostics: ["AI 建议未发布：证据引用无法解析：review-issue:missing。"],
    summary: {
      stableSimilarity: 1,
      dynamicRegionAreaRatio: 0,
      matchedElements: 0,
      unmatchedDesignElements: 0,
      unmatchedActualElements: 0
    },
    matching: {
      matches: [],
      unmatchedDesignCount: 0,
      unmatchedActualCount: 0,
      pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
      diagnostics: []
    },
    issues: [],
    aiAdviceRejection: {
      code: "evidence_integrity_failed",
      message: "AI 建议未发布：证据引用无法解析：review-issue:missing。",
      danglingRefs: ["review-issue:missing"],
      locations: [{
        scope: "priority",
        priorityNumber: 2,
        reason: "unresolved",
        refs: ["review-issue:missing"]
      }]
    }
  } as unknown as CompareReport;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => completed
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string; resultUrl: string };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      if ((await response.json() as { status: string }).status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const response = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(response.status, 200);
    const result = await response.json() as {
      pageResults: Array<{ aiAdviceRejection?: unknown }>;
    };
    assert.deepEqual(result.pageResults[0].aiAdviceRejection, {
      code: "evidence_integrity_failed",
      message: "AI 建议未发布：证据引用无法解析：review-issue:missing。",
      danglingRefs: ["review-issue:missing"],
      locations: [{
        scope: "priority",
        priorityNumber: 2,
        reason: "unresolved",
        refs: ["review-issue:missing"]
      }]
    });
  });
});

test("exports AI advice rejection counters by stable code for the authenticated tenant", async () => {
  const outcomes = ["ai_timeout", "evidence_integrity_failed"] as const;
  let execution = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "monitor-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read", "metrics:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => {
      const completed = successfulReview();
      const code = outcomes[execution++];
      completed.pages[0].report = {
        evidenceMode: "live",
        diagnostics: [],
        summary: {
          stableSimilarity: 1,
          dynamicRegionAreaRatio: 0,
          matchedElements: 0,
          unmatchedDesignElements: 0,
          unmatchedActualElements: 0
        },
        matching: {
          matches: [],
          unmatchedDesignCount: 0,
          unmatchedActualCount: 0,
          pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
          diagnostics: []
        },
        issues: [],
        aiAdviceRejection: {
          code,
          message: code,
          danglingRefs: code === "evidence_integrity_failed" ? ["review-issue:missing"] : [],
          locations: []
        }
      } as unknown as CompareReport;
      return completed;
    }
  });

  await withServer(app, async (baseUrl) => {
    for (let index = 0; index < outcomes.length; index += 1) {
      const created = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: "Bearer monitor-token", "content-type": "application/json" },
        body: JSON.stringify(createBody)
      });
      const accepted = await created.json() as { statusUrl: string };
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
          headers: { authorization: "Bearer monitor-token" }
        });
        if ((await status.json() as { status: string }).status === "succeeded") break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    const response = await fetch(`${baseUrl}/v1/metrics`, {
      headers: { authorization: "Bearer monitor-token" }
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/plain/);
    const metrics = await response.text();
    assert.match(metrics, /^ai_advice_attempts_total 2$/m);
    assert.match(metrics, /^ai_advice_rejections_total\{code="ai_timeout"\} 1$/m);
    assert.match(metrics, /^ai_advice_rejections_total\{code="ai_format_error"\} 0$/m);
    assert.match(metrics, /^ai_advice_rejections_total\{code="ai_generation_failed"\} 0$/m);
    assert.match(metrics, /^ai_advice_rejections_total\{code="evidence_integrity_failed"\} 1$/m);
    assert.match(metrics, /^ai_advice_evidence_dangling_attempts_total 1$/m);
  });
});

test("exports AI timeout and dangling-evidence ratios over completed advice attempts", async () => {
  const outcomes = ["success", "ai_timeout", "dangling", "missing"] as const;
  let execution = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "monitor-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read", "metrics:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: async () => {
      const completed = successfulReview();
      const outcome = outcomes[execution++];
      const aiOutcome = outcome === "success"
        ? {
            aiAdvice: {
              summary: "已验证建议",
              summaryEvidenceRefs: ["review-issue:issue-1" as const],
              priorities: []
            }
          }
        : {
            aiAdviceRejection: {
              code: outcome === "ai_timeout" ? "ai_timeout" as const : "evidence_integrity_failed" as const,
              message: outcome,
              danglingRefs: outcome === "dangling" ? ["review-issue:missing" as const] : [],
              locations: []
            }
          };
      completed.pages[0].report = {
        evidenceMode: "live",
        diagnostics: [],
        summary: {
          stableSimilarity: 1,
          dynamicRegionAreaRatio: 0,
          matchedElements: 0,
          unmatchedDesignElements: 0,
          unmatchedActualElements: 0
        },
        matching: {
          matches: [],
          unmatchedDesignCount: 0,
          unmatchedActualCount: 0,
          pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
          diagnostics: []
        },
        issues: [],
        ...aiOutcome
      } as unknown as CompareReport;
      return completed;
    }
  });

  await withServer(app, async (baseUrl) => {
    for (let index = 0; index < outcomes.length; index += 1) {
      const created = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: "Bearer monitor-token", "content-type": "application/json" },
        body: JSON.stringify(createBody)
      });
      const accepted = await created.json() as { statusUrl: string };
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
          headers: { authorization: "Bearer monitor-token" }
        });
        if ((await status.json() as { status: string }).status === "succeeded") break;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    const response = await fetch(`${baseUrl}/v1/metrics`, {
      headers: { authorization: "Bearer monitor-token" }
    });
    assert.equal(response.status, 200);
    const metrics = await response.text();
    assert.match(metrics, /^ai_advice_attempts_total 4$/m);
    assert.match(metrics, /^ai_advice_timeout_ratio 0\.25$/m);
    assert.match(metrics, /^ai_advice_evidence_dangling_ratio 0\.25$/m);
  });
});

test("exports distinct five and fifteen minute AI advice window counts", async () => {
  const outcomes = ["ai_timeout", "success"] as const;
  let execution = 0;
  let currentTime = Date.parse("2026-09-11T00:00:00.000Z");
  const app = createPublicApiApp({
    serviceTokens: {
      "monitor-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read", "metrics:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    now: () => new Date(currentTime),
    executeReview: async () => {
      const completed = successfulReview();
      const outcome = outcomes[execution++];
      completed.pages[0].report = {
        evidenceMode: "live",
        diagnostics: [],
        summary: {
          stableSimilarity: 1,
          dynamicRegionAreaRatio: 0,
          matchedElements: 0,
          unmatchedDesignElements: 0,
          unmatchedActualElements: 0
        },
        matching: {
          matches: [],
          unmatchedDesignCount: 0,
          unmatchedActualCount: 0,
          pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
          diagnostics: []
        },
        issues: [],
        ...(outcome === "success"
          ? {
              aiAdvice: {
                summary: "已验证建议",
                summaryEvidenceRefs: ["review-issue:issue-1"],
                priorities: []
              }
            }
          : {
              aiAdviceRejection: {
                code: "ai_timeout",
                message: "timeout",
                danglingRefs: [],
                locations: []
              }
            })
      } as unknown as CompareReport;
      return completed;
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = async () => {
      const created = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: "Bearer monitor-token", "content-type": "application/json" },
        body: JSON.stringify(createBody)
      });
      const accepted = await created.json() as { statusUrl: string };
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
          headers: { authorization: "Bearer monitor-token" }
        });
        if ((await status.json() as { status: string }).status === "succeeded") return;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };

    await submit();
    currentTime += 6 * 60 * 1000;
    await submit();

    const response = await fetch(`${baseUrl}/v1/metrics`, {
      headers: { authorization: "Bearer monitor-token" }
    });
    assert.equal(response.status, 200);
    const metrics = await response.text();
    assert.match(metrics, /^ai_advice_window_attempts\{window="5m"\} 1$/m);
    assert.match(metrics, /^ai_advice_window_attempts\{window="15m"\} 2$/m);
    assert.match(metrics, /^ai_advice_window_rejections\{window="5m",code="ai_timeout"\} 0$/m);
    assert.match(metrics, /^ai_advice_window_rejections\{window="15m",code="ai_timeout"\} 1$/m);
  });
});

test("evaluates low-cardinality AI alerts independently for each authenticated tenant", async () => {
  const outcomes = ["ai_timeout", "success", "ai_timeout"] as const;
  let execution = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "tenant-a-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read", "metrics:read"]
      },
      "tenant-b-token": {
        tenantId: "tenant-b",
        scopes: ["reviews:create", "reviews:read", "metrics:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    aiAdviceAlertMinAttempts: 2,
    aiAdviceTimeoutAlertRatio: 0.4,
    aiAdviceEvidenceDanglingAlertRatio: 0.4,
    executeReview: async () => {
      const completed = successfulReview();
      const outcome = outcomes[execution++];
      completed.pages[0].report = {
        evidenceMode: "live",
        diagnostics: [],
        summary: {
          stableSimilarity: 1,
          dynamicRegionAreaRatio: 0,
          matchedElements: 0,
          unmatchedDesignElements: 0,
          unmatchedActualElements: 0
        },
        matching: {
          matches: [],
          unmatchedDesignCount: 0,
          unmatchedActualCount: 0,
          pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
          diagnostics: []
        },
        issues: [],
        ...(outcome === "success"
          ? {
              aiAdvice: {
                summary: "已验证建议",
                summaryEvidenceRefs: ["review-issue:issue-1"],
                priorities: []
              }
            }
          : {
              aiAdviceRejection: {
                code: "ai_timeout",
                message: "timeout",
                danglingRefs: [],
                locations: []
              }
            })
      } as unknown as CompareReport;
      return completed;
    }
  });

  await withServer(app, async (baseUrl) => {
    const submit = async (token: string) => {
      const created = await fetch(`${baseUrl}/v1/reviews`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(createBody)
      });
      const accepted = await created.json() as { statusUrl: string };
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
          headers: { authorization: `Bearer ${token}` }
        });
        if ((await status.json() as { status: string }).status === "succeeded") return;
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    };
    await submit("tenant-a-token");
    await submit("tenant-a-token");
    await submit("tenant-b-token");

    const tenantA = await fetch(`${baseUrl}/v1/metrics`, {
      headers: { authorization: "Bearer tenant-a-token" }
    });
    const tenantAMetrics = await tenantA.text();
    assert.match(tenantAMetrics, /^ai_advice_attempts_total 2$/m);
    assert.match(tenantAMetrics, /^ai_advice_alert_evaluation_ready 1$/m);
    assert.match(tenantAMetrics, /^ai_advice_alert\{type="timeout_rate"\} 1$/m);
    assert.match(tenantAMetrics, /^ai_advice_alert\{type="evidence_dangling_rate"\} 0$/m);
    assert.doesNotMatch(tenantAMetrics, /tenant=/);

    const tenantB = await fetch(`${baseUrl}/v1/metrics`, {
      headers: { authorization: "Bearer tenant-b-token" }
    });
    const tenantBMetrics = await tenantB.text();
    assert.match(tenantBMetrics, /^ai_advice_attempts_total 1$/m);
    assert.match(tenantBMetrics, /^ai_advice_alert_evaluation_ready 0$/m);
    assert.match(tenantBMetrics, /^ai_advice_alert\{type="timeout_rate"\} 0$/m);
  });
});

test("cancels a queued or running Review without publishing a late result", async () => {
  let finish: ((result: BatchReviewResult) => void) | undefined;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read", "reviews:cancel"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    executeReview: () => new Promise((resolve) => { finish = resolve; })
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { reviewId: string; statusUrl: string };
    const cancelled = await fetch(`${baseUrl}/v1/reviews/${accepted.reviewId}/cancel`, {
      method: "POST",
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(cancelled.status, 200);
    assert.equal((await cancelled.json() as { status: string }).status, "cancelled");

    finish?.(successfulReview());
    await new Promise((resolve) => setTimeout(resolve, 5));
    const statusResponse = await fetch(`${baseUrl}${accepted.statusUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal((await statusResponse.json() as { status: string }).status, "cancelled");
  });
});

test("distinguishes execution failure from a completed UI acceptance failure", async () => {
  const token = {
    "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] as const }
  };
  const common = {
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token"
  };
  const executionFailureApp = createPublicApiApp({
    ...common,
    serviceTokens: token as never,
    executeReview: async () => { throw new Error("browser worker unavailable"); }
  });
  const acceptanceFailure = successfulReview();
  acceptanceFailure.verdict = "failed";
  acceptanceFailure.summary.passedPages = 0;
  acceptanceFailure.summary.failedPages = 1;
  acceptanceFailure.pages[0].verdict = "failed";
  const acceptanceFailureApp = createPublicApiApp({
    ...common,
    serviceTokens: token as never,
    executeReview: async () => acceptanceFailure
  });

  await withServer(executionFailureApp, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string };
    let status: { status?: string; verdict?: string; error?: { code: string; retryable: boolean } } = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, { headers: { authorization: "Bearer service-token" } });
      status = await response.json() as typeof status;
      if (status.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "failed");
    assert.equal(status.verdict, undefined);
    assert.deepEqual(
      { code: status.error?.code, retryable: status.error?.retryable },
      { code: "INTERNAL_ERROR", retryable: true }
    );
  });

  await withServer(acceptanceFailureApp, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string };
    let status: { status?: string; verdict?: string } = {};
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, { headers: { authorization: "Bearer service-token" } });
      status = await response.json() as typeof status;
      if (status.status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "succeeded");
    assert.equal(status.verdict, "failed");
  });
});
