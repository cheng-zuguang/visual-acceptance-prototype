# MCP Review Interface

[简体中文](./MCP.md) | English

DiffLab's MCP server is a thin adapter over the public `/v1` HTTP API. It does not read Figma, launch browsers, run comparison logic, or maintain separate Review state.

## Transports and startup

### Streamable HTTP

The main API process exposes a stateless Streamable HTTP endpoint on the same port:

```bash
DIFFLAB_SERVICE_TOKEN=your-service-token \
npm run dev:server
```

The MCP URL is `http://127.0.0.1:4318/mcp`. Every request must carry `Authorization: Bearer your-service-token`. Once validated, the same token is forwarded to `/v1`, so tenant, scope, idempotency, SSRF, and artifact authorization remain identical to direct HTTP API calls. A short-lived MCP server is created per HTTP request; it keeps no separate session or Review state.

Only `localhost`, `127.0.0.1`, and `[::1]` Host/Origin names are accepted by default. A network deployment must explicitly allow its hostname without a scheme or port:

```bash
DIFFLAB_MCP_ALLOWED_HOSTS=review.example.com \
DIFFLAB_MCP_ALLOWED_ORIGINS=review.example.com \
DIFFLAB_SERVICE_TOKEN=your-service-token \
npm start
```

Non-browser MCP clients normally omit `Origin` and are unaffected by the Origin allowlist. `DIFFLAB_MCP_ALLOWED_ORIGINS` validates an origin but does not independently enable browser CORS. This initial authentication mode reuses the public API Bearer service token; it does not provide an OAuth authorization server or dynamic client registration.

### stdio

Start the DiffLab API, then run MCP with a service identity that has the required scopes:

```bash
DIFFLAB_API_BASE_URL=http://127.0.0.1:4318 \
DIFFLAB_SERVICE_TOKEN=your-service-token \
DIFFLAB_AI_ENABLED=true \
OPENAI_API_KEY=your-ai-key \
OPENAI_BASE_URL=https://api.openai.com/v1 \
OPENAI_MODEL=your-vision-model \
npm run mcp
```

`npm run mcp` uses stdio. `DIFFLAB_API_BASE_URL` and `DIFFLAB_SERVICE_TOKEN` are required. One stdio process represents one public API service identity; Streamable HTTP uses the validated Bearer identity on each request. Both transports inherit the corresponding tenant and scopes. The token is used only as the Bearer credential for `/v1`; it is never included in tool arguments or results.

Monitoring is intentionally not exposed as an MCP tool. Prometheus should scrape `/v1/metrics` directly with a same-tenant service token carrying `metrics:read`, keeping monitoring outside the Agent invocation path.

Setting `OPENAI_API_KEY` or a non-default `OPENAI_BASE_URL` enables AI by default; `DIFFLAB_AI_ENABLED=true/false` controls it explicitly. The same variables on the API process act as fallbacks. A call may optionally provide top-level `ai` with `requested`, `apiKey`, `apiUrl`, or `model`. Call fields override MCP environment defaults field by field, and `requested: false` disables AI for that Review. An embedded `request.ai` remains supported for callers reusing an HTTP body, but top-level `ai` wins.

## Tools

- `review.create` accepts `{ request, idempotencyKey? }`, submits the same body as `POST /v1/reviews`, and immediately returns the asynchronous `reviewId` and initial status.
- `review.get` accepts `{ reviewId }` and returns the same execution status, progress, page states, and available verdict as `GET /v1/reviews/{reviewId}`.
- `review.get_result` accepts `{ reviewId }` and returns the same structured verdict, findings, confidence evidence, metrics, and artifact IDs as the HTTP result endpoint. When AI advice is rejected, each affected page can include `aiAdviceRejection` with an `ai_timeout`, `ai_format_error`, `ai_generation_failed`, or `evidence_integrity_failed` code. Evidence-integrity failures also expose dangling references and one-based priority locations.
- `review.list_artifacts` accepts `{ reviewId }` and returns artifact metadata plus short-lived signed download URLs. It never embeds Excel or image bytes.

The recommended loop is `review.create` → poll `review.get` → call `review.get_result` and, when needed, `review.list_artifacts`. Execution status and UI acceptance verdict remain separate concepts.

Image evidence references (full design/actual/diff images and issue crops) pass through unchanged from HTTP; download bytes using the signed URLs. Single-issue recheck creation uses `POST /v1/issue-rechecks` only; no separate MCP creation tool is added. Its returned Review ID works with the existing status, result, and artifact tools.

Each page returned by `review.get_result` can expose `matching.pageAlignment`, a structured module correspondence plan containing `matched / missing-in-actual / uncertain` states, actual regions, whole-region displacement, decision source, EvidenceConfidence, `anchorStats` (candidate/stable/dynamic-excluded/structural/RANSAC-inlier counts and residual), `scoreBreakdown` (component values/weights/contributions/thresholds), and the rejected-proposal count. An Agent may use it to explain why a region was not matched or to route human review, but it must not reinterpret the plan as a pass/fail decision; deterministic rules still produce the `verdict`.

HTTP error bodies are preserved as MCP `structuredContent` with `isError: true`, so callers can continue handling `error.code` and `error.retryable`. Authentication, tenant isolation, idempotency, SSRF checks, credential references, result sanitization, and signed downloads remain enforced by `/v1`.

Inline `review.create.ai.apiKey` is intended only for the simple local prototype and is never returned or persisted in Review results. Shared-network deployments should use server-side environment configuration or a future tenant-scoped secret reference.

See the [HTTP API reference](./API.en.md) and [public service design](./PUBLIC_API_DESIGN.md) for the complete Review request and response contracts.
