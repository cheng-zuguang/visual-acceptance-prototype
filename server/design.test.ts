import assert from "node:assert/strict";
import test from "node:test";
import { createFigmaFetch } from "./design";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

test("spaces concurrent Figma API requests", async () => {
  let now = 0;
  const requestTimes: number[] = [];
  const client = createFigmaFetch({
    minRequestIntervalMs: 1_000,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    fetch: async () => {
      requestTimes.push(now);
      return jsonResponse({ ok: true });
    }
  });

  await Promise.all([
    client("https://api.figma.com/v1/first", "token", "zh-CN"),
    client("https://api.figma.com/v1/second", "token", "zh-CN")
  ]);

  assert.deepEqual(requestTimes, [0, 1_000]);
});

test("honors Retry-After and retries a rate-limited request", async () => {
  let now = 0;
  const requestTimes: number[] = [];
  let attempt = 0;
  const client = createFigmaFetch({
    minRequestIntervalMs: 1_000,
    maxRetries: 2,
    now: () => now,
    sleep: async (ms) => { now += ms; },
    fetch: async () => {
      requestTimes.push(now);
      attempt += 1;
      return attempt === 1
        ? jsonResponse({ status: 429 }, 429, { "Retry-After": "2" })
        : jsonResponse({ ok: true });
    }
  });

  const result = await client<{ ok: boolean }>("https://api.figma.com/v1/resource", "token", "zh-CN");

  assert.equal(result.ok, true);
  assert.deepEqual(requestTimes, [0, 2_000]);
});
