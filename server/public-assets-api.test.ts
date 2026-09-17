import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";
import type { Express } from "express";
import sharp from "sharp";
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

function reviewResult(evidenceMode: "screenshot" | "hybrid" = "screenshot"): BatchReviewResult {
  return {
    reviewName: "行情截图",
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
      clientPageId: "market-shot",
      pageName: "行情截图",
      executionStatus: "succeeded",
      verdict: "passed",
      report: {
        id: "report-shot",
        createdAt: "2026-09-08T00:00:00.000Z",
        durationMs: 12,
        status: "passed",
        evidenceMode,
        summary: {
          errors: 0,
          warnings: 0,
          pending: 0,
          similarity: 1,
          stableSimilarity: 1,
          dynamicRegionAreaRatio: 0,
          matchedElements: 0,
          unmatchedDesignElements: 0,
          unmatchedActualElements: 0
        },
        dynamicNormalization: {
          stableSimilarity: 1,
          dynamicRegionAreaRatio: 0,
          strategies: [],
          regions: [],
          agentHypotheses: []
        },
        marketVariants: { catalog: [], matches: [], unresolved: [] },
        marketLists: { matches: [], unresolved: [] },
        matching: {
          matches: [],
          unmatchedDesignCount: 0,
          unmatchedActualCount: 0,
          pageAlignment: { summary: "", regions: [], rejectedRegionCount: 0 },
          diagnostics: []
        },
        viewport: { width: 40, height: 80 },
        source: { design: "Figma", actual: "Screenshot" },
        images: { reference: "data:image/png;base64,", actual: "data:image/png;base64,", diff: "data:image/png;base64," },
        issues: [],
        rules: {} as never,
        diagnostics: [],
        markdown: "",
        reportHtml: ""
      }
    }],
    excel: {
      kind: "excel",
      filename: "行情截图UI走查结果.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("xlsx")
    }
  };
}

async function uploadScreenshot(baseUrl: string, token: string, png: Buffer): Promise<string> {
  const created = await fetch(`${baseUrl}/v1/assets`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      kind: "actual-screenshot",
      filename: "market.png",
      contentType: "image/png",
      sizeBytes: png.byteLength,
      sha256: createHash("sha256").update(png).digest("hex")
    })
  });
  assert.equal(created.status, 201);
  const asset = await created.json() as { assetId: string; uploadUrl: string };
  const uploaded = await fetch(`${baseUrl}${asset.uploadUrl}`, {
    method: "PUT",
    headers: { "content-type": "image/png" },
    body: new Uint8Array(png)
  });
  assert.equal(uploaded.status, 200);
  return asset.assetId;
}

test("uploads a validated screenshot asset and reviews it through Screenshot ActualEvidence", async () => {
  const png = await sharp({
    create: { width: 40, height: 80, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  const sha256 = createHash("sha256").update(png).digest("hex");
  let observedImage: Buffer | undefined;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": {
        tenantId: "tenant-a",
        scopes: ["assets:write", "reviews:create", "reviews:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async (input) => {
      const actual = input.pagePairs[0].actual;
      assert.equal(actual.kind, "screenshot");
      if (actual.kind === "screenshot") observedImage = actual.screenshots[0].image;
      return reviewResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const assetResponse = await fetch(`${baseUrl}/v1/assets`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        kind: "actual-screenshot",
        filename: "market.png",
        contentType: "image/png",
        sizeBytes: png.byteLength,
        sha256
      })
    });
    assert.equal(assetResponse.status, 201);
    const asset = await assetResponse.json() as { assetId: string; uploadUrl: string; status: string };
    assert.equal(asset.status, "awaiting_upload");

    const uploaded = await fetch(`${baseUrl}${asset.uploadUrl}`, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(png)
    });
    assert.equal(uploaded.status, 200);
    assert.equal((await uploaded.json() as { status: string }).status, "ready");

    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "行情截图",
        pagePairs: [{
          clientPageId: "market-shot",
          pageName: "行情截图",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
            credentialRef: "cred_figma"
          },
          actual: {
            kind: "screenshot",
            screenshotAssetIds: [asset.assetId],
            device: {
              platform: "iOS",
              dpr: 1,
              orientation: "portrait",
              viewport: { width: 40, height: 80 }
            }
          }
        }]
      })
    });
    assert.equal(created.status, 202);
    const accepted = await created.json() as { statusUrl: string; resultUrl: string };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      if ((await status.json() as { status: string }).status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const result = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(result.status, 200);
    const body = await result.json() as { pageResults: Array<{ evidenceMode: string }> };
    assert.equal(body.pageResults[0].evidenceMode, "screenshot");
    assert.deepEqual(observedImage, png);
  });
});

