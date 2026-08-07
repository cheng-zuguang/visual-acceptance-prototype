# HTTP API 参考

[简体中文](./API.md) | [English](./API.en.md)

开发环境的 API 默认位于 `http://127.0.0.1:4318`。Vite 会把浏览器中的 `/api` 与 `/demo` 请求代理到该地址。服务没有认证，所有错误目前统一返回 HTTP `400`。

## 健康检查

### `GET /api/health`

响应：

```json
{
  "ok": true,
  "prototype": true
}
```

## 默认规则

### `GET /api/default-rules`

返回 `text/yaml` 格式的默认验收规则。

```bash
curl http://127.0.0.1:4318/api/default-rules
```

## 获取 AI 模型列表

### `POST /api/ai/models`

请求类型为 `application/json`。

```json
{
  "apiKey": "optional-key",
  "apiUrl": "https://api.example.com/v1"
}
```

字段都可省略，此时分别回退到 `OPENAI_API_KEY` 和 `OPENAI_BASE_URL`。如果既没有 Key 也没有自定义 URL，请求会失败。

服务会把基础地址规范化为 `/models`；如果传入地址已经以 `/responses` 或 `/models` 结尾，则替换成 `/models`。请求使用 Bearer Token（如果存在）、30 秒超时且不跟随重定向。

兼容的上游响应可以是：

```json
{
  "data": [{ "id": "vision-model" }]
}
```

也可以使用顶层 `models` 数组。数组项可以是字符串，也可以在 `id`、`model` 或 `name` 字段中提供模型 id。

DiffLab 响应：

```json
{
  "models": ["vision-model"],
  "defaultModel": "gpt-5.6-terra"
}
```

## 执行真实比对

### `POST /api/compare`

请求类型为 `multipart/form-data`。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `h5Url` | string | 是 | 要截取的 HTTP/HTTPS 页面 |
| `rulesYaml` | string | 否 | YAML 规则；空值使用默认规则 |
| `designImage` | file | 二选一 | PNG/JPG/WebP 基准图，最大 25 MB |
| `figmaUrl` | string | 二选一 | 含 `node-id` 的 Figma Frame URL |
| `figmaToken` | string | Figma 模式需要 | 空值回退到 `FIGMA_TOKEN` |
| `useAi` | string | 否 | 只有字符串 `"true"` 才启用 AI |
| `openaiKey` | string | 否 | 空值回退到 `OPENAI_API_KEY` |
| `openaiApiUrl` | string | 否 | 空值回退到 `OPENAI_BASE_URL` |
| `openaiModel` | string | 否 | 空值回退到 `OPENAI_MODEL` 和内置默认模型 |

图片请求示例：

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'h5Url=https://example.com/page' \
  -F 'rulesYaml=<acceptance.example.yaml' \
  -F 'designImage=@reference.png;type=image/png'
```

Figma 请求示例：

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'h5Url=https://example.com/page' \
  -F 'figmaUrl=https://www.figma.com/design/FILE_KEY/Name?node-id=123-456' \
  -F 'figmaToken=YOUR_TOKEN' \
  -F 'rulesYaml=<acceptance.example.yaml'
```

注意使用 `<` 把 YAML 文件内容作为普通文本字段发送；`rulesYaml=@file` 会把它作为第二个上传文件，当前 Multer 配置会拒绝该请求。

## 执行内置样本

### `POST /api/demo-compare`

请求类型为 `application/json`。

```json
{
  "rulesYaml": "viewport: auto\n",
  "useAi": false,
  "openaiKey": "",
  "openaiApiUrl": "",
  "openaiModel": ""
}
```

这里的 `useAi` 是 JSON 布尔值，与 multipart 接口中的字符串不同。内置样本以 `1280 × 800` 采集基准页和差异页，并提供精确的 `data-figma-id` 映射。

最小请求：

```bash
curl -X POST http://127.0.0.1:4318/api/demo-compare \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## 比对响应

两个比对接口都返回 `CompareReport`。缩略示例：

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

`status` 只有 `passed` 和 `failed`；只要 `summary.errors > 0` 就是 `failed`。`aiAdvice` 仅在 AI 成功返回时存在。

单条 `issues` 结构：

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

除 `id`、`category`、`severity`、`title`、`summary`、`suggestion`、`rule` 外，其余问题字段可能缺失。

内嵌三张 PNG 会使 JSON 响应较大。页面导出“JSON 结果”时会移除 `images`、`markdown` 和 `reportHtml`；API 使用方也可按相同方式精简存储。

## 错误响应

所有路由错误当前都由同一中间件转换为 HTTP `400`：

```json
{
  "error": "可读的错误信息"
}
```

这包括参数错误、上游 Figma/AI 失败、页面导航超时和图片解析失败。当前没有稳定的机器错误码，集成方不应依赖错误文案做分支逻辑。

## 安全说明

API 没有认证或 CSRF 防护，并允许服务端浏览器访问任意 HTTP/HTTPS URL。它只适合在可信本机使用；在添加 URL 网络边界校验、认证、限流、凭据管理和隔离浏览器之前，不应暴露到公网或共享内网。
