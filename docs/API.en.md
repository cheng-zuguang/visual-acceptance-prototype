# HTTP API Reference

[简体中文](./API.md) | [English](./API.en.md)

In development, the API defaults to `http://127.0.0.1:4318`. Vite proxies browser requests under `/api` and `/demo` to that address. Legacy `/api` routes remain unauthenticated local-prototype routes; service integrations should use authenticated `/v1` routes.

## Public Review API

`/v1` accepts Live, Screenshot, Hybrid, and Long Screenshot PagePairs, including multiple pages in one asynchronous Review:

- `POST /v1/assets` and `GET /v1/assets/{assetId}` require `assets:write` and manage validated screenshot assets;
- `PUT /v1/assets/{assetId}/content?...` uses the returned short-lived HMAC upload URL;
- `POST /v1/reviews` (`reviews:create`) returns `202 Accepted` and supports `Idempotency-Key`;
- `GET /v1/reviews/{reviewId}` (`reviews:read`) returns execution state and UI verdict;
- `GET /v1/reviews/{reviewId}/result` returns compact structured results without base64 images;
- `POST /v1/issue-rechecks` submits one `pagePair` plus an original `issue` for asynchronous target verification; polling, cancellation, and artifacts reuse Review endpoints. See the [single-issue contract](./PUBLIC_HTTP_API.md#19-单问题复核) (Chinese).
- `GET /v1/reviews/{reviewId}/artifacts` returns Excel, full-image and crop metadata with short-lived signed download URLs;
- `GET /v1/reviews/{reviewId}/artifacts/{artifactId}?...` downloads with that signature or same-tenant authentication;
- `POST /v1/reviews/{reviewId}/cancel` requires `reviews:cancel`;
- `GET /v1/metrics` requires `metrics:read` and returns Prometheus text for only the authenticated tenant's cumulative AI-advice metrics, fixed 5m/15m window counts, and alert configuration.

Screenshot/Hybrid callers declare size, content type, and SHA-256 before upload; the service fully decodes PNG/JPEG/WebP and enforces byte and pixel limits before marking an asset `ready`. PagePairs reference ready same-tenant asset IDs plus device viewport/DPR metadata. Optional browser headers/cookies are resolved server-side through `browserCredentialRef` and are never returned.

Long Screenshot uses the same asset upload boundary but requires exactly one asset per PagePair. Its device viewport height is one screen in CSS pixels, not the full image height. Optional `url` and `browserCredentialRef` upgrade the review to Full-page Hybrid: the uploaded long image remains the visual truth while one H5 session collects multi-sample DOM, computed-style, and dynamic evidence at every tile `scrollY`; only unaligned tiles fall back to Screenshot evidence. An optional `crop` removes device/browser chrome in original-image pixel coordinates, while optional `anchors` carries OCR/visual-adapter observations in those same coordinates. Results expose `effectiveMode`, `hybridTileCount`, per-tile alignment, tile index, scroll position, absolute issue coordinates, sticky duplicates, and capture-quality anomalies. Lazy-load blanks or repeated stitch strips cap confidence and add Pending evidence; Excel crops annotations from the original full-page coordinates.

Configure `DIFFLAB_SERVICE_TOKEN`, `DIFFLAB_TENANT_ID`, H5 and webhook host allowlists, Figma/browser/webhook credential refs and secrets, `DIFFLAB_SIGNING_SECRET`, and the `DIFFLAB_MAX_*` quota variables documented in [the Chinese reference](./API.md). AI alert defaults are controlled by `DIFFLAB_AI_ALERT_MIN_ATTEMPTS`, `DIFFLAB_AI_TIMEOUT_ALERT_RATIO`, and `DIFFLAB_AI_EVIDENCE_DANGLING_ALERT_RATIO`. Same-tenant retries with the same idempotency key and canonical request return one Review; changed content returns `409 IDEMPOTENCY_CONFLICT`. Status includes total/completed pages, current stage, and per-page state, while partial results and Excel remain available after an individual page failure.

Public Review creation also accepts an optional `ai` object with `requested`, `apiKey`, `apiUrl`, and `model`. Fields override `DIFFLAB_AI_ENABLED` and `OPENAI_*` server defaults; an object without `requested` enables AI, while `requested: false` disables it for one Review. Inline keys are a local-prototype convenience and are never returned in status, results, or artifacts. Shared-network deployments should use server-side configuration or a future tenant-scoped secret reference.

Callbacks support `review.completed`, `review.failed`, and `review.cancelled`. Each attempt sends a stable event ID, Unix timestamp, and HMAC-SHA256 over `timestamp + "." + raw JSON body`; bounded exponential retries do not change the Review result. Execution states are `queued / running / succeeded / failed / cancelled`, while UI verdicts remain independently `passed / failed / needs_review`. H5 and webhook hosts are repeatedly resolved and private/reserved addresses are blocked. Errors include stable `code`, `message`, `retryable`, and `requestId` fields.

Public results expose full-page `designImage / actualImage / diffImage` references under `pageResults[].pageEvidence` and `designCrop / actualCrop` on issues. References include image dimensions, SHA-256, and expiration. Download the bytes and encode locally if base64 is needed; result JSON does not embed image bytes. Long-image crops retain absolute positions; unknown regions and confirmed missing actual content have null crops. These public additions do not change the local CompareReport format below. See the [image evidence contract](./PUBLIC_HTTP_API.md#103-整图问题裁图与-base64-获取).

## Health check

### `GET /api/health`

Response:

```json
{
  "ok": true,
  "prototype": true
}
```

## Default rules

### `GET /api/default-rules`

Returns the default acceptance rules as `text/yaml`.

```bash
curl http://127.0.0.1:4318/api/default-rules
```

## List AI models

### `POST /api/ai/models`

Content type: `application/json`.

```json
{
  "apiKey": "optional-key",
  "apiUrl": "https://api.example.com/v1"
}
```

Both fields are optional and fall back to `OPENAI_API_KEY` and `OPENAI_BASE_URL`, respectively. The request fails when neither a key nor a custom URL is available.

The server normalizes a base URL to `/models`. If the supplied path already ends in `/responses` or `/models`, that suffix is replaced with `/models`. The upstream request uses a Bearer token when present, a 30-second timeout, and no redirect following.

A compatible upstream response can be:

```json
{
  "data": [{ "id": "vision-model" }]
}
```

A top-level `models` array is also supported. Each entry may be a string or an object with the model id in `id`, `model`, or `name`.

DiffLab response:

```json
{
  "models": ["vision-model"],
  "defaultModel": "gpt-5.6-terra"
}
```

## Run a real comparison

### `POST /api/compare`

Content type: `multipart/form-data`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `actualMode` | string | No | `live / screenshot / hybrid / long_screenshot`; omitted or unknown values use `live` |
| `h5Url` | string | By mode | Required for Live/Hybrid, unused for Screenshot, optional for Long Screenshot to collect auxiliary H5 tile evidence |
| `rulesYaml` | string | No | YAML rules; empty uses defaults |
| `figmaUrl` | string | Yes | Figma Frame URL containing `node-id` |
| `figmaToken` | string | No | Empty falls back to `FIGMA_TOKEN`; one must provide a usable credential |
| `locale` | string | No | `zh-CN / en` |
| `screenshots` | file | Screenshot modes | Repeatable file field: at most 5 images, each at most 25MiB; Long Screenshot requires exactly one |
| `screenshotDpr` | string | No | Positive device pixel ratio, default `1`; ordinary screenshot CSS viewport is image pixels divided by DPR |
| `screenshotPlatform` | string | No | Device platform, default `uploaded` |
| `longScreenshotViewportHeight` | string | Long Screenshot | Positive single-screen CSS height, not total image height; width is image width divided by DPR |
| `useAi` | string | No | Only the string `"true"` enables AI |
| `openaiKey` | string | No | Empty falls back to `OPENAI_API_KEY` |
| `openaiApiUrl` | string | No | Empty falls back to `OPENAI_BASE_URL` |
| `openaiModel` | string | No | Empty falls back to `OPENAI_MODEL`, then the built-in default |

Figma example:

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'h5Url=https://example.com/page' \
  -F 'figmaUrl=https://www.figma.com/design/FILE_KEY/Name?node-id=123-456' \
  -F 'figmaToken=YOUR_TOKEN' \
  -F 'rulesYaml=<acceptance.example.en.yaml'
```

Use `<` to send YAML contents as a normal text field, not a file field. Images use the `screenshots` file field. This local endpoint accepts image bytes directly, not the `/v1/assets` protocol or public `crop / anchors / browserCredentialRef / screenshotAssetIds` fields.

Long Screenshot example (omit `h5Url` for image-only review):

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'actualMode=long_screenshot' \
  -F 'figmaUrl=https://www.figma.com/design/FILE_KEY/Name?node-id=123-456' \
  -F 'screenshots=@/absolute/path/market-long.png' \
  -F 'screenshotDpr=3' \
  -F 'longScreenshotViewportHeight=844' \
  -F 'h5Url=https://example.com/page'
```

## Run the built-in sample

### `POST /api/demo-compare`

Content type: `application/json`.

```json
{
  "rulesYaml": "viewport: auto\n",
  "useAi": false,
  "openaiKey": "",
  "openaiApiUrl": "",
  "openaiModel": ""
}
```

Here `useAi` is a JSON boolean, unlike the string used by the multipart endpoint. The built-in sample captures the reference and changed pages at `1280 × 800` and provides exact `data-figma-id` mappings.

Minimal request:

```bash
curl -X POST http://127.0.0.1:4318/api/demo-compare \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Comparison response

Both comparison endpoints return `CompareReport`. Abbreviated example:

```json
{
  "id": "uuid",
  "createdAt": "2026-08-06T00:00:00.000Z",
  "durationMs": 1234,
  "status": "failed",
  "evidenceMode": "live",
  "summary": {
    "errors": 2,
    "warnings": 4,
    "pending": 1,
    "similarity": 0.9342,
    "stableSimilarity": 0.9342,
    "dynamicRegionAreaRatio": 0.0185,
    "matchedElements": 9,
    "unmatchedDesignElements": 3,
    "unmatchedActualElements": 5
  },
  "viewport": { "width": 1280, "height": 800 },
  "source": {
    "design": "Figma · file name · 123:456",
    "actual": "https://example.com/page"
  },
  "images": {
    "reference": "data:image/png;base64,...",
    "actual": "data:image/png;base64,...",
    "diff": "data:image/png;base64,..."
  },
  "matching": {
    "matches": [
      {
        "figmaNodeId": "123:456",
        "selector": "[data-figma-id=\"123:456\"]",
        "method": "exact-id",
        "evidenceConfidence": {
          "score": 0.99,
          "level": "high",
          "basis": ["exact-id"],
          "reasons": ["data-figma-id exactly matches the Figma node id."]
        }
      }
    ],
    "unmatchedDesignCount": 3,
    "unmatchedActualCount": 5,
    "pageAlignment": {
      "summary": "The poll module is missing and the rate-observation module shifted upward.",
      "regions": [{
        "designParentFigmaNodeId": "123:module",
        "designPath": ["Fed Watch", "Rate observation"],
        "status": "matched",
        "actualParentSelector": ".rate-observation",
        "displacement": { "x": 0, "y": -375 },
        "confidence": 0.82,
        "reason": "The heading and internal structure establish module correspondence.",
        "source": "agent-verified",
        "anchorStats": {
          "candidateCount": 3,
          "stableCount": 2,
          "dynamicExcludedCount": 1,
          "structuralAnchorCount": 2,
          "inlierCount": 2,
          "residualPx": 0.6
        },
        "scoreBreakdown": {
          "anchorEvidenceApplied": true,
          "baseScoreCap": 0.82,
          "weightedScore": 0.8941,
          "finalScore": 0.82,
          "components": {
            "stabilityCoverage": { "value": 1, "weight": 0.25, "contribution": 0.25 },
            "anchorSufficiency": { "value": 0.6667, "weight": 0.2, "contribution": 0.1333 },
            "inlierRatio": { "value": 1, "weight": 0.3, "contribution": 0.3 },
            "residualQuality": { "value": 0.85, "weight": 0.15, "contribution": 0.1275 },
            "dynamicCleanliness": { "value": 0.6667, "weight": 0.05, "contribution": 0.0333 },
            "structuralSupport": { "value": 1, "weight": 0.05, "contribution": 0.05 }
          },
          "levelThresholds": { "highMin": 0.86, "mediumMin": 0.72, "lowMin": 0 }
        },
        "evidenceConfidence": {
          "score": 0.82,
          "level": "medium",
          "basis": ["visual-inference", "agent-hypothesis"],
          "reasons": ["The proposal passed candidate-set and module-boundary verification."]
        }
      }],
      "rejectedRegionCount": 1
    },
    "semanticAgent": {
      "invoked": true,
      "responded": true,
      "acceptedBindingCount": 1,
      "modules": [{
        "designModuleId": "123:module",
        "acceptedBindingCount": 1,
        "actualParentSelectors": [".rate-observation"],
        "dynamicFallback": {
          "evaluatedCount": 1,
          "acceptedCount": 0,
          "rejectedCount": 1,
          "decisions": [{
            "figmaNodeId": "123:price",
            "selector": ".rate-observation .price",
            "actualParentSelector": ".rate-observation",
            "result": "rejected",
            "reasonCode": "module_has_valid_agent_binding",
            "matched": false
          }]
        }
      }]
    },
    "diagnostics": ["Design-driven coverage: 3 design nodes and 5 actual elements were unmatched; unresolved correspondence enters the coverage ledger for verification."]
  },
  "dynamicNormalization": {
    "stableSimilarity": 0.9342,
    "dynamicRegionAreaRatio": 0.0185,
    "strategies": ["normalize-market-value-text"],
    "regions": [
      {
        "kind": "market-value",
        "strategy": "normalize-market-value-text",
        "figmaNodeId": "123:789",
        "fingerprintKey": "figma:123:789",
        "selector": "[data-figma-id=\"123:789\"]",
        "designBox": { "x": 100, "y": 120, "width": 160, "height": 32 },
        "actualBox": { "x": 100, "y": 120, "width": 160, "height": 32 },
        "sampleCount": 3,
        "evidenceConfidence": {
          "score": 0.97,
          "level": "high",
          "basis": ["exact-id", "temporal-consistency", "market-format"],
          "reasons": ["At least three samples prove that the element is stable while only its market-value text changes."]
        }
      }
    ]
  },
  "marketLists": {
    "matches": [
      {
        "figmaNodeId": "list:quotes",
        "selector": "#quotes",
        "header": {
          "figmaNodeId": "list:header",
          "selector": "#quotes > header",
          "expectedHeight": 28,
          "actualHeight": 28
        },
        "rowTemplate": {
          "figmaNodeId": "list:row",
          "expectedHeight": 44,
          "actualHeight": 44,
          "expectedGap": 4,
          "actualGap": 4
        },
        "expectedColumnCount": 3,
        "actualColumnCount": 3,
        "actualRowCount": 8,
        "rowSelectors": ["#quotes > .row:nth-of-type(1)"],
        "columns": [],
        "evidenceConfidence": {
          "score": 0.97,
          "level": "high",
          "basis": ["exact-id", "repeated-structure", "structure-geometry"],
          "reasons": ["The Figma hierarchy and repeated DOM rows jointly establish the list template."]
        }
      }
    ],
    "unresolved": []
  },
  "issues": [],
  "rules": {},
  "diagnostics": [],
  "aiAdvice": {
    "model": "vision-model",
    "summary": "...",
    "summaryEvidenceRefs": [
      "review-issue:issue-001",
      "page-alignment:2:rate-observation"
    ],
    "priorities": [
      {
        "title": "...",
        "reason": "...",
        "action": "...",
        "evidenceRefs": ["review-issue:issue-001"]
      }
    ]
  },
  "markdown": "# 视觉验收报告...",
  "reportHtml": "<!doctype html>..."
}
```

Advice generation or publication failure exposes a structured rejection. Complete failure omits `aiAdvice`; a later-batch failure may retain evidence-validated partial advice alongside `aiAdviceRejection`:

```json
{
  "aiAdviceRejection": {
    "code": "evidence_integrity_failed",
    "message": "AI advice was not published because an evidence reference could not be resolved: page-alignment:2:design-only.",
    "danglingRefs": ["page-alignment:2:design-only"],
    "locations": [
      {
        "scope": "priority",
        "priorityNumber": 1,
        "reason": "unresolved",
        "refs": ["page-alignment:2:design-only"]
      }
    ]
  }
}
```

`evidenceMode` is `live / screenshot / hybrid / long_screenshot`; insufficient ordinary Hybrid alignment returns `screenshot`. Long Screenshot exposes per-tile modes and degradation under `longScreenshot`. Hybrid reports additionally expose `alignment` with scale/translate, residual, and EvidenceConfidence. `matching.pageAlignment` is the structured business-module correspondence plan produced before element matching. Deterministic anchors use source `deterministic`; Agent proposals become `agent-verified` only after candidate-set, one-to-one boundary, and confidence verification. Bounded missing/uncertain child regions constrain their subtree; root-Frame uncertainty does not disable safe page-wide fallback. `matching.semanticAgent` records Agent invocation/response, the total accepted binding count, and module-scoped binding counts and dynamic-fallback decisions. Only the highest-geometry-score candidate is retained per design node so diagnostics do not grow with the candidate Cartesian product. `status` is the UI verdict `passed / failed / needs_review`, not asynchronous execution status. Errors mean failed; without errors, pending issues, unverified design/property coverage, unmatched actual-side items, or an empty coverage ledger mean needs_review; otherwise passed. `dynamicNormalization`, `marketVariants`, and `marketLists` are always present, with empty arrays when no corresponding evidence exists. Unreliable repetition is exposed through `marketLists.unresolved` and a `market_list_structure/pending` issue. `aiAdvice` exists only after evidence publication validation. A later ranking-batch failure may retain partial advice alongside `aiAdviceRejection`, not complete success. Batches hold at most 64 evidence entries and share a serial 60-second request budget including format repair. `summaryEvidenceRefs` and every priority's `evidenceRefs` must be non-empty and use `review-issue:<ReviewIssue.id>` or `page-alignment:<designParentFigmaNodeId>`; alignment refs must resolve to a verified `matched` region with an actual selector and verified displacement. If any ref cannot be resolved, the entire `aiAdvice` is omitted from JSON, Markdown, HTML, and XLSX, and `aiAdviceRejection` exposes the machine-readable reason. Its `code` is one of `ai_timeout`, `ai_format_error`, `ai_generation_failed`, or `evidence_integrity_failed`. Only evidence-integrity failures populate dangling references and locations; `priorityNumber` is one-based, `missing` means no refs were supplied, and `unresolved` means supplied refs could not be resolved. Diagnostics retain the human-readable failure as well. Accepted refs allow direct lookup of the final issue or verified alignment region in the same Review. Markdown issue/alignment tables retain the same keys, HTML refs link to their detail rows, and the XLSX Issues/Page Alignment worksheets expose identical indexes.

### Design coverage and review scope

`matching.matches[].method` is `exact-id / stable-text / structure-geometry / visual-inference / verified-region / verified-template`. Geometry grouping or a candidate alone does not certify correspondence. New reports share the public interface's `matching` fields; see the [field-level HTTP result contract](./PUBLIC_HTTP_API.md#921-设计覆盖与逐属性检查) and [design coverage safeguards](./DESIGN_COVERAGE.md) (Chinese).

- `designCoverage.items` includes every non-root design item, preserving original Figma IDs, parent IDs, types, and grouped identities. Correspondence `status` and `reviewStatus` are separate; matched does not mean style acceptance.
- `items[].checks` records every property/actual template instance's expected value, actual value, tolerance, status, reason, selector, and actual coordinates. Status is `passed / difference / pending / exempt / not-applicable / not-run`.
- `items[].absenceEvidence.layoutGap` and `items[].displacement` retain missing chains, affected regions, residuals, and explained/unverified displacement; partial absence cannot hide remaining offsets.
- `designCoverage.actualItems` retains actual content without reliable design correspondence as unverified, not automatically as an extra defect.
- `designCoverage.captureSamples[].coverage` retains original capture completeness and local limitations in actual-document coordinates. Missing metadata does not imply complete capture; old reports need a new run.
- `matching.visualScope` exposes `reviewedPixels / changedPixels / excludedPixels / canvasPixels`. Similarity describes only reviewed pixels and cannot override acceptance coverage gaps.

`matching.semanticAgent` separates `invoked / responded / acceptedBindingCount`. Retry or failure may add `execution: { status: "recovered" | "failed", attempts }`; each attempt records `round / durationMs / code` and optional controlled `causeCode`, never raw errors or credentials. Two verification rounds share one extra transport retry (at most three calls); timeout, format, or unknown failures are not retried. No response after invocation, or final execution failure, means incomplete structural review: zero missing candidates does not prove absence-free UI and does not fabricate blocking issues.

An individual `issues` entry:

```json
{
  "id": "issue-1",
  "category": "布局",
  "severity": "error",
  "priority": "P1",
  "title": "主按钮位置偏移",
  "summary": "元素位置偏移 8px，超过允许值 4px。",
  "expected": "x 100px · y 200px",
  "actual": "x 108px · y 200px",
  "suggestion": "检查 ...",
  "primaryAction": "检查 ...",
  "location": {
    "selector": "[data-figma-id=\"123:456\"]",
    "figmaNodeId": "123:456",
    "description": "Page region [data-figma-id=\"123:456\"]"
  },
  "selector": "[data-figma-id=\"123:456\"]",
  "figmaNodeId": "123:456",
  "evidenceConfidence": {
    "score": 0.99,
    "level": "high",
    "basis": ["exact-id"],
    "reasons": ["data-figma-id exactly matches the Figma node id."]
  },
  "box": { "x": 108, "y": 200, "width": 120, "height": 44 },
  "rule": "position",
  "evidence": [
    {
      "sourceIssueId": "issue-1",
      "rule": "position",
      "category": "Layout",
      "summary": "The element is offset by 8px, exceeding the 4px tolerance.",
      "expected": "x 100px · y 200px",
      "actual": "x 108px · y 200px",
      "evidenceConfidence": { "score": 0.99, "level": "high", "basis": ["exact-id"], "reasons": ["..."] }
    }
  ]
}
```

`priority` is `P0`, `P1`, `P2`, or `Pending`. Every ReviewIssue includes `evidenceConfidence`, `location`, `primaryAction`, and `evidence`; top-level expected/actual values may be absent, while the full low-level parameters remain traceable through `evidence`. Every non-root design item enters `matching.designCoverage`. Matching failure is not absence proof; unresolved items produce grouped `design_coverage_unverified/pending` issues. Complete multi-sample Live static-absence evidence can independently publish `missing_module/error`, without Agent or displacement prerequisites. Verified sibling displacement remains supplementary. Dynamic/ambiguous correspondence and incomplete relevant capture stay pending; AI prose never proves absence.

An `error`-severity `missing_module` is mandatory AI-advice evidence. If model ranking omits it, the server deterministically prepends its `review-issue:<id>` to `summaryEvidenceRefs` and adds a leading priority; title, reason, and action are still materialized only from that ReviewIssue. Pending coverage modules with `coverageModule: { id, name, nodeIds }` are also mandatory advice evidence, always retaining uncertainty. Module verification actions remain visible without AI.

`matching.pageAlignment.regions[].displacement` is no longer taken from the first observed anchor. With a multi-frame change summary, only anchors present in every frame with stable text, geometry, and style are eligible; known carousel, countdown, and live-market elements are excluded, while two or more stable heading, header, or container anchors take priority over ordinary stable content. Eligible anchors seek a strict-majority inlier set within `position_tolerance_px`, then publish the coordinate-wise median of those inliers. The field is omitted without majority consensus. Agent-proposed displacement is likewise re-estimated from at least two verified bindings under the same rules and removed when they do not agree. `evidenceConfidence.basis` includes `temporal-consistency` when multi-frame filtering is applied.

Every `matching.pageAlignment.regions[]` entry contains `anchorStats`: `candidateCount`, `stableCount`, `dynamicExcludedCount`, `structuralAnchorCount`, `inlierCount`, and `residualPx`. `residualPx` is the RMS residual of the best RANSAC inlier set against its median displacement and is `null` when no eligible anchor exists. These metrics calibrate the region's `evidenceConfidence.score`. `scoreBreakdown` records every component value, weight, contribution, weighted score, base cap, final score, and applied level thresholds; Markdown and HTML expose them under “Anchor stats” and “Score breakdown.”

When a trusted matched region in `matching.pageAlignment` explains the shared position offset of at least two elements, one module-level `position` ReviewIssue replaces those repeated rows while preserving every original finding in `evidence`. Local deviations and findings from other rules remain separate. If Agent-derived module evidence is below the high-confidence threshold, the aggregate is always `Pending`.

Embedding three PNGs can make the JSON response large. The UI removes `images`, `markdown`, and `reportHtml` from its **JSON result** export; API consumers can apply the same reduction before storing a report.

## Local report artifact downloads

Both comparison endpoints also return `artifacts.xlsx` and `artifacts.zip` metadata: `filename / contentType / sizeBytes / downloadUrl`.

- `GET /api/reports/{reportId}/artifacts/xlsx` downloads Excel.
- `GET /api/reports/{reportId}/artifacts/zip` downloads HTML, Markdown, compact JSON, the original diff PNG, and Excel as a ZIP.

Artifacts live in process memory for the latest 50 reports only. Restart or eviction returns `404` with `{ "error": "..." }`. These local-prototype routes have no authentication or URL signatures; shared deployments should use the tenant-scoped, signed `/v1` download boundary.

## Error response

Exceptions forwarded by comparison/model routes to the error middleware become HTTP `400`; explicit artifact-not-found responses remain `404`:

```json
{
  "error": "Human-readable error message"
}
```

This includes invalid parameters, upstream Figma/AI failures, navigation timeouts, and image parsing failures. There are no stable machine-readable error codes, so integrations should not branch on message text.

## Security

The API has no authentication or CSRF protection and allows the server-side browser to visit any HTTP/HTTPS URL. It is suitable only for use on a trusted local machine. Do not expose it to the public Internet or a shared network until URL/network validation, authentication, rate limiting, credential management, and browser isolation are implemented.