test("rejects a corrupt screenshot and exposes only safe asset status metadata", async () => {
  const corrupt = Buffer.from("not-an-image");
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["assets:write"] }
    },
    allowedHosts: [],
    lookupHost: async () => [],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async () => reviewResult()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/assets`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        kind: "actual-screenshot",
        filename: "broken.png",
        contentType: "image/png",
        sizeBytes: corrupt.byteLength,
        sha256: createHash("sha256").update(corrupt).digest("hex")
      })
    });
    const asset = await created.json() as { assetId: string; uploadUrl: string };
    const uploaded = await fetch(`${baseUrl}${asset.uploadUrl}`, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(corrupt)
    });
    assert.equal(uploaded.status, 422);
    assert.equal((await uploaded.json() as { error: { code: string } }).error.code, "UNSUPPORTED_ASSET");

    const status = await fetch(`${baseUrl}/v1/assets/${asset.assetId}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(status.status, 200);
    const body = await status.json() as Record<string, unknown>;
    assert.equal(body.status, "rejected");
    assert.equal(body.errorCode, "UNSUPPORTED_ASSET");
    assert.equal("image" in body, false);
    assert.equal("sha256" in body, false);
  });
});

test("records Hybrid as the requested mode and a stable reason when it degrades to Screenshot", async () => {
  const png = await sharp({
    create: { width: 40, height: 80, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  const degraded = reviewResult("screenshot");
  degraded.pages[0].report!.diagnostics = ["Hybrid 锚点对齐不足，已安全降级为 Screenshot 模式。"];
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": {
        tenantId: "tenant-a",
        scopes: ["assets:write", "reviews:create", "reviews:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async (input) => {
      assert.equal(input.pagePairs[0].actual.kind, "hybrid");
      return degraded;
    }
  });

  await withServer(app, async (baseUrl) => {
    const assetId = await uploadScreenshot(baseUrl, "service-token", png);
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "Hybrid 行情",
        pagePairs: [{
          clientPageId: "market-shot",
          pageName: "行情截图",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
            credentialRef: "cred_figma"
          },
          actual: {
            kind: "hybrid",
            url: "https://h5.example.com/market",
            screenshotAssetIds: [assetId],
            device: {
              platform: "iOS",
              dpr: 1,
              orientation: "portrait",
              viewport: { width: 40, height: 80 }
            }
          }
        }]
      })
    });
    const accepted = await created.json() as { statusUrl: string; resultUrl: string };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      if ((await status.json() as { status: string }).status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const response = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    const result = await response.json() as {
      pageResults: Array<{
        requestedEvidenceMode: string;
        evidenceMode: string;
        degradation?: { code: string; message: string };
      }>;
    };
    assert.equal(result.pageResults[0].requestedEvidenceMode, "hybrid");
    assert.equal(result.pageResults[0].evidenceMode, "screenshot");
    assert.deepEqual(result.pageResults[0].degradation, {
      code: "HYBRID_ALIGNMENT_INSUFFICIENT",
      message: "Hybrid 锚点对齐不足，已安全降级为 Screenshot 模式。"
    });
  });
});

test("isolates screenshot assets by tenant and expires signed upload URLs", async () => {
  const png = await sharp({
    create: { width: 40, height: 80, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  let clock = Date.parse("2026-09-08T00:00:00.000Z");
  const app = createPublicApiApp({
    serviceTokens: {
      "tenant-a-token": {
        tenantId: "tenant-a",
        scopes: ["assets:write", "reviews:create"]
      },
      "tenant-b-token": {
        tenantId: "tenant-b",
        scopes: ["assets:write", "reviews:create"]
      }
    },
    allowedHosts: [],
    lookupHost: async () => [],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    assetUploadTtlMs: 1_000,
    now: () => new Date(clock),
    executeReview: async () => reviewResult()
  });

  await withServer(app, async (baseUrl) => {
    const assetId = await uploadScreenshot(baseUrl, "tenant-a-token", png);
    const forbiddenReview = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer tenant-b-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "越权截图",
        pagePairs: [{
          clientPageId: "market-shot",
          pageName: "行情截图",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
            credentialRef: "cred_figma"
          },
          actual: {
            kind: "screenshot",
            screenshotAssetIds: [assetId],
            device: {
              platform: "iOS",
              dpr: 1,
              orientation: "portrait",
              viewport: { width: 40, height: 80 }
            }
          }
        }]
      })
    });
    assert.equal(forbiddenReview.status, 404);
    assert.equal((await forbiddenReview.json() as { error: { code: string } }).error.code, "RESOURCE_NOT_FOUND");

    const created = await fetch(`${baseUrl}/v1/assets`, {
      method: "POST",
      headers: { authorization: "Bearer tenant-a-token", "content-type": "application/json" },
      body: JSON.stringify({
        kind: "actual-screenshot",
        filename: "late.png",
        contentType: "image/png",
        sizeBytes: png.byteLength,
        sha256: createHash("sha256").update(png).digest("hex")
      })
    });
    const pending = await created.json() as { uploadUrl: string };
    clock += 1_001;
    const expired = await fetch(`${baseUrl}${pending.uploadUrl}`, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(png)
    });
    assert.equal(expired.status, 410);
    assert.equal((await expired.json() as { error: { code: string } }).error.code, "SIGNED_URL_EXPIRED");
  });
});

