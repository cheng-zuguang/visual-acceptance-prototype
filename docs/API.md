# HTTP API 参考

[简体中文](./API.md) | [English](./API.en.md)

开发环境的 API 默认位于 `http://127.0.0.1:4318`。Vite 会把浏览器中的 `/api` 与 `/demo` 请求代理到该地址。旧 `/api` 路由仍是无鉴权的本机原型；供其他服务调用时使用带服务鉴权的 `/v1` 路由。

公共 `/v1` 的字段级契约、五种证据模式、完整调用示例、状态模型、错误码和 Webhook 验签见 [公共 HTTP API 详细文档](./PUBLIC_HTTP_API.md)。本页保留公共接口速览和旧本机原型接口说明。

## 公共 Review API

`/v1` 支持 Live、Screenshot、Hybrid 和 Long Screenshot PagePair，可在一个异步 Review 中提交多页：

- `POST /v1/assets`、`GET /v1/assets/{assetId}`：需要 `assets:write`，创建截图资产并查询校验状态；
- `PUT /v1/assets/{assetId}/content?...`：使用短期 HMAC 上传地址，无需额外 Bearer Token；
- `POST /v1/reviews`：需要 `reviews:create`，返回 `202 Accepted`，支持 `Idempotency-Key`；
- `POST /v1/issue-rechecks`：提交一个 `pagePair` 和原 `issue`，异步核验指定问题；复用 Review 查询、取消和制品下载，详见[单问题复核](./PUBLIC_HTTP_API.md#19-单问题复核)；
- `GET /v1/reviews/{reviewId}`：需要 `reviews:read`，查询执行状态和验收结论；
- `GET /v1/reviews/{reviewId}/result`：获取不含 base64 图片的结构化结果；
- `GET /v1/reviews/{reviewId}/artifacts`：获取 Excel、整图和裁图元数据及短期签名下载地址；
- `GET /v1/reviews/{reviewId}/artifacts/{artifactId}?...`：使用签名地址下载，也保留同租户鉴权下载；
- `POST /v1/reviews/{reviewId}/cancel`：需要 `reviews:cancel`；
- `GET /v1/metrics`：需要 `metrics:read`，以 Prometheus 文本格式获取当前 Token 所属租户的 AI 建议累计指标、5m/15m 窗口计数与告警配置。

普通公共结果的 `pageResults[].pageEvidence` 返回 `designImage / actualImage / diffImage`，`issues[].designCrop / actualCrop` 返回问题裁图；均是带尺寸、SHA-256 和有效期的下载引用，JSON 不内嵌图片字节。需要 base64 时下载后编码。长图裁剪使用全页绝对位置，未知范围或缺失模块的实际裁图为 null；见[图片证据契约](./PUBLIC_HTTP_API.md#103-整图问题裁图与-base64-获取)。这组新增公共字段不改变下面本机 `/api/compare` 的 CompareReport 返回格式。

请求使用 `Authorization: Bearer <service-token>`。本地进程通过以下环境变量启用：

| 环境变量 | 说明 |
| --- | --- |
| `DIFFLAB_SERVICE_TOKEN` | 服务 Bearer Token；未设置时没有可用公共身份 |
| `DIFFLAB_TENANT_ID` | Token 所属租户，默认 `default` |
| `DIFFLAB_ALLOWED_H5_HOSTS` | 逗号分隔的 H5 精确域名白名单 |
| `DIFFLAB_ALLOWED_WEBHOOK_HOSTS` | 逗号分隔的 Webhook 精确域名白名单 |
| `DIFFLAB_FIGMA_CREDENTIAL_REF` | 请求允许引用的 Figma 凭据名 |
| `FIGMA_TOKEN` | 该凭据引用在本机解析到的 Token |
| `DIFFLAB_BROWSER_CREDENTIAL_REF` | 可选浏览器登录态凭据名 |
| `DIFFLAB_BROWSER_CREDENTIAL_JSON` | 服务端解析的 Headers/Cookies JSON；不会进入结果 |
| `DIFFLAB_SIGNING_SECRET` | 上传与下载短期地址的 HMAC 密钥 |
| `DIFFLAB_WEBHOOK_SECRET_REF` | 请求允许引用的 Webhook 密钥名 |
| `DIFFLAB_WEBHOOK_SECRET` | 服务端 Webhook HMAC 密钥 |
| `DIFFLAB_MAX_PAGES` | 单个 Review 最大 PagePair 数，默认 10 |
| `DIFFLAB_MAX_CONCURRENT_PAGES` | PagePair 最大并发数，默认 3 |
| `DIFFLAB_MAX_CONCURRENT_PAGE_PAIRS` | 全服务跨 Review 共享的 PagePair 并发预算，默认 8 |
| `DIFFLAB_MAX_CONCURRENT_REVIEWS` | 全服务同时运行的 Review 数，默认 5 |
| `DIFFLAB_MAX_CONCURRENT_REVIEWS_PER_TENANT` | 单租户同时运行的 Review 数，默认 2 |
| `DIFFLAB_MAX_QUEUED_REVIEWS` | 全服务最多排队的 Review 数，默认 100 |
| `DIFFLAB_MAX_QUEUED_REVIEWS_PER_TENANT` | 单租户最多排队的 Review 数，默认 20 |
| `DIFFLAB_REVIEW_SUBMISSIONS_PER_MINUTE` | 单租户每分钟最多提交的 Review 数，默认 60 |
| `DIFFLAB_CAPACITY_RETRY_AFTER_SECONDS` | 队列满载时 `Retry-After` 秒数，默认 5 |
| `DIFFLAB_AI_ALERT_MIN_ATTEMPTS` | 评估 AI 告警前的最小建议尝试数，默认 20 |
| `DIFFLAB_AI_TIMEOUT_ALERT_RATIO` | AI 超时率告警阈值，默认 0.2 |
| `DIFFLAB_AI_EVIDENCE_DANGLING_ALERT_RATIO` | AI 证据断链率告警阈值，默认 0.1 |
| `DIFFLAB_REVIEW_TIMEOUT_MS` | Review 总运行时限，默认 120000ms |
| `DIFFLAB_MAX_ASSET_BYTES` | 单个截图资产最大字节数，默认 25MiB |
| `DIFFLAB_MAX_IMAGE_PIXELS` | 单张截图最大像素数，默认 40000000 |
| `DIFFLAB_MAX_REVIEW_ASSET_BYTES` | 一个 Review 引用截图的总字节配额，默认 100MiB |
| `DIFFLAB_AI_ENABLED` | 可选；显式控制公共 Review 是否默认启用 AI |
| `OPENAI_API_KEY` | 公共 Review 的默认 AI Key；存在时默认启用 AI |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址；存在时默认启用 AI |
| `OPENAI_MODEL` | 公共 Review 的默认模型 |

Live 请求体：

```json
{
  "name": "行情首页",
  "locale": "zh-CN",
  "pagePairs": [{
    "clientPageId": "market-home",
    "pageName": "行情首页",
    "design": {
      "kind": "figma",
      "frameUrl": "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
      "credentialRef": "cred_figma"
    },
    "actual": {
      "kind": "live",
      "url": "https://h5.example.com/market"
    }
  }]
}
```

创建请求可选提供 `ai`。字段按字段覆盖服务端环境默认值；对象存在但省略 `requested` 时默认启用，`requested: false` 可对该 Review 禁用：

```json
{
  "ai": {
    "requested": true,
    "apiUrl": "http://127.0.0.1:11434/v1",
    "apiKey": "optional-local-key",
    "model": "optional-model"
  }
}
```

`apiKey` 仅为本地原型便利能力，不会进入状态、结构化结果或制品。共享网络部署应使用服务端配置或后续 tenant-scoped 密钥引用。

Long Screenshot 使用同一资产上传协议，但每个 PagePair 必须且只能引用一张长截图。`device.viewport.height` 是单屏 CSS 高度，不是长图总高度：

```json
{
  "actual": {
    "kind": "long_screenshot",
    "url": "https://h5.example.com/market",
    "browserCredentialRef": "cred_browser",
    "screenshotAssetIds": ["ast_..."],
    "crop": { "x": 0, "y": 132, "width": 1170, "height": 7200 },
    "anchors": [{
      "text": "行情",
      "role": "navigation",
      "confidence": 0.98,
      "box": { "x": 0, "y": 132, "width": 1170, "height": 132 }
    }],
    "device": {
      "platform": "iOS",
      "dpr": 3,
      "orientation": "portrait",
      "viewport": { "width": 390, "height": 844 }
    }
  }
}
```

可选 `url` 与 `browserCredentialRef` 会把长图审查升级为 Full-page Hybrid：上传长截图仍是正式视觉真值，服务在同一 H5 会话中按每个分片的 `scrollY` 采集多帧 DOM、computed styles 和动态证据；无法可靠对齐的分片单独降级为 Screenshot。可选 `crop` 使用原始图片像素坐标去除设备/浏览器边框；可选 `anchors` 接收上游 OCR/视觉适配器给出的原始图片坐标。长图结果包含 `effectiveMode`、`hybridTileCount`、逐片对齐状态、分片序号、滚动位置、绝对问题坐标、吸顶副本和截图质量异常。懒加载空白或拼接异常会把相关结论降为低置信/Pending；Excel 从整张设计图和实际图的绝对区域生成红框证据。

Screenshot/Hybrid 先通过 `POST /v1/assets` 声明 `filename`、`contentType`、`sizeBytes` 和 SHA-256，再把字节 PUT 到返回的 `uploadUrl`。资产成为 `ready` 后，在 PagePair 中引用：

```json
{
  "actual": {
    "kind": "hybrid",
    "url": "https://h5.example.com/market",
    "screenshotAssetIds": ["ast_..."],
    "browserCredentialRef": "cred_browser",
    "device": {
      "platform": "iOS",
      "dpr": 3,
      "orientation": "portrait",
      "viewport": { "width": 390, "height": 844 }
    }
  }
}
```

同租户、同 `Idempotency-Key`、同规范化请求内容会返回同一个 Review；相同 Key 配合不同内容返回 `409 IDEMPOTENCY_CONFLICT`。状态响应包含总页数、完成页数、当前阶段和每页状态。页面执行失败不会删除已完成页面的结果或 Excel。

创建请求可提供 `callback`，事件支持 `review.completed`、`review.failed` 和 `review.cancelled`。每次投递带 `X-DiffLab-Event-Id`、Unix 时间戳和 `v1=<hex-hmac>` 签名；签名内容为 `timestamp + "." + 原始 JSON body`。失败按有上限的指数退避重试，同一事件重试保持相同事件 ID，投递最终失败不改变 Review 状态。

公共 API 将执行状态表达为 `queued / running / succeeded / failed / cancelled`，将 UI 结论单独表达为 `passed / failed / needs_review`。允许域名会在提交、导航、重定向和子资源请求时重复做 DNS 检查；私网与保留地址会被拒绝。错误体固定包含 `code`、`message`、`retryable` 和 `requestId`。

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
| `actualMode` | string | 否 | `live / screenshot / hybrid / long_screenshot`；省略或未知值使用 `live` |
| `h5Url` | string | 按模式 | Live／Hybrid 必填；Screenshot 不使用；Long Screenshot 可选，提供后采集 H5 分片辅助证据 |
| `rulesYaml` | string | 否 | YAML 规则；空值使用默认规则 |
| `figmaUrl` | string | 是 | 含 `node-id` 的 Figma Frame URL |
| `figmaToken` | string | 否 | 空值回退到 `FIGMA_TOKEN`；二者必须有可用凭据 |
| `locale` | string | 否 | `zh-CN / en` |
| `screenshots` | file | 截图模式是 | 可重复的文件字段，最多 5 张，每张最大 25MiB；长截图必须且只能一张 |
| `screenshotDpr` | string | 否 | 正数设备像素比，默认 `1`；普通截图 CSS viewport 由图片像素尺寸除以 DPR 推导 |
| `screenshotPlatform` | string | 否 | 设备平台名称，默认 `uploaded` |
| `longScreenshotViewportHeight` | string | 长截图是 | 正数单屏 CSS 高度，不是长图总高度；宽度由图片宽度／DPR 推导 |
| `useAi` | string | 否 | 只有字符串 `"true"` 才启用 AI |
| `openaiKey` | string | 否 | 空值回退到 `OPENAI_API_KEY` |
| `openaiApiUrl` | string | 否 | 空值回退到 `OPENAI_BASE_URL` |
| `openaiModel` | string | 否 | 空值回退到 `OPENAI_MODEL` 和内置默认模型 |

Figma 请求示例：

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'h5Url=https://example.com/page' \
  -F 'figmaUrl=https://www.figma.com/design/FILE_KEY/Name?node-id=123-456' \
  -F 'figmaToken=YOUR_TOKEN' \
  -F 'rulesYaml=<acceptance.example.yaml'
```

注意使用 `<` 把 YAML 文件内容作为普通文本字段发送；YAML 不接受文件字段，图片使用 `screenshots` 文件字段。此本机接口直接接收图片，不使用 `/v1/assets` 上传协议，也不接受公共接口的 `crop / anchors / browserCredentialRef / screenshotAssetIds` 字段。

长截图示例（省略 `h5Url` 则仅使用上传图像）：

```bash
curl -X POST http://127.0.0.1:4318/api/compare \
  -F 'actualMode=long_screenshot' \
  -F 'figmaUrl=https://www.figma.com/design/FILE_KEY/Name?node-id=123-456' \
  -F 'screenshots=@/absolute/path/market-long.png' \
  -F 'screenshotDpr=3' \
  -F 'longScreenshotViewportHeight=844' \
  -F 'h5Url=https://example.com/page'
```

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
          "reasons": ["data-figma-id 与 Figma node id 完全一致。"]
        }
      }
    ],
    "unmatchedDesignCount": 3,
    "unmatchedActualCount": 5,
    "pageAlignment": {
      "summary": "开发页缺少投票模块，利率观察模块整体上移。",
      "regions": [{
        "designParentFigmaNodeId": "123:module",
        "designPath": ["美联储观察", "利率观察"],
        "status": "matched",
        "actualParentSelector": ".rate-observation",
        "displacement": { "x": 0, "y": -375 },
        "confidence": 0.82,
        "reason": "标题和内部结构共同确认模块对应。",
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
          "reasons": ["结构提案通过候选集和模块边界复核。"]
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
    "diagnostics": ["设计驱动覆盖：3 个设计节点未匹配，5 个开发元素未匹配；未确认对应关系进入覆盖清单及待核验。"]
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
          "reasons": ["至少三个样本共同证明元素稳定且只有行情数值文字变化。"]
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
          "reasons": ["Figma 层级与重复 DOM 行共同确认列表模板。"]
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

当 AI 建议生成或发布失败时，返回结构化拒绝信息。完全失败时 `aiAdvice` 不存在；后续批次失败时，通过证据门禁的部分建议可与 `aiAdviceRejection` 同时存在：

```json
{
  "aiAdviceRejection": {
    "code": "evidence_integrity_failed",
    "message": "AI 建议未发布：证据引用无法解析：page-alignment:2:design-only。",
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

`evidenceMode` 为 `live / screenshot / hybrid / long_screenshot`；普通 Hybrid 对齐不足时返回 `screenshot`；长图的逐片模式与降级见 `longScreenshot`。Hybrid 报告额外提供 `alignment`，包含 scale/translate、残差和 EvidenceConfidence。`matching.pageAlignment` 是元素匹配前形成的结构化页面模块对应计划：确定性锚点标记为 `deterministic`，AI 提案只有通过候选集、一对一模块边界和置信度复核后才标记为 `agent-verified`；有边界的缺失／不确定子区域约束该子树；根 Frame 的 `uncertain` 不会禁用全页安全兜底。`matching.semanticAgent` 记录 Agent 调用/响应、有效绑定总数，以及按顶层业务模块划分的绑定数和动态回退决策；每个设计节点只保留几何最接近候选，避免诊断随候选笛卡尔积膨胀。`status` 是 UI 结论 `passed / failed / needs_review`，不是异步执行状态；有 error 为 failed，无 error 但有 pending、未核验设计／属性、实际侧未对应项或空覆盖清单为 needs_review，否则 passed。`dynamicNormalization`、`marketVariants` 和 `marketLists` 始终存在；没有对应证据时数组为空。列表重复结构无法可靠确认时，详情进入 `marketLists.unresolved`，并产生 `market_list_structure/pending`。`aiAdvice` 仅在建议通过报告发布门禁时存在；后续排序批次失败可保留部分建议并同时返回 `aiAdviceRejection`，不代表完整成功。每批最多 64 条证据，串行共享 60 秒总请求预算，格式修复也计入。`summaryEvidenceRefs` 和每条建议的 `evidenceRefs` 必须非空，并使用 `review-issue:<ReviewIssue.id>` 或 `page-alignment:<designParentFigmaNodeId>`；后者只能指向带开发区域和经过验证位移的 `matched` 对齐结果。任一引用无法解析时，整段 `aiAdvice` 不进入 JSON、Markdown、HTML 或 XLSX，并通过 `aiAdviceRejection` 返回机器可读原因。`code` 可为 `ai_timeout`、`ai_format_error`、`ai_generation_failed` 或 `evidence_integrity_failed`；只有证据完整性失败会填写断链引用和位置，`priorityNumber` 从 1 开始，缺失引用用 `reason: "missing"`，无法解析用 `reason: "unresolved"`。诊断信息仍同步保留在 `diagnostics`。通过门禁的引用可直接反查当前 Review 中的最终问题或已验证模块对齐区域；Markdown 的问题与对齐表保留同名证据键，HTML 引用可点击跳转到对应明细行，XLSX 的“问题清单”和“页面结构对齐”工作表提供相同索引。

### 设计覆盖与审查范围

`matching.matches[].method` 可为 `exact-id / stable-text / structure-geometry / visual-inference / verified-region / verified-template`。几何分组或候选本身不证明对应关系。新报告的覆盖字段与公共接口的 `matching` 相同，字段级说明见 [公共 HTTP 结果契约](./PUBLIC_HTTP_API.md#921-设计覆盖与逐属性检查)，判断边界见 [设计覆盖契约](./DESIGN_COVERAGE.md)。

- `designCoverage.items`：全部非根设计项；保留原始 Figma ID、父 ID、类型与分组身份。对应关系 `status` 与审查结果 `reviewStatus` 分开；`matched` 不表示样式通过。
- `items[].checks`：逐属性、逐实际模板实例的设计值／实际值／容差／状态／原因及实际坐标；状态可为 `passed / difference / pending / exempt / not-applicable / not-run`。
- `items[].absenceEvidence.layoutGap` 与 `items[].displacement`：缺失证据链、影响区域、残差以及已解释／待核验位移；部分缺失不能隐藏剩余偏移。
- `designCoverage.actualItems`：无可靠设计对应的实际内容，保留待核验，不直接认定为额外缺陷。
- `designCoverage.captureSamples[].coverage`：原始采集完整性及局部限制；限制坐标为实际文档坐标，字段缺失不能推断完整采集。旧报告需重跑。
- `matching.visualScope`：`reviewedPixels / changedPixels / excludedPixels / canvasPixels`；相似度只描述可审查范围，不能绕过覆盖缺口判通过。

`matching.semanticAgent` 区分 `invoked / responded / acceptedBindingCount`。重试或失败时可增加 `execution: { status: "recovered" | "failed", attempts }`；每次尝试记录 `round / durationMs / code` 和可选受控 `causeCode`，不返回原始错误或凭据。两轮复核共用一次额外传输重试，最多三次调用；超时、格式或未知失败不重试。调用后无响应或最终失败意味着结构审查不完整，零缺失候选不能解释为“没有模块缺失”，也不会伪造阻断问题。

单条 `issues` 结构：

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
    "description": "页面区域 [data-figma-id=\"123:456\"]"
  },
  "selector": "[data-figma-id=\"123:456\"]",
  "figmaNodeId": "123:456",
  "evidenceConfidence": {
    "score": 0.99,
    "level": "high",
    "basis": ["exact-id"],
    "reasons": ["data-figma-id 与 Figma node id 完全一致。"]
  },
  "box": { "x": 108, "y": 200, "width": 120, "height": 44 },
  "rule": "position",
  "evidence": [
    {
      "sourceIssueId": "issue-1",
      "rule": "position",
      "category": "布局",
      "summary": "元素位置偏移 8px，超过允许值 4px。",
      "expected": "x 100px · y 200px",
      "actual": "x 108px · y 200px",
      "evidenceConfidence": { "score": 0.99, "level": "high", "basis": ["exact-id"], "reasons": ["..."] }
    }
  ]
}
```

`priority` 为 `P0`、`P1`、`P2` 或 `Pending`。`evidenceConfidence`、`location`、`primaryAction` 和 `evidence` 在每条 ReviewIssue 中必定存在；顶层设计值和实际值可能缺失，完整底层参数可从 `evidence` 追溯。全部非根设计项进入 `matching.designCoverage`。匹配失败不是缺失证明；未核验项产生分组 `design_coverage_unverified/pending`。完整多样本 Live 静态缺席证据可独立发布 `missing_module/error`，无需 Agent 或位移先决条件；稳定兄弟位移仍是补充证据路径。动态／歧义对应和不完整相关采集继续待核验，AI 自由文本不能证明缺失。

严重级别为 `error` 的 `missing_module` 是 AI 汇总的必选证据。即使模型排序结果漏选，服务端也会将其 `review-issue:<id>` 确定性补入 `summaryEvidenceRefs`，并在 `priorities` 首部增加对应证据项；最终标题、原因和动作仍只从该 ReviewIssue 物化。带 `coverageModule: { id, name, nodeIds }` 的 pending 覆盖模块同样为必选建议证据，但必须保留待核验措辞；不依赖 AI 也可查看模块核验动作。

`matching.pageAlignment.regions[].displacement` 不再取单个首遇锚点。存在多帧变化摘要时，只使用每帧存在且文字、几何、样式稳定的锚点，并排除轮播、倒计时、实时行情等已知动态元素；至少两个稳定标题、表头或容器锚点会优先于普通稳定内容。筛选后的锚点在 `position_tolerance_px` 内寻找严格多数内点，并对内点坐标取中位数；无多数共识时字段省略。Agent 提议的位移也会由至少两个已验证元素绑定按相同规则重新估计，无共识时删除模型位移。使用多帧筛选时 `evidenceConfidence.basis` 包含 `temporal-consistency`。

每个 `matching.pageAlignment.regions[]` 都包含 `anchorStats`：`candidateCount`、`stableCount`、`dynamicExcludedCount`、`structuralAnchorCount`、`inlierCount` 和 `residualPx`。`residualPx` 是最佳 RANSAC 内点集相对其中位位移的 RMS 残差；没有合格锚点时为 `null`。这些指标共同校准区域的 `evidenceConfidence.score`。`scoreBreakdown` 同时记录六项评分分量的原值、权重、贡献、加权分、基础上限、最终分及生效等级阈值；Markdown 与 HTML 报告分别在“锚点统计”和“评分分量”列展示。

若 `matching.pageAlignment` 中一个可信的已匹配模块能够解释至少两个元素的共同位置偏移，报告会用一条模块级 `position` ReviewIssue 替代这些重复项，原始元素差异仍完整保存在 `evidence`。与模块整体位移不一致的局部偏移及其他规则问题不会被合并；AI 模块证据低于高置信阈值时，聚合问题固定为 `Pending`。

内嵌三张 PNG 会使 JSON 响应较大。页面导出“JSON 结果”时会移除 `images`、`markdown` 和 `reportHtml`；API 使用方也可按相同方式精简存储。

## 本机报告制品下载

两个比对接口还返回 `artifacts.xlsx` 和 `artifacts.zip` 元数据：`filename / contentType / sizeBytes / downloadUrl`。下载路径分别为：

- `GET /api/reports/{reportId}/artifacts/xlsx`：下载 Excel；
- `GET /api/reports/{reportId}/artifacts/zip`：下载 HTML、Markdown、精简 JSON、原始差异 PNG 和 Excel 的 ZIP。

制品存于本进程内存，仅保留最近 50 个报告；重启或淘汰后返回 `404`，错误体为 `{ "error": "..." }`。这些路径无鉴权、无签名，仅用于本机原型；共享服务应使用 `/v1` 的租户隔离及签名下载边界。

## 旧 `/api` 原型接口错误响应

比对／模型等路由向错误中间件传递的异常转换为 HTTP `400`（制品不存在的显式 `404` 除外）：

```json
{
  "error": "可读的错误信息"
}
```

这包括参数错误、上游 Figma/AI 失败、页面导航超时和图片解析失败。当前没有稳定的机器错误码，集成方不应依赖错误文案做分支逻辑。

## 旧 `/api` 原型接口安全说明

API 没有认证或 CSRF 防护，并允许服务端浏览器访问任意 HTTP/HTTPS URL。它只适合在可信本机使用；在添加 URL 网络边界校验、认证、限流、凭据管理和隔离浏览器之前，不应暴露到公网或共享内网。
