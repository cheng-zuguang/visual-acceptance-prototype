import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
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

function successfulReview(): BatchReviewResult {
  return {
    reviewName: "行情首页",
    executionStatus: "succeeded",
    verdict: "needs_review",
    summary: {
      totalPages: 1,
      completedPages: 1,
      executionFailedPages: 0,
      passedPages: 0,
      failedPages: 0,
      needsReviewPages: 1,
      issues: { p0: 0, p1: 0, p2: 0, pending: 1 }
    },
    pages: [{
      clientPageId: "market-home",
      pageName: "行情首页",
      executionStatus: "succeeded",
      verdict: "needs_review"
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
  pagePairs: [{
    clientPageId: "market-home",
    pageName: "行情首页",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
      credentialRef: "cred_figma"
    },
    actual: { kind: "live", url: "https://h5.example.com/market" }
  }],
  callback: {
    url: "https://hooks.example.com/difflab",
    events: ["review.completed"],
    secretRef: "cred_webhook"
  }
};

test("delivers a signed completed event and records the successful attempt", async () => {
  const deliveries: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    webhookAllowedHosts: ["hooks.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveWebhookSecret: async (tenantId, secretRef) => {
      assert.equal(tenantId, "tenant-a");
      assert.equal(secretRef, "cred_webhook");
      return "webhook-secret";
    },
    sendWebhook: async (delivery) => {
      deliveries.push(delivery);
      return { status: 204 };
    },
    now: () => new Date("2026-09-08T00:00:00.000Z"),
    executeReview: async () => successfulReview()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    assert.equal(created.status, 202);
    const accepted = await created.json() as { reviewId: string; statusUrl: string; resultUrl: string };
    let status: {
      status?: string;
      webhook?: { status: string; eventId: string; attempts: number };
    } = {};
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      status = await response.json() as typeof status;
      if (status.webhook?.status === "delivered") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "succeeded");
    assert.equal(status.webhook?.attempts, 1);
    assert.match(status.webhook?.eventId ?? "", /^evt_/);
    assert.equal(deliveries.length, 1);

    const delivery = deliveries[0];
    const timestamp = delivery.headers["x-difflab-timestamp"];
    const expectedSignature = createHmac("sha256", "webhook-secret")
      .update(`${timestamp}.${delivery.body}`)
      .digest("hex");
    assert.equal(delivery.url, "https://hooks.example.com/difflab");
    assert.equal(delivery.headers["x-difflab-event-id"], status.webhook?.eventId);
    assert.equal(delivery.headers["x-difflab-signature"], `v1=${expectedSignature}`);
    assert.deepEqual(JSON.parse(delivery.body), {
      eventId: status.webhook?.eventId,
      eventType: "review.completed",
      occurredAt: "2026-09-08T00:00:00.000Z",
      reviewId: accepted.reviewId,
      status: "succeeded",
      verdict: "needs_review",
      resultUrl: accepted.resultUrl
    });
    assert.doesNotMatch(JSON.stringify(status), /webhook-secret|cred_webhook/);
  });
});

test("retries with bounded exponential backoff while keeping one event identity", async () => {
  const eventIds: string[] = [];
  const bodies: string[] = [];
  const delays: number[] = [];
  const statuses = [500, 503, 204];
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    webhookAllowedHosts: ["hooks.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveWebhookSecret: async () => "webhook-secret",
    webhookMaxAttempts: 4,
    webhookInitialDelayMs: 10,
    sleep: async (delayMs) => { delays.push(delayMs); },
    sendWebhook: async (delivery) => {
      eventIds.push(delivery.headers["x-difflab-event-id"]);
      bodies.push(delivery.body);
      return { status: statuses[eventIds.length - 1] };
    },
    executeReview: async () => successfulReview()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string };
    let status: {
      status?: string;
      webhook?: {
        status: string;
        attempts: number;
        attemptLog: Array<{ attempt: number; status?: number; error?: string }>;
      };
    } = {};
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      status = await response.json() as typeof status;
      if (status.webhook?.status === "delivered") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "succeeded");
    assert.equal(status.webhook?.attempts, 3);
    assert.deepEqual(status.webhook?.attemptLog, [
      { attempt: 1, status: 500 },
      { attempt: 2, status: 503 },
      { attempt: 3, status: 204 }
    ]);
    assert.deepEqual(delays, [10, 20]);
    assert.equal(new Set(eventIds).size, 1);
    assert.equal(new Set(bodies).size, 1);
  });
});

