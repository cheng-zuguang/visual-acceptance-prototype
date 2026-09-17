# DiffLab Visual Acceptance Prototype

[简体中文](./README.md) | [English](./README.en.md)

DiffLab compares a Figma Frame or reference image with an H5 web page in the same viewport. It applies YAML rules to produce a reproducible pass/fail verdict, diff regions, DOM locations, and remediation guidance.

> **Project status: throwaway prototype.** The current goal is to validate whether visual comparison results are trustworthy. It does not include accounts, task history, a database, or production-grade security boundaries. See [PROTOTYPE_NOTES.md](./PROTOTYPE_NOTES.md) for current findings and open questions.

## What it does

- Uses a Figma Frame URL or PNG/JPG/WebP image as the design reference;
- Captures an H5 page with Playwright in a fixed viewport, DPR 1, and light mode;
- Tiles one uploaded long screenshot by device viewport/DPR and maps findings back to full-page coordinates;
- Compares stable-region pixel similarity inside reliable element matches and highlights dense diff regions;
- Checks Figma nodes against DOM elements for position, size, content, font, text alignment, color, and decoration;
- Normalizes one dynamic market value from at least three frames while retaining layout, style, and overflow checks;
- Detects broken images, horizontal overflow, and potentially clipped text;
- Configures thresholds, severities, ignored regions, and page stabilization through YAML;
- Optionally calls an OpenAI Responses-compatible model to prioritize fixes;
- Exports standalone HTML, Markdown, JSON, and a PNG diff image.

Only deterministic rules decide whether a run passes. Any `error` fails the report; `warning`, `pending`, and AI advice do not block acceptance.

## Quick start

### Requirements

- Node.js `^20.19.0` or `>=22.12.0`;
- npm;
- Local Google Chrome or Playwright Chromium.

```bash
npm ci
npm run dev
```

Open <http://127.0.0.1:5173/prototype/visual-qa>. The frontend development server runs on `5173`; the API server runs on `4318`.

If Google Chrome is unavailable, install Playwright Chromium:

```bash
npx playwright install chromium
```

### Run the built-in sample first

Click **Run built-in diff sample** on the home page. The sample deliberately introduces font-size, position, color, border-radius, and missing-element differences, so the expected result is **failed**. This path does not require a Figma token or an external H5 page.

### Run a real comparison

Prepare:

1. A Figma Frame sharing URL containing `node-id` plus a Figma Access Token, or a reference image no larger than 25 MB and 6000 px on either axis;
2. An HTTP/HTTPS H5 URL accessible to the server-side browser, or one long screenshot with its device DPR and one-screen height;
3. A YAML acceptance configuration, such as [acceptance.example.en.yaml](./acceptance.example.en.yaml).

An image reference has no node, text, or style metadata, so it only supports pixel comparison and H5 static audits. Use a Figma Frame when you need element-level locations and property comparisons.

Live H5 reviews capture three samples from one browser page session by default. If at least three frames jointly prove that one market value changes only in text while identity, geometry, and style remain stable, DiffLab symmetrically normalizes its design and actual character pixels. The report presents stable-region similarity, dynamic-region ratio, and strategy separately; font, size, weight, color, position, dimensions, text alignment, and clipped overflow remain reviewable.

## Improve element matching

Elements are matched in this order:

1. Exact match between `data-figma-id` and the Figma node id;
2. Equal visible text, refined by position and size;
3. A heuristic based on type, position, and size.

Add Figma node ids to important H5 elements:

```html
<button data-figma-id="123:456">Submit</button>
```

Hyphenated ids are normalized during matching. Stable-text and structure-geometry candidates enter the review intersection only at or above `match_confidence_min`. When a match falls below `high_confidence_min`, element-property findings configured as `error` or `warning` are downgraded to `pending`; `info` remains unchanged.

## Credentials and AI

The Figma token, AI API key, API URL, selected model, and AI toggle entered in the UI are stored in plaintext in the current browser's `localStorage`. They survive refreshes and can be deleted with **Clear local cache**. Use them only on a trusted personal device. They are not written to reports or server-side files.

You can also set server defaults before starting the app:

| Environment variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API server port | `4318` |
| `FIGMA_TOKEN` | Default server-side Figma Access Token | None |
| `OPENAI_API_KEY` | Default server-side AI API key | None |
| `OPENAI_BASE_URL` | OpenAI-compatible base, `/responses`, or `/models` URL | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Default AI model id | `gpt-5.6-terra` |
| `DIFFLAB_AI_ENABLED` | Whether MCP and public Reviews enable AI by default | Inferred from AI key/API URL |
| `DIFFLAB_API_BASE_URL` | Public `/v1` API base URL used by MCP tools | `http://127.0.0.1:4318` |
| `DIFFLAB_SERVICE_TOKEN` | Bearer service identity shared by the public API and MCP | None |
| `DIFFLAB_AI_ALERT_MIN_ATTEMPTS` | Minimum AI advice attempts before alert evaluation | `20` |
| `DIFFLAB_AI_TIMEOUT_ALERT_RATIO` | AI advice timeout-rate alert threshold | `0.2` |
| `DIFFLAB_AI_EVIDENCE_DANGLING_ALERT_RATIO` | AI advice dangling-evidence alert threshold | `0.1` |
| `DIFFLAB_MCP_ALLOWED_HOSTS` | Comma-separated Host names allowed by Streamable HTTP MCP | Localhost names only |
| `DIFFLAB_MCP_ALLOWED_ORIGINS` | Origin hostnames allowed for browser MCP clients | Same as allowed hosts |
| `DIFFLAB_ALLOWED_CLIENT_IPS` | Comma-separated public client IPs/CIDRs allowed to access the service; `/api/health` is exempt | Unrestricted |
| `NODE_ENV` | When set to `production`, the API serves an existing `dist/` | Unset |

