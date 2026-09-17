import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { BatchReviewResult } from "../src/types";
import { createReviewMcpHttpEndpoint } from "./mcp-http";
import express from "express";
import { createPublicApiApp, type ServiceIdentity } from "./public-api";

async function completedExecution(): Promise<BatchReviewResult> {
  return {
    reviewName: "行情首页",
    executionStatus: "succeeded",
    verdict: "passed",
    summary: {
      totalPages: 0,
      completedPages: 0,
      executionFailedPages: 0,
      passedPages: 0,
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

function rawMcpStatus(port: number, headers: Record<string, string>): Promise<number> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port,
      path: "/mcp",
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        ...headers
      }
    }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode ?? 0));
    });
    request.once("error", reject);
    request.end(body);
  });
}

test("Streamable HTTP exposes the Review tools and forwards the caller service identity", async () => {
  const serviceTokens: Record<string, ServiceIdentity> = {
    "mcp-http-token": {
      tenantId: "tenant-http",
      scopes: ["reviews:create", "reviews:read"]
    }
  };
  const publicApi = createPublicApiApp({
    serviceTokens,
    allowedHosts: ["h5.test"],
    lookupHost: async () => ["93.184.216.34"],
    resolveCredential: async () => "figma-token",
    signingSecret: "test-signing-secret",
    executeReview: completedExecution
  });
  const apiServer = publicApi.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => apiServer.once("listening", resolve));
  const apiPort = (apiServer.address() as AddressInfo).port;
  const endpoint = createReviewMcpHttpEndpoint({
    apiBaseUrl: `http://127.0.0.1:${apiPort}`,
    serviceTokens,
    host: "127.0.0.1",
    allowedHosts: ["127.0.0.1"]
  });
  const mcpApp = express();
  mcpApp.use("/mcp", endpoint.middleware);
  const mcpServer = mcpApp.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => mcpServer.once("listening", resolve));
  const mcpPort = (mcpServer.address() as AddressInfo).port;
  const client = new Client({ name: "difflab-http-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(`http://127.0.0.1:${mcpPort}/mcp`),
    { authProvider: { token: async () => "mcp-http-token" } }
  );

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    assert.deepEqual(
      tools.tools.map((tool) => tool.name).sort(),
      ["review.create", "review.get", "review.get_result", "review.list_artifacts"]
    );

    const created = await client.callTool({
      name: "review.create",
      arguments: { request: reviewRequest(), idempotencyKey: "mcp-http-create-1" }
    });
    const payload = created.structuredContent as { reviewId: string; status: string };
    assert.match(payload.reviewId, /^rev_/);
    assert.equal(payload.status, "queued");
  } finally {
    await client.close();
    await endpoint.close();
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        mcpServer.close((error) => error ? reject(error) : resolve())
      ),
      new Promise<void>((resolve, reject) =>
        apiServer.close((error) => error ? reject(error) : resolve())
      )
    ]);
  }
});

test("Streamable HTTP rejects missing and invalid bearer tokens before MCP handling", async () => {
  const endpoint = createReviewMcpHttpEndpoint({
    apiBaseUrl: "http://127.0.0.1:4318",
    serviceTokens: {
      "valid-token": { tenantId: "tenant-http", scopes: ["reviews:read"] }
    },
    host: "127.0.0.1",
    allowedHosts: ["127.0.0.1"]
  });
  const app = express();
  app.disable("x-powered-by");
  app.use("/mcp", endpoint.middleware);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const port = (server.address() as AddressInfo).port;
  const request = (authorization?: string) => fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      ...(authorization ? { authorization } : {})
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
  });

  try {
    const missing = await request();
    const invalid = await request("Bearer wrong-token");
    const invalidHostStatus = await rawMcpStatus(port, { host: "evil.example" });
    const invalidOrigin = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        origin: "https://evil.example"
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    });

    assert.equal(missing.status, 401);
    assert.equal(missing.headers.get("x-powered-by"), null);
    assert.equal(invalid.status, 401);
    assert.equal(invalidHostStatus, 403);
    assert.equal(invalidOrigin.status, 403);
    assert.match(missing.headers.get("www-authenticate") ?? "", /^Bearer\b/i);
  } finally {
    await endpoint.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve())
    );
  }
});
