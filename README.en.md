# DiffLab Visual Acceptance Prototype

[简体中文](./README.md) | [English](./README.en.md)

DiffLab compares a Figma Frame or reference image with an H5 web page in the same viewport. It applies YAML rules to produce a reproducible pass/fail verdict, diff regions, DOM locations, and remediation guidance.

> **Project status: throwaway prototype.** The current goal is to validate whether visual comparison results are trustworthy. It does not include accounts, task history, a database, or production-grade security boundaries. See [PROTOTYPE_NOTES.md](./PROTOTYPE_NOTES.md) for current findings and open questions.

## What it does

- Uses a Figma Frame URL or PNG/JPG/WebP image as the design reference;
- Captures an H5 page with Playwright in a fixed viewport, DPR 1, and light mode;
- Compares overall pixel similarity and highlights dense diff regions;
- Checks Figma nodes against DOM elements for position, size, content, typography, color, and decoration;
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
2. An HTTP/HTTPS H5 URL accessible to the server-side browser;
3. A YAML acceptance configuration, such as [acceptance.example.en.yaml](./acceptance.example.en.yaml).

An image reference has no node, text, or style metadata, so it only supports pixel comparison and H5 static audits. Use a Figma Frame when you need element-level locations and property comparisons.

## Improve element matching

Elements are matched in this order:

1. Exact match between `data-figma-id` and the Figma node id;
2. Equal visible text, refined by position and size;
3. A heuristic based on type, position, and size.

Add Figma node ids to important H5 elements:

```html
<button data-figma-id="123:456">Submit</button>
```

Hyphenated ids are normalized during matching. When an automatic match falls below `high_confidence_min`, element-property findings configured as `error` are downgraded to `pending` to avoid blocking on an unreliable match. Other severities remain unchanged.

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
| `npm run dev:server` | Starts only the API server |
| `npm run typecheck` | Runs the TypeScript type checker |
| `npm run build` | Type-checks and builds the frontend into `dist/` |
| `npm start` | Starts the API in production mode and serves `dist/` when present |

Minimal local production-mode startup:

```bash
npm run build
npm start
```

Then open <http://127.0.0.1:4318/prototype/visual-qa>.

## Documentation

- [Architecture and comparison pipeline](./docs/ARCHITECTURE.en.md)
- [YAML acceptance-rule reference](./docs/ACCEPTANCE_RULES.en.md)
- [HTTP API reference](./docs/API.en.md)
- [Development, verification, and troubleshooting](./docs/DEVELOPMENT.en.md)
- [Prototype validation notes](./PROTOTYPE_NOTES.en.md)
- [MIT License](./LICENSE) ([Chinese reference translation](./LICENSE.zh-CN.md))

## Security and scope

- The service listens only on `127.0.0.1` and has no authentication, authorization, rate limiting, or tenant isolation;
- `/api/compare` allows its browser to visit any supplied HTTP/HTTPS URL and forwards credentials to Figma or the configured AI endpoint. Do not expose this prototype to an untrusted network;
- The H5 page must be available in its default static state without an interactive login. Each run accepts one Frame and one viewport;
- Fonts, dynamic content, asynchronous data, environment differences, and complex Figma Auto Layout can introduce noise. Calibrate thresholds against real business samples before using the result as a gate.

## License

Released under the [MIT License](./LICENSE). The [Chinese translation](./LICENSE.zh-CN.md) is provided for reference only; the English license text controls.
