# HTTP API Reference

[简体中文](./API.md) | [English](./API.en.md)

In development, the API defaults to `http://127.0.0.1:4318`. Vite proxies browser requests under `/api` and `/demo` to that address. The service has no authentication, and all errors currently return HTTP `400`.

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
| `h5Url` | string | Yes | HTTP/HTTPS page to capture |
| `rulesYaml` | string | No | YAML rules; empty uses defaults |
| `designImage` | file | One of two | PNG/JPG/WebP reference, maximum 25 MB |
| `figmaUrl` | string | One of two | Figma Frame URL containing `node-id` |
| `figmaToken` | string | In Figma mode | Empty falls back to `FIGMA_TOKEN` |
| `useAi` | string | No | Only the string `"true"` enables AI |
| `openaiKey` | string | No | Empty falls back to `OPENAI_API_KEY` |
| `openaiApiUrl` | string | No | Empty falls back to `OPENAI_BASE_URL` |
| `openaiModel` | string | No | Empty falls back to `OPENAI_MODEL`, then the built-in default |

Image example:

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'h5Url=https://example.com/page' \
  -F 'rulesYaml=<acceptance.example.en.yaml' \
  -F 'designImage=@reference.png;type=image/png'
```

Figma example:

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'h5Url=https://example.com/page' \
  -F 'figmaUrl=https://www.figma.com/design/FILE_KEY/Name?node-id=123-456' \
  -F 'figmaToken=YOUR_TOKEN' \
  -F 'rulesYaml=<acceptance.example.en.yaml'
```

Use `<` to send the YAML file contents as a normal text field. `rulesYaml=@file` sends it as a second uploaded file, which the current Multer configuration rejects.

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
  "summary": {
    "errors": 2,
    "warnings": 4,
    "pending": 1,
    "similarity": 0.9342,
    "matchedElements": 9
  },
  "viewport": { "width": 1280, "height": 800 },
  "source": {
    "design": "Figma · file name · 123:456",
    "h5": "https://example.com/page"
  },
  "images": {
    "reference": "data:image/png;base64,...",
    "actual": "data:image/png;base64,...",
    "diff": "data:image/png;base64,..."
  },
  "issues": [],
  "rules": {},
  "diagnostics": [],
  "aiAdvice": {
    "model": "vision-model",
    "summary": "...",
    "priorities": [
      { "title": "...", "reason": "...", "action": "..." }
    ]
  },
  "markdown": "# 视觉验收报告...",
  "reportHtml": "<!doctype html>..."
}
```

`status` is either `passed` or `failed`. It is `failed` whenever `summary.errors > 0`. `aiAdvice` exists only when AI returns successfully. The actual generated Markdown remains Chinese because the current report generator is Chinese-only.

An individual `issues` entry:

```json
{
  "id": "issue-1",
  "category": "布局",
  "severity": "error",
  "title": "主按钮位置偏移",
  "summary": "元素位置偏移 8px，超过允许值 4px。",
  "expected": "x 100px · y 200px",
  "actual": "x 108px · y 200px",
  "suggestion": "检查 ...",
  "selector": "[data-figma-id=\"123:456\"]",
  "figmaNodeId": "123:456",
  "confidence": 1,
  "box": { "x": 108, "y": 200, "width": 120, "height": 44 },
  "rule": "position"
}
```

Except for `id`, `category`, `severity`, `title`, `summary`, `suggestion`, and `rule`, issue fields may be absent.

Embedding three PNGs can make the JSON response large. The UI removes `images`, `markdown`, and `reportHtml` from its **JSON result** export; API consumers can apply the same reduction before storing a report.

## Error response

One middleware currently converts every route error to HTTP `400`:

```json
{
  "error": "Human-readable error message"
}
```

This includes invalid parameters, upstream Figma/AI failures, navigation timeouts, and image parsing failures. There are no stable machine-readable error codes, so integrations should not branch on message text.

## Security

The API has no authentication or CSRF protection and allows the server-side browser to visit any HTTP/HTTPS URL. It is suitable only for use on a trusted local machine. Do not expose it to the public Internet or a shared network until URL/network validation, authentication, rate limiting, credential management, and browser isolation are implemented.