```bash
FIGMA_TOKEN=... \
OPENAI_API_KEY=... \
OPENAI_BASE_URL=https://api.example.com/v1 \
OPENAI_MODEL=your-model \
npm run dev
```

Values entered in the UI take precedence over environment variables. A custom service may omit the API key, but it must support Responses-style structured output. Its model-list endpoint must return `{ "data": [{ "id": "model-id" }] }` or a top-level `models` array. The selected model must support image input, the Responses API, and JSON Schema structured output. If AI is not configured or its request fails, the deterministic report is still generated.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite frontend and hot-reloading API server |
| `npm run dev:client` | Starts only the frontend; proxies `/api` and `/demo` to `4318` |
| `npm run dev:server` | Starts the API server and same-port `/mcp` Streamable HTTP endpoint |
| `npm run mcp` | Starts the stdio MCP server backed by the public `/v1` API |
| `npm run validate:financial-gold-set -- --manifest <file>` | Validates financial H5 gold-set evidence, approval, and reuse gates and can export page-alignment labels |
| `npm run calibrate:alignment -- --labels <file>` | Calibrates page-alignment parameters and emits candidate YAML only after fold-stability and OOF-performance gates pass |
| `npm run typecheck` | Runs the TypeScript type checker |
| `npm run build` | Type-checks and builds the frontend into `dist/` |
| `npm start` | Starts the API in production mode and serves `dist/` when present |

Minimal local production-mode startup:

```bash
npm run build
npm start
```

Then open <http://127.0.0.1:4318/prototype/visual-qa>.

### Run with Docker

DiffLab includes Docker configurations with Playwright Chromium and CJK font support. Use Docker Compose to build and start with one command:

```bash
# 1. Copy and adjust environment variables (optional)
cp .env.example .env

# 2. Build and start the container
docker compose up -d --build
```

Then navigate to <http://127.0.0.1:14318/prototype/visual-qa>. Compose binds the host port to the loopback interface only, allowing local browsers and Cloudflare Tunnel while preventing direct access that bypasses the Tunnel.

When publishing through Cloudflare Tunnel, configure a client IP allowlist in `.env` if needed:

```dotenv
DIFFLAB_ALLOWED_CLIENT_IPS=203.0.113.10,198.51.100.0/24,2001:db8:abcd::/48
```

When enabled, the service trusts only Cloudflare's `CF-Connecting-IP` header. Requests without that header or from clients outside the allowlist receive `403`; `/api/health` remains public. Do not expose the container port on a non-loopback host interface, because direct clients could bypass the Tunnel and forge the header.

Alternatively, using the Docker CLI directly:

```bash
docker build -t difflab:latest .
docker run -d --name difflab --shm-size=1gb -p 127.0.0.1:14318:4318 difflab:latest
```

## Documentation

- [Architecture and comparison pipeline](./docs/ARCHITECTURE.en.md)
- [YAML acceptance-rule reference](./docs/ACCEPTANCE_RULES.en.md)
- [Offline page-alignment confidence calibration](./docs/PAGE_ALIGNMENT_CALIBRATION.en.md)
- [HTTP API reference](./docs/API.en.md)
- [MCP review interface](./docs/MCP.en.md)
- [Public service API design and implementation boundary](./docs/PUBLIC_API_DESIGN.md)
- [Development, verification, and troubleshooting](./docs/DEVELOPMENT.en.md)
- [Prototype validation notes](./PROTOTYPE_NOTES.en.md)
- [MIT License](./LICENSE) ([Chinese reference translation](./LICENSE.zh-CN.md))

## Security and scope

- Legacy `/api` routes have no authentication, authorization, or network isolation and are for local prototype use only;
- New `/v1` routes support tenant-scoped assets, batched Live/Screenshot/Hybrid reviews, idempotent submission, bounded global/per-tenant queues, submission rate limits, shared PagePair concurrency, short-lived signed transfers, signed webhooks, and H5/callback host and DNS protection;
- `/v1` still keeps jobs, assets, idempotency, and webhook delivery records in process, without object storage, durable queues, cross-instance coordination, or production secret management;
- `/api/compare` allows its browser to visit any supplied HTTP/HTTPS URL and forwards credentials to Figma or the configured AI endpoint. Do not expose that legacy route to an untrusted network;
- The H5 page should already be in its target state. Public Live/Hybrid jobs can inject headers/cookies through a server-side browser credential reference, but do not orchestrate interactive login or business-state navigation. Each PagePair still represents one Frame, page state, and viewport;
- Fonts, dynamic content, asynchronous data, environment differences, and complex Figma Auto Layout can introduce noise. Calibrate thresholds against real business samples before using the result as a gate.

## License

Released under the [MIT License](./LICENSE). The [Chinese translation](./LICENSE.zh-CN.md) is provided for reference only; the English license text controls.