test("returns a stable Artifact id with a short-lived signed download URL", async () => {
  let clock = Date.parse("2026-09-08T00:00:00.000Z");
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read"]
      }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    artifactDownloadTtlMs: 1_000,
    now: () => new Date(clock),
    executeReview: async () => reviewResult()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "行情截图",
        pagePairs: [{
          clientPageId: "market-shot",
          pageName: "行情截图",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
            credentialRef: "cred_figma"
          },
          actual: { kind: "live", url: "https://h5.example.com/market" }
        }]
      })
    });
    const accepted = await created.json() as { statusUrl: string; artifactsUrl: string };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      if ((await status.json() as { status: string }).status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const listed = await fetch(`${baseUrl}${accepted.artifactsUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    const list = await listed.json() as {
      artifacts: Array<{ artifactId: string; downloadUrl: string; expiresAt: string }>;
    };
    assert.equal(list.artifacts[0].artifactId, "art_excel");
    assert.match(list.artifacts[0].downloadUrl, /expires=.*signature=/);
    assert.equal(list.artifacts[0].expiresAt, "2026-09-08T00:00:01.000Z");

    const downloaded = await fetch(`${baseUrl}${list.artifacts[0].downloadUrl}`);
    assert.equal(downloaded.status, 200);
    assert.equal(Buffer.from(await downloaded.arrayBuffer()).toString(), "xlsx");
    clock += 1_001;
    const expired = await fetch(`${baseUrl}${list.artifacts[0].downloadUrl}`);
    assert.equal(expired.status, 410);
    assert.equal((await expired.json() as { error: { code: string } }).error.code, "SIGNED_URL_EXPIRED");
  });
});

test("rejects a batch whose referenced screenshot bytes exceed its resource quota", async () => {
  const png = await sharp({
    create: { width: 40, height: 80, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  let executions = 0;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["assets:write", "reviews:create"] }
    },
    allowedHosts: [],
    lookupHost: async () => [],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    maxReviewAssetBytes: png.byteLength,
    executeReview: async () => {
      executions += 1;
      return reviewResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const assetId = await uploadScreenshot(baseUrl, "service-token", png);
    const response = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "截图资源超额",
        pagePairs: [{
          clientPageId: "market-shot",
          pageName: "行情截图",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
            credentialRef: "cred_figma"
          },
          actual: {
            kind: "screenshot",
            screenshotAssetIds: [assetId, assetId],
            device: {
              platform: "iOS",
              dpr: 1,
              orientation: "portrait",
              viewport: { width: 40, height: 80 }
            }
          }
        }]
      })
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "REVIEW_QUOTA_EXCEEDED");
    assert.equal(executions, 0);
  });
});

test("resolves browser authentication only from a secret reference and never returns it", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveBrowserCredential: async (tenantId, credentialRef) => {
      assert.equal(tenantId, "tenant-a");
      assert.equal(credentialRef, "cred_browser");
      return { extraHTTPHeaders: { authorization: "Bearer browser-secret" } };
    },
    executeReview: async (input) => {
      const actual = input.pagePairs[0].actual;
      assert.equal(actual.kind, "live");
      if (actual.kind === "live") {
        assert.equal(actual.browserCredential?.extraHTTPHeaders?.authorization, "Bearer browser-secret");
      }
      return reviewResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "登录态行情",
        pagePairs: [{
          clientPageId: "market-shot",
          pageName: "行情截图",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
            credentialRef: "cred_figma"
          },
          actual: {
            kind: "live",
            url: "https://h5.example.com/market",
            browserCredentialRef: "cred_browser"
          }
        }]
      })
    });
    assert.equal(created.status, 202);
    const accepted = await created.json() as { statusUrl: string; resultUrl: string };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      if ((await status.json() as { status: string }).status === "succeeded") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const result = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    const text = await result.text();
    assert.equal(result.status, 200);
    assert.doesNotMatch(text, /browser-secret|cred_browser|authorization/i);
  });
});
