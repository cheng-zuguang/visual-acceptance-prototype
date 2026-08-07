# Development, Verification, and Troubleshooting

[简体中文](./DEVELOPMENT.md) | [English](./DEVELOPMENT.en.md)

## Technology stack

- React + Vite: setup and report UI;
- Express + Multer: API and in-memory uploads;
- Playwright: H5 loading, DOM analysis, and screenshots;
- Sharp + pixelmatch: image normalization and pixel diff;
- js-yaml: rule parsing;
- TypeScript + tsx: shared types and server runtime.

Dependencies currently use the `latest` range, so `package-lock.json` is the main source for reproducible installs. Vite 8 requires Node.js `^20.19.0` or `>=22.12.0`.

## Directory structure

```text
.
├── src/                    # DiffLab React frontend and shared types
├── server/                 # API, capture, rules, comparison, AI, reports
├── example/                # Independent Doc Store H5 sample for development
├── docs/                   # Project documentation
├── acceptance.example*.yaml # Copyable Chinese/English rule examples
├── PROTOTYPE_NOTES.md      # Product/algorithm validation notes
├── vite.config.ts          # Frontend port and API proxy
└── package.json            # Scripts and dependencies
```

With the development server running, the independent H5 sample is available at <http://127.0.0.1:5173/example/index.html>. It is not part of the default production build entry. Prefer the in-app built-in diff sample for stable end-to-end verification.

## Local development

```bash
npm ci
npm run dev
```

The processes can also be started separately:

```bash
npm run dev:server
npm run dev:client
```

Vite listens on `127.0.0.1:5173` and proxies `/api` and `/demo` to `127.0.0.1:4318`. Changing `PORT` only changes the API listener; it does not update the Vite proxy, so `vite.config.ts` must be changed as well.

## Verification before handoff

There is currently no automated test suite. The minimum verification set is:

```bash
npm run typecheck
npm run build
```

Changes to capture or comparison logic should also run this manual regression:

1. Open DiffLab and run the built-in diff sample;
2. Confirm that it fails and reports position, size/typography, color/decoration, and missing-element findings;
3. Switch among side-by-side, overlay, and diff views;
4. Export HTML, Markdown, JSON, and PNG, then verify that each file opens;
5. If the Figma path changed, verify it with a real accessible Frame;
6. If the AI path changed, test success, missing configuration, and upstream failure, ensuring failure never changes the deterministic verdict.

## Production mode

```bash
npm run build
npm start
```

`npm start` sets `NODE_ENV=production`. When the API finds `dist/`, it serves the frontend assets and falls back to `index.html` for other paths. The default address is <http://127.0.0.1:4318>.

This is only a convenient single-process mode for local demos. The service still listens only on the loopback interface and has no production authentication, rate limiting, logging, persistence, health management, or browser isolation.

## Change or add a rule

A rule usually requires coordinated changes in:

1. `src/types.ts`: extend data structures when necessary;
2. `server/default-rules.ts`: default YAML/configuration, parsing, and severity;
3. `server/capture.ts`: new H5 capture or static-audit data, if needed;
4. `server/compare.ts`: trigger condition, issue content, and gate severity;
5. `acceptance.example.yaml`, `docs/ACCEPTANCE_RULES.md`, and its English counterpart: user-facing configuration;
6. `server/demo.ts`: a stable built-in difference when the rule can be demonstrated;
7. The Chinese and English `PROTOTYPE_NOTES`: sample conclusions and remaining questions.

Keep the deterministic rule engine separate from AI. AI input may quote rule findings, but AI output must not modify `issues`, severities, or `status`.

## Troubleshooting

### The frontend says it cannot load default rules

Confirm that the API is running on port `4318`:

```bash
curl http://127.0.0.1:4318/api/health
```

If `PORT` changed, update the proxy target in `vite.config.ts` as well.

### The browser cannot launch

The capture process first tries local Google Chrome, then Playwright Chromium. Install the latter with:

```bash
npx playwright install chromium
```

A Linux CI environment may also require system packages; use the dependency option provided by Playwright's official installation command.

### The page times out or is captured too early

- Increase `capture.timeout_ms`;
- Add a stable ready marker to the business page and configure `wait_for_selector`;
- Increase `settle_ms`;
- Ensure the target address is reachable from the server-side browser; `localhost` in another container is not the current host;
- Add the smallest uncontrollable clock, carousel, or advertisement region to `ignore`.

### Fonts or images cause a large diff

- Ensure the page's fonts and assets are accessible to a clean browser context without login;
- Avoid relying on local caches, cookies, or browser extensions;
- Confirm that the Figma Frame and H5 page use the same dimensions;
- Use the diff image to distinguish a global rendering-environment problem from local CSS differences;
- Calibrate `pixel_threshold` and `visual_similarity_min`, but do not hide real structural differences behind overly permissive values.

### Element-matching false positives

Add `data-figma-id` to important DOM elements first. You can also:

- Raise `match_confidence_min` to reject more unreliable geometric matches;
- Raise `high_confidence_min` so more automatic-match errors become `pending`;
- Use `critical_figma_nodes` to identify nodes that must be present;
- Check whether duplicate copy caused text matching to select the wrong element.

### Figma request failure

- The URL must use a `/design/`, `/file/`, or `/proto/` path and contain a specific `node-id`;
- The token must be able to read the target file;
- The server must reach `api.figma.com` and the image URL returned by Figma;
- If the Frame render or size exceeds the prototype boundary, export a PNG and use image mode to isolate the problem.

### AI model-list or advice failure

- A base URL may end at `/v1`, `/responses`, or `/models`;
- The `/models` response must expose recognizable model ids;
- Advice generation requires support for two image inputs, the Responses API, and strict JSON Schema output;
- Upstream redirects are rejected; model listing times out after 30 seconds and advice after 60 seconds;
- A local compatible service may omit the key, but its URL is required;
- Inspect **Runtime diagnostics** in the report. AI failure should appear only there.

## Security checklist for further development

Before turning the prototype into a shared service, implement at least:

- Domain/network allowlists for target H5 and AI Base URLs to prevent SSRF and private-network probing;
- User authentication, authorization, CSRF protection, rate limiting, and upload-content validation;
- Managed secrets and redacted logs, replacing long-lived plaintext browser caching;
- Per-run browser/network isolation, resource limits, and concurrency limits;
- Explicit upstream error codes, timeouts, retry policy, and observability;
- Report persistence, retention policy, and access control for sensitive screenshots;
- Pinned dependency versions, automated tests, versioned thresholds, and a real-sample regression corpus.
