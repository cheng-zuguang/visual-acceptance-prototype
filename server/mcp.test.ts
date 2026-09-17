import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import type { BatchReviewResult } from "../src/types";
import { createReviewMcpServer } from "./mcp";
import { createPublicApiApp } from "./public-api";
import type { ReviewPagePairsInput } from "./review";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function completedReview(): BatchReviewResult {
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
    pages: [],
    excel: {
      kind: "excel",
      filename: "行情首页UI走查结果.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("xlsx")
    }
  };
}

function reviewRequest(): Record<string, unknown> {
  return {
    name: "行情首页",
    pagePairs: [{
      clientPageId: "market-home",
      pageName: "行情首页",
      design: {
        kind: "figma",
        frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
        credentialRef: "figma-credential"
      },
      actual: { kind: "live", url: "https://h5.test/market" }
    }]
  };
}

test("MCP creates an asynchronous Review and returns its identifier before execution completes", async () => {
  const execution = deferred<BatchReviewResult>();
  const app = createPublicApiApp({
    serviceTokens: {
      "mcp-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async () => execution.promise
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const mcpServer = createReviewMcpServer({
    apiBaseUrl: `http://127.0.0.1:${port}`,
    serviceToken: "mcp-token"
  });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const result = await client.callTool({
      name: "review.create",
      arguments: {
        request: reviewRequest(),
        idempotencyKey: "mcp-create-1"
      }
    });

    const payload = result.structuredContent as { reviewId: string; status: string };
    assert.match(payload.reviewId, /^rev_/);
    assert.equal(payload.status, "queued");
    assert.equal(result.isError, undefined);
  } finally {
    execution.resolve(completedReview());
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("MCP returns the same Review status as the public HTTP API", async () => {
  const execution = deferred<BatchReviewResult>();
  const app = createPublicApiApp({
    serviceTokens: {
      "mcp-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async () => execution.promise
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const apiBaseUrl = `http://127.0.0.1:${port}`;
  const mcpServer = createReviewMcpServer({ apiBaseUrl, serviceToken: "mcp-token" });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const created = await client.callTool({
      name: "review.create",
      arguments: { request: reviewRequest(), idempotencyKey: "mcp-status-1" }
    });
    const reviewId = (created.structuredContent as { reviewId: string }).reviewId;
    const httpResponse = await fetch(`${apiBaseUrl}/v1/reviews/${reviewId}`, {
      headers: { authorization: "Bearer mcp-token" }
    });
    const expected = await httpResponse.json();

    const actual = await client.callTool({
      name: "review.get",
      arguments: { reviewId }
    });

    assert.equal(httpResponse.status, 200);
    assert.deepEqual(actual.structuredContent, expected);
    assert.equal(actual.isError, undefined);
  } finally {
    execution.resolve(completedReview());
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("MCP returns the same completed Review result as the public HTTP API", async () => {
  const execution = deferred<BatchReviewResult>();
  const app = createPublicApiApp({
    serviceTokens: {
      "mcp-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async () => execution.promise
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const apiBaseUrl = `http://127.0.0.1:${port}`;
  const mcpServer = createReviewMcpServer({ apiBaseUrl, serviceToken: "mcp-token" });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const created = await client.callTool({
      name: "review.create",
      arguments: { request: reviewRequest(), idempotencyKey: "mcp-result-1" }
    });
    const reviewId = (created.structuredContent as { reviewId: string }).reviewId;
    execution.resolve(completedReview());

    let httpResponse: Response;
    do {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      httpResponse = await fetch(`${apiBaseUrl}/v1/reviews/${reviewId}/result`, {
        headers: { authorization: "Bearer mcp-token" }
      });
    } while (httpResponse.status === 409);
    const expected = await httpResponse.json();

    const actual = await client.callTool({
      name: "review.get_result",
      arguments: { reviewId }
    });

    assert.equal(httpResponse.status, 200);
    assert.deepEqual(actual.structuredContent, expected);
    assert.equal(actual.isError, undefined);
  } finally {
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("MCP lists the same artifact metadata as HTTP without embedding file bytes", async () => {
  const execution = deferred<BatchReviewResult>();
  const app = createPublicApiApp({
    serviceTokens: {
      "mcp-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    now: () => new Date("2026-09-09T00:00:00.000Z"),
    executeReview: async () => execution.promise
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const apiBaseUrl = `http://127.0.0.1:${port}`;
  const mcpServer = createReviewMcpServer({ apiBaseUrl, serviceToken: "mcp-token" });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const created = await client.callTool({
      name: "review.create",
      arguments: { request: reviewRequest(), idempotencyKey: "mcp-artifacts-1" }
    });
    const reviewId = (created.structuredContent as { reviewId: string }).reviewId;
    execution.resolve(completedReview());

    let httpResponse: Response;
    do {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      httpResponse = await fetch(`${apiBaseUrl}/v1/reviews/${reviewId}/artifacts`, {
        headers: { authorization: "Bearer mcp-token" }
      });
    } while (httpResponse.status === 409);
    const expected = await httpResponse.json();

    const actual = await client.callTool({
      name: "review.list_artifacts",
      arguments: { reviewId }
    });

    assert.equal(httpResponse.status, 200);
    assert.deepEqual(actual.structuredContent, expected);
    assert.equal(actual.isError, undefined);
    assert.doesNotMatch(JSON.stringify(actual.structuredContent), /eHhzeA==|buffer|base64/i);
  } finally {
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("MCP preserves the public API permission error contract", async () => {
  const execution = deferred<BatchReviewResult>();
  const app = createPublicApiApp({
    serviceTokens: {
      "full-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] },
      "create-only-token": { tenantId: "tenant-mcp", scopes: ["reviews:create"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async () => execution.promise
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const apiBaseUrl = `http://127.0.0.1:${port}`;
  const createdResponse = await fetch(`${apiBaseUrl}/v1/reviews`, {
    method: "POST",
    headers: {
      authorization: "Bearer full-token",
      "content-type": "application/json",
      "idempotency-key": "mcp-permission-1"
    },
    body: JSON.stringify(reviewRequest())
  });
  const { reviewId } = await createdResponse.json() as { reviewId: string };
  const mcpServer = createReviewMcpServer({
    apiBaseUrl,
    serviceToken: "create-only-token"
  });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const result = await client.callTool({
      name: "review.get",
      arguments: { reviewId }
    });

    assert.equal(result.isError, true);
    assert.equal(
      (result.structuredContent as { error: { code: string } }).error.code,
      "FORBIDDEN"
    );
  } finally {
    execution.resolve(completedReview());
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("MCP applies local AI defaults when review.create omits AI parameters", async () => {
  const execution = deferred<BatchReviewResult>();
  const receivedInput = deferred<ReviewPagePairsInput>();
  const app = createPublicApiApp({
    serviceTokens: {
      "mcp-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async (input) => {
      receivedInput.resolve(input);
      return execution.promise;
    }
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const mcpServer = createReviewMcpServer({
    apiBaseUrl: `http://127.0.0.1:${port}`,
    serviceToken: "mcp-token",
    defaultAi: {
      requested: true,
      apiKey: "local-ai-key",
      apiUrl: "http://127.0.0.1:11434/v1",
      model: "local-vision-model"
    }
  });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const created = await client.callTool({
      name: "review.create",
      arguments: { request: reviewRequest(), idempotencyKey: "mcp-ai-defaults-1" }
    });
    const input = await receivedInput.promise;

    assert.deepEqual(input.ai, {
      requested: true,
      apiKey: "local-ai-key",
      apiUrl: "http://127.0.0.1:11434/v1",
      model: "local-vision-model"
    });
    assert.doesNotMatch(JSON.stringify(created.structuredContent), /local-ai-key/);
  } finally {
    execution.resolve(completedReview());
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});

test("review.create AI parameters override MCP local defaults field by field", async () => {
  const execution = deferred<BatchReviewResult>();
  const receivedInput = deferred<ReviewPagePairsInput>();
  const app = createPublicApiApp({
    serviceTokens: {
      "mcp-token": { tenantId: "tenant-mcp", scopes: ["reviews:create", "reviews:read"] }
    },
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: async (input) => {
      receivedInput.resolve(input);
      return execution.promise;
    }
  });
  const httpServer = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));
  const { port } = httpServer.address() as AddressInfo;
  const mcpServer = createReviewMcpServer({
    apiBaseUrl: `http://127.0.0.1:${port}`,
    serviceToken: "mcp-token",
    defaultAi: {
      requested: true,
      apiKey: "local-ai-key",
      apiUrl: "http://127.0.0.1:11434/v1",
      model: "local-model"
    }
  });
  const client = new Client({ name: "difflab-contract-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientTransport), mcpServer.connect(serverTransport)]);

  try {
    const created = await client.callTool({
      name: "review.create",
      arguments: {
        request: reviewRequest(),
        ai: { apiKey: "request-ai-key", model: "request-model" },
        idempotencyKey: "mcp-ai-override-1"
      }
    });
    const input = await receivedInput.promise;

    assert.deepEqual(input.ai, {
      requested: true,
      apiKey: "request-ai-key",
      apiUrl: "http://127.0.0.1:11434/v1",
      model: "request-model"
    });
    assert.doesNotMatch(JSON.stringify(created.structuredContent), /request-ai-key|local-ai-key/);
  } finally {
    execution.resolve(completedReview());
    await client.close();
    await mcpServer.close();
    await new Promise<void>((resolve, reject) =>
      httpServer.close((error) => error ? reject(error) : resolve())
    );
  }
});
