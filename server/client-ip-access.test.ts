import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { createClientIpAllowlist } from "./client-ip-access";

async function requestThroughAllowlist(
  allowedClientIps: string[],
  headers: Record<string, string> = {},
  path = "/protected",
): Promise<Response> {
  const app = express();
  app.use(createClientIpAllowlist({
    allowedClientIps,
    publicPaths: ["/api/health"],
  }));
  app.get("/protected", (_request, response) => response.json({ ok: true }));
  app.get("/api/health", (_request, response) => response.json({ ok: true }));

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const { port } = server.address() as AddressInfo;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, { headers });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("rejects a Cloudflare visitor outside the configured client IP allowlist", async () => {
  const response = await requestThroughAllowlist(
    ["203.0.113.10"],
    { "cf-connecting-ip": "198.51.100.20" },
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Client IP is not allowed.",
  });
});

test("allows a Cloudflare visitor in the configured client IP allowlist", async () => {
  const response = await requestThroughAllowlist(
    ["203.0.113.10"],
    { "cf-connecting-ip": "203.0.113.10" },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("allows Cloudflare visitors inside configured IPv4 and IPv6 CIDR ranges", async () => {
  const ipv4Response = await requestThroughAllowlist(
    ["198.51.100.0/24", "2001:db8:abcd::/48"],
    { "cf-connecting-ip": "198.51.100.42" },
  );
  assert.equal(ipv4Response.status, 200);

  const ipv6Response = await requestThroughAllowlist(
    ["198.51.100.0/24", "2001:db8:abcd::/48"],
    { "cf-connecting-ip": "2001:db8:abcd::42" },
  );
  assert.equal(ipv6Response.status, 200);
});

test("keeps the health endpoint public when the client IP allowlist is enabled", async () => {
  const response = await requestThroughAllowlist(
    ["203.0.113.10"],
    {},
    "/api/health",
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("leaves access unrestricted when no client IP allowlist is configured", async () => {
  const response = await requestThroughAllowlist([]);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