test("keeps the completed Review intact when webhook delivery permanently fails", async () => {
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    webhookAllowedHosts: ["hooks.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveWebhookSecret: async () => "webhook-secret",
    webhookMaxAttempts: 3,
    webhookInitialDelayMs: 0,
    sleep: async () => {},
    sendWebhook: async () => ({ status: 500 }),
    executeReview: async () => successfulReview()
  });

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(createBody)
    });
    const accepted = await created.json() as { statusUrl: string; resultUrl: string };
    let status: {
      status?: string;
      verdict?: string;
      webhook?: { status: string; attempts: number; lastStatus?: number };
    } = {};
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      status = await response.json() as typeof status;
      if (status.webhook?.status === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.equal(status.status, "succeeded");
    assert.equal(status.verdict, "needs_review");
    assert.deepEqual(status.webhook && {
      status: status.webhook.status,
      attempts: status.webhook.attempts,
      lastStatus: status.webhook.lastStatus
    }, { status: "failed", attempts: 3, lastStatus: 500 });
    const result = await fetch(`${baseUrl}${accepted.resultUrl}`, {
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(result.status, 200);
    assert.equal((await result.json() as { verdict: string }).verdict, "needs_review");
  });
});

test("delivers review.failed when Review execution fails", async () => {
  let event: Record<string, unknown> | undefined;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": { tenantId: "tenant-a", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.example.com"],
    webhookAllowedHosts: ["hooks.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveWebhookSecret: async () => "webhook-secret",
    sendWebhook: async (delivery) => {
      event = JSON.parse(delivery.body) as Record<string, unknown>;
      return { status: 204 };
    },
    executeReview: async () => { throw new Error("worker unavailable"); }
  });
  const body = {
    ...createBody,
    callback: { ...createBody.callback, events: ["review.failed"] }
  };

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const accepted = await created.json() as { reviewId: string; statusUrl: string; resultUrl: string };
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      const status = await response.json() as { webhook?: { status: string } };
      if (status.webhook?.status === "delivered") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.deepEqual(event && {
      eventType: event.eventType,
      reviewId: event.reviewId,
      status: event.status,
      verdict: event.verdict,
      resultUrl: event.resultUrl
    }, {
      eventType: "review.failed",
      reviewId: accepted.reviewId,
      status: "failed",
      verdict: undefined,
      resultUrl: accepted.resultUrl
    });
  });
});

test("delivers review.cancelled after an accepted cancellation", async () => {
  let event: Record<string, unknown> | undefined;
  const app = createPublicApiApp({
    serviceTokens: {
      "service-token": {
        tenantId: "tenant-a",
        scopes: ["reviews:create", "reviews:read", "reviews:cancel"]
      }
    },
    allowedHosts: ["h5.example.com"],
    webhookAllowedHosts: ["hooks.example.com"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    resolveWebhookSecret: async () => "webhook-secret",
    sendWebhook: async (delivery) => {
      event = JSON.parse(delivery.body) as Record<string, unknown>;
      return { status: 204 };
    },
    executeReview: async () => new Promise<BatchReviewResult>(() => {})
  });
  const body = {
    ...createBody,
    callback: { ...createBody.callback, events: ["review.cancelled"] }
  };

  await withServer(app, async (baseUrl) => {
    const created = await fetch(`${baseUrl}/v1/reviews`, {
      method: "POST",
      headers: { authorization: "Bearer service-token", "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const accepted = await created.json() as { reviewId: string; statusUrl: string; resultUrl: string };
    const cancelled = await fetch(`${baseUrl}/v1/reviews/${accepted.reviewId}/cancel`, {
      method: "POST",
      headers: { authorization: "Bearer service-token" }
    });
    assert.equal(cancelled.status, 200);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await fetch(`${baseUrl}${accepted.statusUrl}`, {
        headers: { authorization: "Bearer service-token" }
      });
      const status = await response.json() as { webhook?: { status: string } };
      if (status.webhook?.status === "delivered") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    assert.deepEqual(event && {
      eventType: event.eventType,
      reviewId: event.reviewId,
      status: event.status,
      verdict: event.verdict,
      resultUrl: event.resultUrl
    }, {
      eventType: "review.cancelled",
      reviewId: accepted.reviewId,
      status: "cancelled",
      verdict: undefined,
      resultUrl: accepted.resultUrl
    });
  });
});
