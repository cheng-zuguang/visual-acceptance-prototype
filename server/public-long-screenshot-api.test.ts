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

function batchResult(): BatchReviewResult {
  return {
    reviewName: "长行情页",
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
    pages: [],
    excel: {
      kind: "excel",
      filename: "长行情页UI走查结果.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("xlsx")
    }
  };
}

test("submits one uploaded asset as a Long Screenshot PagePair", async () => {
  const image = await sharp({
    create: { width: 100, height: 240, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  let observedKind = "";
  let observedImage: Buffer | undefined;
  let observedCrop: { x: number; y: number; width: number; height: number } | undefined;
  let observedAnchorRole: string | undefined;
  const app = createPublicApiApp({
    serviceTokens: {
      token: { tenantId: "tenant-a", scopes: ["assets:write", "reviews:create", "reviews:read"] }
    },
    allowedHosts: [],
    lookupHost: async () => [],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-secret",
    executeReview: async (input) => {
      const actual = input.pagePairs[0].actual;
      observedKind = actual.kind;
      if (actual.kind === "long_screenshot") {
        observedImage = actual.screenshot.image;
        observedCrop = actual.screenshot.crop;
        observedAnchorRole = actual.screenshot.anchors?.[0]?.role;
      }
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const declared = await fetch(`${baseUrl}/v1/assets`, {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        kind: "actual-screenshot",
        filename: "market-long.png",
        contentType: "image/png",
        sizeBytes: image.byteLength,
        sha256: createHash("sha256").update(image).digest("hex")
      })
    });
    const asset = await declared.json() as { assetId: string; uploadUrl: string };
    await fetch(`${baseUrl}${asset.uploadUrl}`, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(image)
    });

    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "长行情页",
        pagePairs: [{
          clientPageId: "market-long",
          pageName: "长行情页",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/long?node-id=1-2",
            credentialRef: "figma-credential"
          },
          actual: {
            kind: "long_screenshot",
            screenshotAssetIds: [asset.assetId],
            device: {
              platform: "iOS",
              dpr: 1,
              orientation: "portrait",
              viewport: { width: 100, height: 100 }
            },
            crop: { x: 0, y: 0, width: 100, height: 240 },
            anchors: [{
              text: "行情",
              role: "navigation",
              confidence: 0.98,
              box: { x: 0, y: 0, width: 100, height: 20 }
            }]
          }
        }]
      })
    });

    assert.equal(created.status, 202);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(observedKind, "long_screenshot");
    assert.deepEqual(observedImage, image);
    assert.deepEqual(observedCrop, { x: 0, y: 0, width: 100, height: 240 });
    assert.equal(observedAnchorRole, "navigation");
  });
});

test("submits an uploaded long screenshot with authorized H5 evidence", async () => {
  const image = await sharp({
    create: { width: 100, height: 240, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  let observedUrl: string | undefined;
  let observedAuthorization: string | undefined;
  let resolveExecutedReview: (() => void) | undefined;
  const executedReview = new Promise<void>((resolve) => { resolveExecutedReview = resolve; });
  const app = createPublicApiApp({
    serviceTokens: {
      token: { tenantId: "tenant-a", scopes: ["assets:write", "reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveBrowserCredential: async (tenantId, credentialRef) => {
      assert.equal(tenantId, "tenant-a");
      assert.equal(credentialRef, "browser-credential");
      return { extraHTTPHeaders: { authorization: "Bearer h5-session" } };
    },
    signingSecret: "test-secret",
    executeReview: async (input) => {
      const actual = input.pagePairs[0].actual;
      assert.equal(actual.kind, "long_screenshot");
      if (actual.kind === "long_screenshot") {
        observedUrl = actual.url;
        observedAuthorization = actual.browserCredential?.extraHTTPHeaders?.authorization;
      }
      resolveExecutedReview?.();
      return batchResult();
    }
  });

  await withServer(app, async (baseUrl) => {
    const declared = await fetch(`${baseUrl}/v1/assets`, {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        kind: "actual-screenshot",
        filename: "market-long.png",
        contentType: "image/png",
        sizeBytes: image.byteLength,
        sha256: createHash("sha256").update(image).digest("hex")
      })
    });
    const asset = await declared.json() as { assetId: string; uploadUrl: string };
    await fetch(`${baseUrl}${asset.uploadUrl}`, {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: new Uint8Array(image)
    });

    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer token", "content-type": "application/json" },
      body: JSON.stringify({
        name: "长行情页 Hybrid",
        pagePairs: [{
          clientPageId: "market-long-hybrid",
          pageName: "长行情页 Hybrid",
          design: {
            kind: "figma",
            frameUrl: "https://www.figma.com/design/FILE_KEY/long?node-id=1-2",
            credentialRef: "figma-credential"
          },
          actual: {
            kind: "long_screenshot",
            url: "https://h5.test/market",
            browserCredentialRef: "browser-credential",
            screenshotAssetIds: [asset.assetId],
            device: {
              platform: "iOS",
              dpr: 1,
              orientation: "portrait",
              viewport: { width: 100, height: 100 }
            }
          }
        }]
      })
    });

    assert.equal(created.status, 202);
    await executedReview;
    assert.equal(observedUrl, "https://h5.test/market");
    assert.equal(observedAuthorization, "Bearer h5-session");
  });
});
