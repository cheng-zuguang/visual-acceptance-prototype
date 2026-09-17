# DiffLab 公共 HTTP API 详细文档

## Agent 降级与审查完整性

Review JSON 的 `matching.semanticAgent` 区分 `invoked`（已调用）、`responded`（至少一轮返回）和 `acceptedBindingCount`（已接受绑定）。发生重试或失败时，额外输出 `execution`：

```json
{"status":"failed","attempts":[{"round":1,"durationMs":1200,"code":"transport_error","causeCode":"UND_ERR_SOCKET"},{"round":1,"durationMs":900,"code":"transport_error"}]}
```

`status` 为 `recovered` 或 `failed`。每次调用的 `code` 为 `success`、`transport_error`、`timeout`、`format_error` 或 `generation_error`；`causeCode` 可选，仅保留受控传输错误码。不会返回原始错误响应或凭据。一次审查的两轮语义复核共用一次额外传输重试，最多三次调用；超时、格式错误和未知失败不重试。

`invoked=true && responded=false` 或 `execution.status=failed` 表示 AI 结构审查不完整，即使缺失候选为零也不能解释为“没有模块缺失”。AI 汇总成功不代表语义匹配成功。Review 的执行状态及确定性验收结论继续遵循原有契约，不因该状态伪造 `missing_module`。

本文档描述当前代码已经实现的 `/v1` 服务接口，面向研发平台、测试平台、CI 和其他后端服务。接口以异步 Review 为核心，同时支持 Live H5、设备截图、Screenshot + H5、长截图和 Long Screenshot + H5。

> 本文是可调用契约，不是未来设计草案。产品边界与后续规划见 [公共服务 API 设计](./PUBLIC_API_DESIGN.md)，MCP 接入见 [MCP 接入文档](./MCP.md)。旧 `/api/*` 原型接口见 [HTTP API 参考](./API.md)。

## 1. 基本信息

| 项目 | 当前值 |
| --- | --- |
| 默认 Base URL | `http://127.0.0.1:4318` |
| API 前缀 | `/v1` |
| 协议 | HTTP/HTTPS |
| 数据格式 | JSON；图片上传与图片／Excel 下载除外 |
| 字符编码 | UTF-8 |
| 鉴权 | `Authorization: Bearer <service-token>` |
| 契约版本字段 | `schemaVersion: "1.0"` |
| 任务模型 | 异步创建，轮询或 Webhook 获取完成状态 |

生产或共享环境应通过 HTTPS 暴露服务。下文示例使用：

```bash
export DIFFLAB_BASE_URL=http://127.0.0.1:4318
export DIFFLAB_TOKEN=your-service-token
```

## 2. 接口总览

| 方法 | 路径 | Scope | 用途 |
| --- | --- | --- | --- |
| `POST` | `/v1/assets` | `assets:write` | 声明一个待上传的截图资产 |
| `PUT` | `/v1/assets/{assetId}/content?expires=...&signature=...` | 签名 URL | 上传截图二进制内容 |
| `GET` | `/v1/assets/{assetId}` | `assets:write` | 查询截图资产状态 |
| `POST` | `/v1/reviews` | `reviews:create` | 创建异步 UI 走查 |
| `POST` | `/v1/issue-rechecks` | `reviews:create` | 创建单页面、单问题异步复核，查询与取消复用 Review 接口 |
| `GET` | `/v1/reviews/{reviewId}` | `reviews:read` | 查询执行状态、进度和验收结论 |
| `GET` | `/v1/reviews/{reviewId}/result` | `reviews:read` | 获取结构化走查结果 |
| `GET` | `/v1/reviews/{reviewId}/artifacts` | `reviews:read` | 获取制品清单及短期下载地址 |
| `GET` | `/v1/reviews/{reviewId}/artifacts/{artifactId}` | `reviews:read` 或签名 URL | 下载制品 |
| `POST` | `/v1/reviews/{reviewId}/cancel` | `reviews:cancel` | 取消排队中或运行中的走查 |
| `GET` | `/v1/metrics` | `metrics:read` | 获取当前租户的 Prometheus AI 建议指标和告警状态 |

当前 `/v1` 未实现 Review 列表、删除、原任务重启、能力发现、规则 Schema 或资产删除接口。指定问题的新一轮复核见第 19 节。

## 3. 推荐调用链路

### 3.1 Live H5

```text
POST /v1/reviews
        ↓ 202 + reviewId
GET /v1/reviews/{reviewId}        轮询至终态
        ↓
GET /v1/reviews/{reviewId}/result
GET /v1/reviews/{reviewId}/artifacts
```

### 3.2 Screenshot、Hybrid 或 Long Screenshot

```text
POST /v1/assets                   声明大小、类型和 SHA-256
        ↓ uploadUrl
PUT {uploadUrl}                   上传原始图片字节
        ↓ status=ready
POST /v1/reviews                  在 PagePair 中引用 assetId
        ↓ 202 + reviewId
GET /v1/reviews/{reviewId}        轮询至终态
        ↓
GET /v1/reviews/{reviewId}/result
GET /v1/reviews/{reviewId}/artifacts
```

只有状态为 `ready` 的资产能用于创建 Review。创建 Review 后，执行状态与 UI 验收结论是两个独立字段：

- `status=succeeded` 表示引擎执行完成；
- `verdict=passed` 才表示 UI 验收通过；
- `verdict=failed` 表示存在确定性的阻断差异；
- `verdict=needs_review` 表示存在需要人工确认的低置信结论。

## 4. 鉴权、租户和通用请求头

除签名上传、签名下载外，所有 `/v1` 请求必须携带：

```http
Authorization: Bearer your-service-token
```

Token 在服务端映射到租户和 Scope。请求体不能指定或覆盖 `tenantId`。资产、Review、幂等记录和鉴权下载都按租户隔离；访问其他租户的资源统一返回 `404 RESOURCE_NOT_FOUND`。

可用 Scope：

| Scope | 权限 |
| --- | --- |
| `assets:write` | 创建、上传和查询截图资产 |
| `reviews:create` | 创建 Review |
| `reviews:read` | 查询 Review、结果和制品，使用 Bearer Token 下载制品 |
| `reviews:cancel` | 取消 Review |
| `metrics:read` | 读取当前 Token 所属租户的监控指标 |

通用请求头：

| 请求头 | 必填 | 说明 |
| --- | --- | --- |
| `Authorization` | 是，签名 URL 除外 | Bearer 服务 Token |
| `Content-Type: application/json` | JSON 请求是 | 请求体格式 |
| `X-Request-Id` | 否 | 调用方提供的链路 ID；错误响应会回传，没有提供时服务生成 |
| `Idempotency-Key` | 创建 Review 时建议 | 最长 200 字符，作用域为当前租户 |

## 5. 公共数据模型

### 5.1 Review 状态

| 字段值 | 含义 | 是否终态 |
| --- | --- | --- |
| `queued` | 已接受，等待执行 | 否 |
| `running` | 正在读取 Figma、采集证据、比对或生成报告 | 否 |
| `succeeded` | 执行完成，可能是任意验收结论 | 是 |
| `failed` | Review 执行失败或至少一个 PagePair 执行失败 | 是 |
| `cancelled` | 已取消 | 是 |

PagePair 状态同样可为 `queued / running / succeeded / failed / cancelled`。当前 `stage` 常见值为 `queued / review / complete / failed / cancelled`；调用方应把它当作可扩展字符串展示，不应据此实现状态机。

### 5.2 验收结论

| `verdict` | 含义 |
| --- | --- |
| `passed` | 没有阻断问题、待确认问题或应审覆盖缺口 |
| `failed` | 至少存在一条确定性阻断问题 |
| `needs_review` | 没有确定性阻断问题，但存在 Pending、未验证设计项、待核验属性、实际侧未对应项，或覆盖清单为空 |

`queued`、`running`、`cancelled` 或没有形成有效结果的 `failed` Review 可能不包含 `verdict`。

### 5.3 Figma 设计来源

```json
{
  "kind": "figma",
  "frameUrl": "https://www.figma.com/design/FILE_KEY/Page?node-id=123-456",
  "credentialRef": "cred_figma"
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `kind` | string | 是 | 固定为 `figma` |
| `frameUrl` | string | 是 | 可访问的 Figma Frame URL，应包含目标 `node-id` |
| `credentialRef` | string | 是 | 服务端登记的 Figma 凭据引用，不是原始 Token |

Figma Access Token 不应直接进入请求、日志、结果或制品。

### 5.4 设备信息

Screenshot、Hybrid 和 Long Screenshot 都需要 `device`：

```json
{
  "platform": "iOS",
  "model": "iPhone 15 Pro",
  "osVersion": "18.0",
  "dpr": 3,
  "orientation": "portrait",
  "viewport": {
    "width": 390,
    "height": 844
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `platform` | string | 是 | 平台名称，如 `iOS`、`Android`、`HarmonyOS` |
| `model` | string | 否 | 设备型号 |
| `osVersion` | string | 否 | 操作系统版本 |
| `dpr` | number | 是 | 设备像素比 |
| `orientation` | string | 是 | `portrait` 或 `landscape` |
| `viewport.width` | number | 是 | CSS viewport 宽度 |
| `viewport.height` | number | 是 | 单屏 CSS viewport 高度；长截图中不是整图高度 |

图片原始像素与 CSS viewport 通过 DPR 和可选裁剪共同对齐。

### 5.5 裁剪与视觉锚点

可选 `crop` 用于先去除设备壳、浏览器栏或截图外框。坐标基于上传图片的原始像素：

```json
{
  "crop": { "x": 0, "y": 132, "width": 1170, "height": 2400 }
}
```

可选 `anchors` 由上游 OCR 或视觉适配器提供，坐标同样基于上传图片原始像素：

```json
{
  "anchors": [
    {
      "text": "行情",
      "role": "navigation",
      "confidence": 0.98,
      "box": { "x": 0, "y": 132, "width": 1170, "height": 132 }
    }
  ]
}
```

`text`、`role` 都是可选字段，建议至少提供一个以提高锚点可解释性；`confidence` 范围为 `0..1`；`box` 包含 `x / y / width / height`。对多张普通截图，PagePair 级 `crop`、`anchors` 和 `device` 会应用到该 PagePair 引用的每张图片。

### 5.6 EvidenceConfidence

匹配、长图判断和每条问题都使用可复现证据置信度：

```json
{
  "score": 0.97,
  "level": "high",
  "basis": ["exact-id", "temporal-consistency"],
  "reasons": ["Figma node id 与页面元素映射一致。"]
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `score` | number | `0..1` 的综合证据分数 |
| `level` | string | `high / medium / low` |
| `basis` | string[] | 参与判断的证据类型 |
| `reasons` | string[] | 可读解释 |

当前可能出现的 `basis` 包括：`verified-region`、`verified-template`、`exact-id`、`stable-text`、`structure-geometry`、`temporal-consistency`、`market-format`、`repeated-structure`、`geometric-alignment`、`agent-hypothesis`、`semantic-format`、`visual-inference`、`pixel-measurement` 和 `dom-audit`。

## 6. 截图资产接口

Live H5 不需要上传资产。Screenshot、Hybrid 和 Long Screenshot 先使用本节的两步协议上传图片。

### 6.1 声明截图资产

```http
POST /v1/assets
Authorization: Bearer <token>
Content-Type: application/json
```

请求体：

```json
{
  "kind": "actual-screenshot",
  "filename": "market-home.png",
  "contentType": "image/png",
  "sizeBytes": 2381940,
  "sha256": "7fd3f1c5c8c4c4be7c82d2ca0f35a8cd25c89d642e36186ad46d5624c7c9f82a"
}
```

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | --- | --- |
| `kind` | string | 是 | 固定为 `actual-screenshot` |
| `filename` | string | 是 | 仅文件名，不允许包含 `/` 或 `\\` |
| `contentType` | string | 是 | `image/png`、`image/jpeg` 或 `image/webp` |
| `sizeBytes` | integer | 是 | 大于 0；默认上限 25 MiB |
| `sha256` | string | 是 | 64 位小写或大写十六进制 SHA-256；服务会转为小写校验 |

成功响应：`201 Created`

```json
{
  "schemaVersion": "1.0",
  "assetId": "ast_5ba96f7db8574415b42d25be1fe3b767",
  "status": "awaiting_upload",
  "uploadUrl": "/v1/assets/ast_5ba96f7db8574415b42d25be1fe3b767/content?expires=1788912600000&signature=...",
  "expiresAt": "2026-09-09T10:50:00.000Z"
}
```

`uploadUrl` 是相对 Base URL 的短期地址，默认 10 分钟有效。

### 6.2 上传截图内容

```http
PUT {uploadUrl}
Content-Type: image/png

<原始图片字节>
```

此请求使用 URL 中的 `expires` 和 `signature` 鉴权，不需要 Bearer Token。`Content-Type`、字节数和 SHA-256 必须与声明完全一致。服务还会验证：

- 图片能够安全解码；
- 实际格式与 MIME 类型一致；
- 宽高有效；
- 总像素数不超过服务限制，默认 40,000,000。

成功响应：`200 OK`

```json
{
  "schemaVersion": "1.0",
  "assetId": "ast_5ba96f7db8574415b42d25be1fe3b767",
  "status": "ready",
  "filename": "market-home.png",
  "contentType": "image/png",
  "sizeBytes": 2381940,
  "sha256": "7fd3f1c5c8c4c4be7c82d2ca0f35a8cd25c89d642e36186ad46d5624c7c9f82a",
  "pixels": { "width": 1170, "height": 2532 }
}
```

上传校验失败后，资产进入 `rejected`，不能再次写入；需要重新声明一个资产。

### 6.3 查询资产

```http
GET /v1/assets/{assetId}
Authorization: Bearer <token>
```

成功响应：`200 OK`

```json
{
  "schemaVersion": "1.0",
  "assetId": "ast_5ba96f7db8574415b42d25be1fe3b767",
  "status": "ready",
  "filename": "market-home.png",
  "contentType": "image/png",
  "sizeBytes": 2381940,
  "pixels": { "width": 1170, "height": 2532 },
  "createdAt": "2026-09-09T10:40:00.000Z"
}
```

`status` 为 `awaiting_upload / ready / rejected`。当状态为 `rejected` 时，响应额外包含 `errorCode` 和 `errorMessage`。

### 6.4 上传命令示例

```bash
FILE=./market-home.png
SIZE=$(wc -c < "$FILE" | tr -d ' ')
SHA=$(shasum -a 256 "$FILE" | awk '{print $1}')

curl -sS -X POST "$DIFFLAB_BASE_URL/v1/assets" \
  -H "Authorization: Bearer $DIFFLAB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"actual-screenshot\",\"filename\":\"market-home.png\",\"contentType\":\"image/png\",\"sizeBytes\":$SIZE,\"sha256\":\"$SHA\"}"
```

从响应中读取 `uploadUrl` 后：

```bash
curl -sS -X PUT "$DIFFLAB_BASE_URL$UPLOAD_URL" \
  -H "Content-Type: image/png" \
  --data-binary @./market-home.png
```

## 7. 创建 Review

```http
POST /v1/reviews
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: release-2026-09-09-market-home
```

### 7.1 顶层请求字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | Review 名称，也用于报告文件名 |
| `locale` | string | 否 | `en` 使用英文；省略或其他值使用 `zh-CN` |
| `pagePairs` | PagePair[] | 是 | 至少一项，默认最多 10 项 |
| `ai` | AiOptions | 否 | 覆盖服务端 AI 默认配置 |
| `callback` | Callback | 否 | 终态 Webhook 配置 |

当前公共适配层不会消费 `rulesYaml`、`ruleset`、`ruleOverrides`、`clientReferenceId` 或 PagePair 级 `ai`；接入方不要依赖未知字段被保留或生效。

### 7.2 PagePair 公共字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `clientPageId` | string | 是 | 调用方定义的页面 ID；用于进度和结果关联 |
| `pageName` | string | 是 | 页面可读名称 |
| `design` | FigmaDesign | 是 | 一个 Figma Frame |
| `actual` | ActualSource | 是 | 一个目标页面状态的证据 |

当前按一对一 PagePair 审查：一个 Frame 对应一个目标页面状态和一个设备配置。一个 Review 可批量包含多个彼此独立的 PagePair。

### 7.3 ActualSource 类型

| `actual.kind` | 必填字段 | 可选字段 | 适用场景 |
| --- | --- | --- | --- |
| `live` | `url` | `browserCredentialRef` | H5 可访问，主要依赖浏览器截图、DOM 和 computed styles |
| `screenshot` | `screenshotAssetIds`、`device` | `crop`、`anchors` | H5 无法采集或实际设备/App 页面只有截图 |
| `hybrid` | `url`、`screenshotAssetIds`、`device` | `browserCredentialRef`、`crop`、`anchors` | 设备截图作为视觉事实，H5 提供 DOM、样式和动态证据 |
| `long_screenshot` | 恰好一个 `screenshotAssetIds`、`device` | `url`、`browserCredentialRef`、`crop`、`anchors` | 完整滚动页；有 URL 时升级为逐分片 Hybrid |

`browserCredentialRef` 必须引用服务端登记的 Headers/Cookies。请求中直接传 `headers`、`cookies` 或 `browserCredential` 会被拒绝。纯 Screenshot 不接受浏览器凭据。

### 7.4 Live H5 示例

```json
{
  "name": "行情首页 UI 走查",
  "locale": "zh-CN",
  "pagePairs": [
    {
      "clientPageId": "market-home",
      "pageName": "行情首页",
      "design": {
        "kind": "figma",
        "frameUrl": "https://www.figma.com/design/FILE_KEY/Market?node-id=123-456",
        "credentialRef": "cred_figma"
      },
      "actual": {
        "kind": "live",
        "url": "https://h5.example.com/market",
        "browserCredentialRef": "cred_h5_test"
      }
    }
  ]
}
```

### 7.5 Screenshot 示例

```json
{
  "name": "行情首页设备截图走查",
  "pagePairs": [
    {
      "clientPageId": "market-home-ios",
      "pageName": "行情首页 iOS",
      "design": {
        "kind": "figma",
        "frameUrl": "https://www.figma.com/design/FILE_KEY/Market?node-id=123-456",
        "credentialRef": "cred_figma"
      },
      "actual": {
        "kind": "screenshot",
        "screenshotAssetIds": ["ast_5ba96f7db8574415b42d25be1fe3b767"],
        "device": {
          "platform": "iOS",
          "model": "iPhone 15 Pro",
          "dpr": 3,
          "orientation": "portrait",
          "viewport": { "width": 390, "height": 844 }
        },
        "crop": { "x": 0, "y": 132, "width": 1170, "height": 2400 }
      }
    }
  ]
}
```

### 7.6 Screenshot + H5 Hybrid 示例

```json
{
  "name": "行情首页 Hybrid 走查",
  "pagePairs": [
    {
      "clientPageId": "market-home-hybrid",
      "pageName": "行情首页 Hybrid",
      "design": {
        "kind": "figma",
        "frameUrl": "https://www.figma.com/design/FILE_KEY/Market?node-id=123-456",
        "credentialRef": "cred_figma"
      },
      "actual": {
        "kind": "hybrid",
        "url": "https://h5.example.com/market",
        "browserCredentialRef": "cred_h5_test",
        "screenshotAssetIds": ["ast_5ba96f7db8574415b42d25be1fe3b767"],
        "device": {
          "platform": "iOS",
          "dpr": 3,
          "orientation": "portrait",
          "viewport": { "width": 390, "height": 844 }
        }
      }
    }
  ]
}
```

Hybrid 首先把设备截图与 H5 证据进行几何对齐。对齐证据不足时，当前 PagePair 会安全降级为 Screenshot，结果中出现：

```json
{
  "requestedEvidenceMode": "hybrid",
  "evidenceMode": "screenshot",
  "degradation": {
    "code": "HYBRID_ALIGNMENT_INSUFFICIENT",
    "message": "..."
  }
}
```

### 7.7 Long Screenshot 示例

```json
{
  "name": "行情长页走查",
  "pagePairs": [
    {
      "clientPageId": "market-long",
      "pageName": "行情长页",
      "design": {
        "kind": "figma",
        "frameUrl": "https://www.figma.com/design/FILE_KEY/Market?node-id=123-789",
        "credentialRef": "cred_figma"
      },
      "actual": {
        "kind": "long_screenshot",
        "screenshotAssetIds": ["ast_long_..."],
        "crop": { "x": 0, "y": 132, "width": 1170, "height": 7200 },
        "device": {
          "platform": "iOS",
          "dpr": 3,
          "orientation": "portrait",
          "viewport": { "width": 390, "height": 844 }
        }
      }
    }
  ]
}
```

服务按单屏 viewport 对长图分片。问题坐标使用整张页面的绝对坐标，并保留分片序号、`scrollY`、吸顶副本抑制信息和截图异常。

### 7.8 Long Screenshot + H5 示例

在上一示例的 `actual` 中增加：

```json
{
  "kind": "long_screenshot",
  "url": "https://h5.example.com/market",
  "browserCredentialRef": "cred_h5_test",
  "screenshotAssetIds": ["ast_long_..."],
  "device": {
    "platform": "iOS",
    "dpr": 3,
    "orientation": "portrait",
    "viewport": { "width": 390, "height": 844 }
  }
}
```

上传长图仍是正式视觉事实。服务在同一个浏览器会话中按照每个分片的 `scrollY` 采集多帧 H5 证据；不能可靠对齐的分片单独降级为 Screenshot，不影响其他分片继续使用 Hybrid。

### 7.9 AI 配置

```json
{
  "ai": {
    "requested": true,
    "apiUrl": "http://127.0.0.1:11434/v1",
    "apiKey": "optional-local-key",
    "model": "vision-model"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `requested` | boolean | 否 | `false` 禁用；对象存在且省略时视为 `true` |
| `apiUrl` | string | 否 | 覆盖服务端 OpenAI 兼容地址 |
| `apiKey` | string | 否 | 本地原型便利字段 |
| `model` | string | 否 | 覆盖服务端默认模型 |

覆盖优先级为“请求中的非空字段 > 服务端环境默认”。共享网络部署建议只传 `requested` 和 `model`，Key 由服务端管理。AI 只提出和解释假设，最终门禁由确定性验证器和规则引擎决定。

### 7.10 Callback 配置

```json
{
  "callback": {
    "url": "https://caller.example.com/hooks/difflab",
    "events": ["review.completed", "review.failed", "review.cancelled"],
    "secretRef": "cred_webhook_caller"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 是 | 服务端允许访问的 HTTP/HTTPS 回调 URL |
| `events` | string[] | 是 | 至少一个支持的事件；重复项会去重 |
| `secretRef` | string | 是 | 服务端登记的签名密钥引用 |

### 7.11 创建成功响应

成功响应：`202 Accepted`

```http
Location: /v1/reviews/rev_2ca8d371421249f397625ec570821e1f
X-Request-Id: req_f4c61d600f1b4742ac8be72236f7d7ad
```

```json
{
  "schemaVersion": "1.0",
  "reviewId": "rev_2ca8d371421249f397625ec570821e1f",
  "status": "queued",
  "createdAt": "2026-09-09T11:00:00.000Z",
  "statusUrl": "/v1/reviews/rev_2ca8d371421249f397625ec570821e1f",
  "resultUrl": "/v1/reviews/rev_2ca8d371421249f397625ec570821e1f/result",
  "artifactsUrl": "/v1/reviews/rev_2ca8d371421249f397625ec570821e1f/artifacts"
}
```

这些 URL 都是相对 Base URL 的路径。

### 7.12 幂等语义

建议每次业务提交提供稳定的 `Idempotency-Key`：

- 同一租户、同一 Key、相同规范化 JSON 请求体：返回原 Review，仍为 `202`，并设置 `Idempotency-Replayed: true`；
- 同一租户、同一 Key、不同请求体：返回 `409 IDEMPOTENCY_CONFLICT`；
- 不同租户可使用相同 Key；
- 数组顺序属于请求内容，JSON 对象字段顺序不影响请求哈希。

## 8. 查询 Review 状态

```http
GET /v1/reviews/{reviewId}
Authorization: Bearer <token>
```

运行中响应：`200 OK`

```json
{
  "schemaVersion": "1.0",
  "reviewId": "rev_2ca8d371421249f397625ec570821e1f",
  "name": "行情首页 UI 走查",
  "status": "running",
  "progress": {
    "totalPages": 2,
    "completedPages": 1,
    "currentStage": "review"
  },
  "pagePairs": [
    {
      "clientPageId": "market-home",
      "status": "succeeded",
      "stage": "complete",
      "verdict": "passed"
    },
    {
      "clientPageId": "market-detail",
      "status": "running",
      "stage": "review"
    }
  ],
  "createdAt": "2026-09-09T11:00:00.000Z",
  "updatedAt": "2026-09-09T11:00:08.000Z"
}
```

排队中的 Review 还会返回从 `1` 开始的 `queuePosition`。该值是瞬时观测值；租户公平调度可能使实际启动顺序发生变化，调用方不应把它当作稳定承诺。

终态响应会额外包含：

- `verdict`：聚合验收结论；
- `summary`：页面与问题统计；
- `error`：任务执行失败时的机器可读错误；
- `webhook`：已配置回调且开始投递后的投递状态。

`summary` 结构：

```json
{
  "totalPages": 2,
  "completedPages": 2,
  "executionFailedPages": 0,
  "passedPages": 1,
  "failedPages": 0,
  "needsReviewPages": 1,
  "issues": {
    "p0": 0,
    "p1": 1,
    "p2": 2,
    "pending": 1
  }
}
```

建议 1–3 秒轮询一次，并在进入 `succeeded / failed / cancelled` 后停止。`retryable=true` 只表示相同业务请求在外部条件恢复后可重试，不表示客户端应无上限立即重试。

## 9. 获取结构化结果

```http
GET /v1/reviews/{reviewId}/result
Authorization: Bearer <token>
```

只有形成 `BatchReviewResult` 且 Review 为 `succeeded` 或 `failed` 时返回 `200`。尚未完成或失败前未形成结果时返回 `409 REVIEW_NOT_READY`。

响应不包含 base64 图片、完整 HTML 或 Excel 字节，适合服务间 JSON 调用：

```json
{
  "schemaVersion": "1.0",
  "reviewId": "rev_2ca8d371421249f397625ec570821e1f",
  "status": "succeeded",
  "verdict": "needs_review",
  "summary": {
    "totalPages": 1,
    "completedPages": 1,
    "executionFailedPages": 0,
    "passedPages": 0,
    "failedPages": 0,
    "needsReviewPages": 1,
    "issues": { "p0": 0, "p1": 0, "p2": 1, "pending": 1 }
  },
  "pageResults": [
    {
      "clientPageId": "market-home",
      "pageName": "行情首页",
      "status": "succeeded",
      "verdict": "needs_review",
      "evidenceMode": "hybrid",
      "metrics": {
        "stablePixelSimilarity": 0.9821,
        "dynamicAreaRatio": 0.032,
        "matchedElements": 42,
        "unmatchedDesignElements": 3,
        "unmatchedActualElements": 5
      },
      "matching": {
        "matches": [],
        "unmatchedDesignCount": 3,
        "unmatchedActualCount": 5,
        "pageAlignment": {
          "summary": "开发页缺少投票模块，利率观察模块整体上移。",
          "regions": [],
          "rejectedRegionCount": 0
        },
        "diagnostics": []
      },
      "aiAdviceRejection": {
        "code": "ai_timeout",
        "message": "AI 建议生成失败：请求超时。",
        "danglingRefs": [],
        "locations": []
      },
      "issues": []
    }
  ],
  "artifactIds": ["art_excel"]
}
```

### 9.1 PageResult 字段

| 字段 | 类型 | 条件 | 说明 |
| --- | --- | --- | --- |
| `clientPageId` | string | 始终 | 原请求页面 ID |
| `pageName` | string | 始终 | 页面名称 |
| `status` | string | 始终 | `succeeded` 或 `failed` |
| `verdict` | string | 成功页 | `passed / failed / needs_review` |
| `error` | object | 失败页 | `code / message / retryable` |
| `requestedEvidenceMode` | string | 普通 Hybrid | 固定为 `hybrid` |
| `evidenceMode` | string | 有报告 | 实际采用的 `live / screenshot / hybrid / long_screenshot` |
| `degradation` | object | 普通 Hybrid 降级 | `HYBRID_ALIGNMENT_INSUFFICIENT` 及原因 |
| `longScreenshot` | object | 长截图 | 分片、异常、吸顶区域和逐片对齐结果 |
| `metrics` | object | 有报告 | 稳定像素相似度、动态区域占比和匹配数量 |
| `matching` | object | 有报告 | 对应关系、逐设计项覆盖、逐属性检查及可审查像素范围 |
| `aiAdviceRejection` | object | AI 建议被拒绝 | 机器可读的拒绝代码、断链引用及建议位置 |
| `issues` | ReviewIssue[] | 有报告 | 聚合后的可执行问题 |
| `pageEvidence` | object | 有报告 | `designImage / actualImage / diffImage` 的签名下载引用；不可用图为 `null`，见第 10.3 节 |

`aiAdviceRejection.code` 可为：

- `ai_timeout`：模型请求超时；
- `ai_format_error`：模型输出无法解析或不符合建议契约；
- `ai_generation_failed`：其他模型调用或生成失败；
- `evidence_integrity_failed`：建议引用缺失、断链或越过最终发布问题／已验证对齐证据边界。

前三类拒绝的 `danglingRefs` 和 `locations` 为空。证据完整性失败会在 `danglingRefs` 中列出去重后的断链引用，并在 `locations` 中指出错误位于汇总还是某条优先建议；`priorityNumber` 从 1 开始，`reason` 为 `missing` 或 `unresolved`。该可选字段是 `schemaVersion: "1.0"` 的向后兼容扩展。

当前 `GET /v1/reviews/{reviewId}/result`的 PageResult 不返回 `aiAdvice`、`dynamicNormalization`、`marketVariants`、`marketLists` 或完整 CompareReport。AI 建议可在 Excel 查看；本机 `/api/compare` 的 CompareReport 可返回 `aiAdvice`。汇总每批最多 64 条证据，串行共享 60 秒请求预算（含格式修复）；后续批次失败时，通过发布门禁的部分建议可与 `aiAdviceRejection` 同时出现在 CompareReport。未排序的强制缺失／模块待核验问题仍由确定性覆盖补入。部分排序不代表完整成功，也不改变验收结论。

### 9.2 Matching 字段

```json
{
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
      "evidenceConfidence": {
        "score": 0.82,
        "level": "medium",
        "basis": ["visual-inference", "agent-hypothesis"],
        "reasons": ["结构提案通过确定性复核。"]
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
  "diagnostics": ["对应关系未确认的设计项进入覆盖清单及待核验问题。"]
}
```

`method` 为 `exact-id / stable-text / structure-geometry / visual-inference / verified-region / verified-template`。当前采用设计驱动覆盖：全部非根 DesignTruth 项进入 `designCoverage.items`，不受匹配／Agent 候选上限影响。未匹配计数不是缺失证明；对应关系或采集范围未确认时生成分组 `design_coverage_unverified/pending`，不能静默忽略。几何／视觉候选本身不能认证存在，Live 中也不能据此直接发布未经验证对象的 CSS 整改问题。

完整多样本 Live 证据可通过静态标识缺席确定性发布 `missing_module`，无需 Agent 提案或位移先决条件；独立前后区域、稳定短标题缺席与移除高度／间隙残差可构成另一条缺失证据链。原 Agent 验证加稳定兄弟位移路径保留为补充证据。动态／歧义内容、截图视觉真值边界、截断／不透明／排除或相关内部滚动采集继续限制确定性缺失，AI 自由文本不能证明不存在。完整条件见 [设计覆盖契约](./DESIGN_COVERAGE.md)。

`pageAlignment` 在逐元素匹配前表达页面级业务模块对应。`status` 为 `matched / missing-in-actual / uncertain`；`source` 为 `deterministic / agent-verified`。只有 `matched` 可以携带 `actualParentSelector` 和可选 `displacement`；其他状态不会进入几何兜底。`rejectedRegionCount` 表示 AI 结构提案因未知候选、低置信、一对一冲突或自相矛盾而被确定性验证器拒绝的数量。该计划用于约束候选搜索和解释结果，不直接决定 `verdict`。

`semanticAgent` 用于解释 Agent 参与后匹配数量为何变化，不参与 `verdict`。`invoked / responded` 区分调用和有效响应；`acceptedBindingCount` 是通过确定性复核的绑定总数。`modules[]` 按根 Frame 下顶层设计模块分组，模块内记录有效绑定数、涉及的开发父容器，以及每个设计节点几何最接近候选的动态回退结果。

`reasonCode` 取值如下：

| 代码 | 含义 |
| --- | --- |
| `date_selector_unverified` | 日期字段缺少可靠对应，保留待核验 |
| `temporal_dynamic_verified` | 动态语义及至少三帧时序稳定性通过，且最终形成匹配 |
| `agent_unavailable_dynamic_semantics` | Agent 未返回，但确定性动态语义回退最终形成匹配 |
| `module_has_valid_agent_binding` | 当前设计模块或候选开发父容器已有有效 Agent 绑定，采用严格模式 |
| `design_semantics_not_dynamic` | Figma 名称、上下文和值类型不支持动态字段解释 |
| `insufficient_temporal_samples` | 少于三帧 |
| `temporal_evidence_missing` | 找不到候选元素的跨帧变化摘要 |
| `incomplete_temporal_presence` | 元素并非在至少三帧中完整存在 |
| `text_unchanged` | 跨帧文本没有变化，不能证明是动态值 |
| `geometry_changed` | 跨帧几何不稳定 |
| `style_changed` | 跨帧样式不稳定 |
| `verified_module_boundary` | 候选跨越已验证模块边界 |
| `geometry_confidence_below_threshold` | 动态证据通过，但几何匹配分低于阈值 |
| `one_to_one_conflict` | 候选通过回退资格，但在一对一选择中未成为最终匹配 |

`result: "accepted"` 必须同时满足 `matched: true`；未形成最终匹配的候选统一为 `rejected` 并给出对应代码。Long Screenshot 会合并分片统计并去重相同决策。

根 Frame 的 `uncertain` 仅为诊断，不构成全页几何兜底禁令；有边界的子区域不确定性仅约束该子树。

#### 9.2.1 设计覆盖与逐属性检查

以下字段随新 Review 的 `matching` 返回；可选字段缺失不能反推已完成核验。历史报告需重新采集／走查。

| 字段 | 说明 |
| --- | --- |
| `designCoverage.policy` | 固定为 `design-driven` |
| `designCoverage.captureSamples[]` | `index` 与原始采集完整性 `coverage`；不含图片字节 |
| `designCoverage.items[]` | 全部非根设计项：`figmaNodeId / parentFigmaNodeId / name / designBox / status / reasonCode / selector / issueIds` |
| `items[].nodeType / originalName / groupedParentFigmaNodeId` | 原始类型、名称与覆盖分组身份；几何分组不改写原始 Figma 身份，也不证明对应关系 |
| `items[].actualBox / coveredBy / tileIndex` | 可选实际范围、负责子树的最终问题 ID、长图分片序号 |
| `items[].reviewStatus` | `passed / difference / pending / not-applicable`，与对应关系 `status` 独立 |
| `items[].checks[]` | 每条属性／实际模板实例检查：`property / rule / selector / actualBox / status / reason`，可选 `expected / actual / tolerance`；状态为 `passed / difference / pending / exempt / not-applicable / not-run` |
| `items[].absenceEvidence` | `staticLabels / sampleIndexes`；可选 `layoutGap` 含 `precedingRegionId / followingRegionId / missingRegionIds / affectedRegionIds / expectedRemovalPx / measuredRemovalPx / residualPx` |
| `items[].displacement` | `x / y / explainedY / unexplainedY / causeIssueIds / causeStatus`；根因状态为 `verified / partial / pending`，部分解释不能抹掉剩余位移 |
| `designCoverage.actualItems[]` | 无可靠设计对应的实际内容：`selector / name / actualBox / status / reasonCode / issueIds`，可选 `coveredBy / tileIndex`；状态为 `unverified / covered-by-parent`，未对应不等于额外缺陷 |
| `visualScope` | `reviewedPixels / changedPixels / excludedPixels / canvasPixels`；相似度只描述可审查像素，不表示全页验收通过 |
| `missingModules` | 补充位移路径的 `evaluatedCount / publishedCount / candidates` 校准轨迹；不是全部缺失问题的唯一来源 |

`items[].status` 为 `matched / missing / unverified / covered-by-parent / structural-only`。`matched` 仅表示对应已确认，不表示样式通过；`covered-by-parent` 链接父问题，不表示子项通过；`structural-only` 仅确认包装结构存在已绑定子项。`reasonCode` 为 `verified-binding / scope-incomplete / correspondence-unresolved / static-module-absent / parent-finding / descendant-bindings`。

文字承载容器缺少独立文字布局证据时，文字几何／行高检查为 pending；模糊文字保留 pending；持续折叠且不能对应展开设计态的区域，其相关高度／下游纵向位置保留待核验，不自动点击展开。概率条依赖宽度仅在百分比声明、字段值和几何一致时豁免，其他属性继续审查。限制通过检查／问题表达，完整原始 Live DOM 状态及 `dynamicNormalization.geometry` 不由本接口单独返回。

`captureSamples[].coverage` 保留原始 `fullDocument` 等完整性结论。局部裁剪可增加 `documentBoundsComplete` 与 `limitations: [{ reason: "text-clipping" | "scroll-container", selector, box }]`，`box` 为实际文档坐标。有界叶文字裁剪或由可信结构对应证明不相关的受限范围，可按确定性规则局部排除；未知归属与相关内部滚动仍阻断缺失认证。缺少元数据不能视为完整采集；详见设计覆盖契约。

### 9.3 ReviewIssue 字段

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
  "suggestion": "检查容器 padding 和定位方式。",
  "primaryAction": "将按钮水平位置向左调整 8px。",
  "selector": "[data-figma-id=\"123:456\"]",
  "figmaNodeId": "123:456",
  "box": { "x": 108, "y": 200, "width": 120, "height": 44 },
  "rule": "position",
  "evidenceConfidence": {
    "score": 0.99,
    "level": "high",
    "basis": ["exact-id", "pixel-measurement"],
    "reasons": ["元素映射与像素测量一致。"]
  },
  "location": {
    "selector": "[data-figma-id=\"123:456\"]",
    "figmaNodeId": "123:456",
    "box": { "x": 108, "y": 200, "width": 120, "height": 44 },
    "description": "主内容区的主按钮"
  },
  "evidence": [
    {
      "sourceIssueId": "raw-issue-1",
      "rule": "position",
      "category": "布局",
      "summary": "元素位置偏移 8px。",
      "expected": "x 100px",
      "actual": "x 108px",
      "evidenceConfidence": {
        "score": 0.99,
        "level": "high",
        "basis": ["exact-id"],
        "reasons": ["元素映射明确。"]
      }
    }
  ]
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `severity` | string | `error / warning / pending / info` |
| `priority` | string | `P0 / P1 / P2 / Pending` |
| `location` | object | 面向人和报告的定位信息 |
| `primaryAction` | string | 首要修改建议 |
| `evidence` | array | 聚合前的底层差异证据，可用于追溯 |
| `dynamicStrategy` | string | 若问题涉及动态归一化，描述所用策略 |
| `coverageModule` | object | 可选 `{ id, name, nodeIds }`，保留原始 Figma 节点身份的模块核验分组 |
| `designCrop / actualCrop` | object 或 null | 本轮设计／实际裁图引用，带来源图片 ID 和像素裁剪框；无可靠范围或确定缺失的实际侧为 `null` |

`expected`、`actual`、`selector`、`figmaNodeId`、`box` 和 `dynamicStrategy` 可能省略。`evidenceConfidence`、`location`、`primaryAction` 和 `evidence` 始终存在。

`matching.pageAlignment.regions[].displacement` 由模块锚点的严格多数共识产生。存在多帧变化摘要时，仅允许每帧存在且文字、几何、样式稳定的锚点参与，并排除轮播、倒计时、实时行情等已知动态元素；至少两个稳定标题、表头或容器锚点会优先于普通稳定内容。系统使用 `position_tolerance_px` 选择内点，再对内点坐标取中位数；无多数共识时省略该字段。Agent 提议的位移会在至少两个元素绑定通过复核后按相同规则重算，无共识则删除模型位移。应用多帧筛选时，区域 `evidenceConfidence.basis` 会包含 `temporal-consistency`。

区域同时返回 `anchorStats` 和 `scoreBreakdown`。前者记录候选、稳定、动态排除、结构锚点、RANSAC 内点和残差；后者记录由 `page_alignment.confidence` YAML 配置生效的六项特征值、归一化权重、贡献、最终分和 H/M/L 阈值，可直接汇总为离线调参数据集。

当 `matching.pageAlignment` 中一个高可信 `matched` 模块的整体位移同时解释至少两个元素级 `position` 差异时，结果会输出一条模块级 `position` ReviewIssue；`selector` 和 `figmaNodeId` 指向模块，原始元素差异保留在 `evidence`。偏移残差超过 `position_tolerance_px` 的局部异常不会被合并。模块综合置信度低于 `page_alignment.confidence.levels.high_min` 时，模块问题降为 `pending / Pending`，不会成为 AI 驱动的阻断结论。

在补充的 Agent／兄弟位移路径中，当一个 `missing-in-actual` 模块拥有上下两侧同级、中高置信的稳定 `matched` 模块，且纵向位移阶跃在允许残差内解释 Figma 设计流缺口时，可输出 `rule: "missing_module"`。页首可改由顶部边界与后续模块等量上移验证；缺少普通邻区时可使用经时序稳定性、结构锚点共识和置信度复核的邻区回退。水平不重叠、残差过大、非同级、无位移或只有模型判断会拒绝该路径，但不否定独立静态覆盖证据。AI 建议只能通过 `review-issue:<id>` 引用最终缺失问题，不能引用原始缺失区域。

`severity: "error"` 的 `missing_module` 会被强制纳入 AI 汇总证据。若模型漏选，服务端会将其 `review-issue:<id>` 补入 `summaryEvidenceRefs` 并添加到 `priorities` 首部，保证公共结果不会因模型抽样而遗漏已验证的关键结构根因。

带 `coverageModule` 的 `design_coverage_unverified/pending` 问题也必须进入成功或部分成功的建议覆盖，只能使用待核验措辞，不能改写为确定缺失。模块核验动作在问题与报告中不依赖 AI 成功即可查看。对齐建议证据须为已验证 `matched`、有实际区域且有经过验证的位移；所有建议引用在报告发布边界再次校验。

### 9.4 长截图结果

长截图 PageResult 的 `longScreenshot` 可能包含：

```json
{
  "tiles": [
    { "index": 0, "scrollY": 0, "contentHeight": 844 },
    { "index": 1, "scrollY": 844, "contentHeight": 844 }
  ],
  "stickyRegions": [
    {
      "key": "header",
      "canonicalBox": { "x": 0, "y": 0, "width": 390, "height": 44 },
      "duplicateBoxes": [
        { "x": 0, "y": 844, "width": 390, "height": 44 }
      ]
    }
  ],
  "anomalies": [
    {
      "kind": "stitch-seam",
      "box": { "x": 0, "y": 840, "width": 390, "height": 8 },
      "confidencePenalty": 0.15,
      "description": "..."
    }
  ],
  "evidenceConfidence": {
    "score": 0.9,
    "level": "high",
    "basis": ["pixel-measurement"],
    "reasons": ["..."]
  },
  "effectiveMode": "hybrid",
  "hybridTileCount": 2,
  "tileAlignments": [
    {
      "tileIndex": 0,
      "effectiveMode": "hybrid",
      "alignment": {
        "anchorCount": 4,
        "transform": {
          "scaleX": 1,
          "scaleY": 1,
          "translateX": 0,
          "translateY": 0
        },
        "residualPx": 1.2,
        "evidenceConfidence": {
          "score": 0.96,
          "level": "high",
          "basis": ["geometric-alignment"],
          "reasons": ["..."]
        }
      }
    }
  ]
}
```

`effectiveMode`、`hybridTileCount` 和 `tileAlignments` 仅在提供 H5 URL 的长截图审查中出现。`anomalies.kind` 当前为 `lazy-load-blank` 或 `stitch-seam`。

长截图问题位置额外包含：

```json
{
  "location": {
    "description": "行情列表第 12 行",
    "longScreenshot": {
      "tileIndex": 3,
      "scrollY": 2532,
      "absoluteBox": { "x": 16, "y": 2890, "width": 358, "height": 44 }
    }
  }
}
```

`absoluteBox` 是完整长图/页面坐标，不是分片内坐标。

## 10. 获取与下载制品

### 10.1 列出制品

```http
GET /v1/reviews/{reviewId}/artifacts
Authorization: Bearer <token>
```

成功响应：`200 OK`

```json
{
  "schemaVersion": "1.0",
  "artifacts": [
    {
      "artifactId": "art_excel",
      "kind": "excel",
      "filename": "行情首页UI走查结果.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "sizeBytes": 168245,
      "downloadUrl": "/v1/reviews/rev_.../artifacts/art_excel?expires=1788913800000&signature=...",
      "expiresAt": "2026-09-09T11:10:00.000Z"
    }
  ]
}
```

除固定 ID 为 `art_excel` 的 Excel 制品外，现在还返回 `kind: "image"` 的整图与问题裁图。上例仅展示 Excel 条目；`artifactIds` 包含全部已生成的制品 ID，调用方不应依赖数组长度或图片 ID 命名方式。短期下载 URL 默认 10 分钟有效，每次查询结果或列出制品都会重新签发地址，图像内容及 SHA-256 不随签名刷新而变化。

### 10.2 下载制品

方式一，使用短期签名 URL，不需要 Bearer Token：

```bash
curl -fL "$DIFFLAB_BASE_URL$DOWNLOAD_URL" -o review.xlsx
```

方式二，使用同租户 Token：

```bash
curl -fL \
  -H "Authorization: Bearer $DIFFLAB_TOKEN" \
  "$DIFFLAB_BASE_URL/v1/reviews/$REVIEW_ID/artifacts/art_excel" \
  -o review.xlsx
```

成功响应带有相应 `Content-Type`（Excel 或 `image/png`）和 UTF-8 文件名的 `Content-Disposition: attachment`。

### 10.3 整图、问题裁图与 base64 获取

普通走查通过 `pageResults[].pageEvidence` 获取整图；通过 `pageResults[].issues[].designCrop / actualCrop` 获取该问题的两侧裁图。图片引用示例：

```json
{
  "artifactId": "crop_0_0_actualCrop",
  "kind": "image",
  "filename": "crop_0_0_actualCrop.png",
  "contentType": "image/png",
  "width": 60,
  "height": 30,
  "sizeBytes": 160,
  "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "sourceArtifactId": "image_0_actual",
  "box": { "x": 10, "y": 130, "width": 60, "height": 30 },
  "downloadUrl": "/v1/reviews/rev_example/artifacts/crop_0_0_actualCrop?expires=1789517400000&signature=example",
  "expiresAt": "2026-09-16T00:10:00.000Z"
}
```

- 整图引用具有相同的基础字段，不带 `sourceArtifactId / box`。`designImage`、`actualImage`、`diffImage` 分别是本轮报告的设计图、实际图和差异图；图像经过审查链路归一化，不保证与原始上传文件字节相同。
- 裁图是对应整图内未加标注的 PNG 区域。`box` 是 **sourceArtifactId 指向的整图像素坐标**；`width / height` 是裁图像素尺寸。报告中的原有 `designBox / actualBox / checks[].actualBox` 仍使用报告坐标，不能在倍率不同的整图上直接使用。
- 各侧坐标分别按其整图尺寸与报告 viewport 换算，再取整并限制在图像边界内。长图使用全页绝对位置，不把 `scrollY` 再减一次；原 issue 的 `location.longScreenshot` 仍保留。
- 未知／越界／零尺寸区域返回 `null`，不拿另一侧的框或整图冒充裁图。确定缺失模块没有实际裁图。无法解码的报告图片引用为 `null`，既有问题仍可读取。
- URL 相对 Base URL，支持签名直接下载或同租户 `reviews:read` Token 下载；篡改签名／资源拒绝，过期返回 `410`，刷新结果或制品清单重新获取 URL。跨租户用 Token 访问资源返回 `404`。
- JSON 不内嵌图片或 Buffer。需要 base64 时，管理端下载后编码即可，例如在 Node.js 中：

```javascript
const response = await fetch(new URL(image.downloadUrl, baseUrl));
if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
const base64 = Buffer.from(await response.arrayBuffer()).toString("base64");
const dataUrl = `data:${image.contentType};base64,${base64}`;
```

`clientPageId` 在同一个 Review 内必须唯一，避免页面证据关联歧义；重复值返回 `400 INVALID_REQUEST`。图片与制品仍在进程内保存，签名有效期不是持久化承诺，见第 17 节。

## 11. AI 建议监控与告警

```http
GET /v1/metrics
Authorization: Bearer <token-with-metrics:read>
```

响应采用 Prometheus `text/plain; version=0.0.4` 格式，只包含当前服务 Token 所属租户的数据。累计 counter 用于长期趋势，固定窗口 gauge 用于近期故障与跨实例聚合：

```text
ai_advice_attempts_total 40
ai_advice_rejections_total{code="ai_timeout"} 8
ai_advice_rejections_total{code="ai_format_error"} 1
ai_advice_rejections_total{code="ai_generation_failed"} 0
ai_advice_rejections_total{code="evidence_integrity_failed"} 3
ai_advice_evidence_dangling_attempts_total 2
ai_advice_window_attempts{window="5m"} 12
ai_advice_window_attempts{window="15m"} 31
ai_advice_window_rejections{window="5m",code="ai_timeout"} 4
ai_advice_window_rejections{window="15m",code="ai_timeout"} 7
ai_advice_window_evidence_dangling_attempts{window="5m"} 1
ai_advice_window_evidence_dangling_attempts{window="15m"} 2
ai_advice_timeout_ratio 0.2
ai_advice_evidence_dangling_ratio 0.05
ai_advice_alert_evaluation_ready 1
ai_advice_alert{type="timeout_rate"} 1
ai_advice_alert{type="evidence_dangling_rate"} 0
```

统计口径：

- 一页报告发布了 `aiAdvice` 或 `aiAdviceRejection`，计为一次 `ai_advice_attempts_total`；没有触发模型建议的页面不进入分母；
- `ai_advice_timeout_ratio` 为 `ai_timeout / attempts`；
- `ai_advice_evidence_dangling_ratio` 为“至少包含一个 `danglingRef` 的尝试数 / attempts”，按尝试计数而不是按引用数量计数；
- `ai_advice_evidence_dangling_attempts_total` 是上述证据断链尝试的累计 counter，供 Prometheus 生成可处理实例重启的时间窗口；
- `ai_advice_window_attempts`、`ai_advice_window_rejections` 和 `ai_advice_window_evidence_dangling_attempts` 是最近 `5m / 15m` 的本实例计数 gauge，固定窗口之外的事件会被清理；
- `ai_advice_alert_evaluation_ready` 只有达到最小样本数后才为 `1`；样本不足时所有 `ai_advice_alert` 都保持 `0`；
- 比率达到或超过服务端阈值时，对应 `ai_advice_alert{type}` 为 `1`。

本实例窗口 gauge、累计比例和 `ai_advice_alert` 保留用于单实例快速观察。生产告警从累计 counter 使用 `increase(...[5m|15m])` 生成窗口计数，因此能识别 Prometheus 已抓取到的 counter reset；随后先跨实例聚合分子与分母，再计算比率，不能对各实例比例求平均。仓库中的 [`monitoring/prometheus-ai-advice-alerts.yml`](../monitoring/prometheus-ai-advice-alerts.yml) 已提供：

- `increase()` 计算每个实例的 5m/15m attempts、按 code 的 rejections 和 dangling attempts；
- `sum without(instance, pod)` 聚合上述窗口增量；
- 聚合后的 5m/15m 超时率与证据断链率 recording rules；
- 5m 快速 warning 与 15m 持续 critical 告警；阈值和最小样本也按实例聚合，并通过 `job + difflab_tenant` 匹配回所属租户。
- `DiffLabAiAdviceMetricsScrapeDown` 使用 Prometheus 自身的 `up` 指标；任一已配置实例持续 2 分钟抓取失败时，按租户发出 critical。`up=1` 且业务 counter 不增长表示真实零流量，不会触发该告警。
- `DiffLabAiAdviceMetricsTargetAbsent` 消费预期目标清单生成的 `absent_over_time(up{...}[5m])` 记录；目标的 `up` 序列彻底消失并持续 2 分钟时，按 `job + difflab_tenant + difflab_target` 发出 critical。

仓库通过 `npm run test:prometheus` 依次运行 `promtool check rules` 和 `promtool test rules`。PromQL 测试覆盖多实例 counter reset、无流量、阈值相等边界、持续 `up=0` 和 `up` 序列完全缺失；GitHub Actions 会在推送到 `main` 或 Pull Request 时执行该入口。

指标不包含 Review ID、URL、问题 ID 或证据引用等高基数字段。需要多租户、多实例监控时，为每个固定服务身份配置一组抓取目标，并在 Prometheus 静态配置中添加受控的租户与稳定目标标签。每个目标使用独立 `static_config`，确保同租户的多个目标也能独立识别：

```yaml
scrape_configs:
  - job_name: difflab-ai-advice
    metrics_path: /v1/metrics
    authorization:
      credentials: tenant-a-metrics-token
    static_configs:
      - targets: [difflab-a-1:4318]
        labels:
          difflab_tenant: tenant-a
          difflab_metrics: ai-advice
          difflab_target: difflab-a-1
      - targets: [difflab-a-2:4318]
        labels:
          difflab_tenant: tenant-a
          difflab_metrics: ai-advice
          difflab_target: difflab-a-2
```

将 [`monitoring/prometheus-ai-advice-expected-targets.example.yml`](../monitoring/prometheus-ai-advice-expected-targets.example.yml) 复制到部署配置，列出与抓取配置一一对应的 `job / tenant / target`，再生成规则：

```bash
npm run generate:prometheus-target-rules -- \
  deploy/prometheus-ai-advice-expected-targets.yml \
  deploy/prometheus-ai-advice-expected-targets.rules.yml
```

把生成文件与 [`monitoring/prometheus-ai-advice-alerts.yml`](../monitoring/prometheus-ai-advice-alerts.yml) 同时加入 Prometheus 的 `rule_files`。生成器拒绝空清单、重复目标、未知字段和不安全标签字符；它为每个目标生成：

- `difflab_ai_advice_metrics_expected_target`：可查询的预期目标清单；
- `difflab_ai_advice_metrics_expected_target_absent`：固定目标选择器的 `absent_over_time(...[5m])` 结果。

`sum without(instance, pod)` 会保留受控的 `job` 和 `difflab_tenant` 标签。`ScrapeDown` 只保留 `job / difflab_tenant / difflab_metrics`；`TargetAbsent` 额外保留稳定的 `difflab_target`，不会携带 Kubernetes 服务发现标签。不要从 DiffLab 请求内容动态生成任何清单或 Prometheus 标签；同一租户的实例还应使用一致的告警阈值配置，不一致时 recording rule 采用较大值。

`up` 由 Prometheus 为已配置抓取目标生成，所以 `ScrapeDown` 覆盖“目标仍存在，但端点不可访问、鉴权失败或返回无效响应”。目标从服务发现或 Prometheus 配置中彻底删除后不再产生 `up=0`，外部预期清单仍保留其归属，并由 `TargetAbsent` 检测。目标最后一个 `up` 样本离开 5 分钟窗口后，告警还需持续满足 2 分钟，因此正常运行时最迟约 7 分钟触发；Prometheus 冷启动且目标从未出现时，缺席条件会立即成立，并在 2 分钟 `for` 后触发。

## 12. 取消 Review

```http
POST /v1/reviews/{reviewId}/cancel
Authorization: Bearer <token>
```

只有 `queued` 或 `running` Review 可取消。成功响应为 `200 OK`，结构与“查询 Review 状态”相同，其中：

```json
{
  "status": "cancelled",
  "progress": {
    "currentStage": "cancelled"
  }
}
```

尚未结束的 PagePair 会变为 `cancelled`；已经 `succeeded` 或 `failed` 的 PagePair 保留原状态。对终态 Review 再取消返回 `409 REVIEW_NOT_CANCELLABLE`。

## 13. Webhook

### 13.1 事件

| 事件 | 触发条件 |
| --- | --- |
| `review.completed` | Review 执行状态为 `succeeded` |
| `review.failed` | Review 执行状态为 `failed` |
| `review.cancelled` | Review 被取消 |

Webhook 投递失败不会修改 Review 的执行状态或验收结论。

### 13.2 请求头与请求体

```http
POST /hooks/difflab
Content-Type: application/json
X-DiffLab-Event-Id: evt_...
X-DiffLab-Timestamp: 1788922800
X-DiffLab-Signature: v1=<hex-hmac-sha256>
```

```json
{
  "eventId": "evt_...",
  "eventType": "review.completed",
  "occurredAt": "2026-09-09T11:00:12.000Z",
  "reviewId": "rev_...",
  "status": "succeeded",
  "verdict": "needs_review",
  "resultUrl": "/v1/reviews/rev_.../result"
}
```

`verdict` 仅在已经形成验收结论时出现。`resultUrl` 是相对 DiffLab Base URL 的路径，读取时仍需 `reviews:read` Token。

### 13.3 验签

签名原文为：

```text
X-DiffLab-Timestamp + "." + 原始 HTTP JSON body 字节
```

签名计算：

```text
expected = "v1=" + hex(HMAC-SHA256(webhookSecret, signaturePayload))
```

Node.js 验签示例：

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyDiffLabWebhook(input: {
  rawBody: Buffer;
  timestamp: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = `v1=${createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.rawBody.toString("utf8")}`)
    .digest("hex")}`;
  const actualBuffer = Buffer.from(input.signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}
```

接收方还应：

- 校验时间戳与当前时间的偏差，防止重放；
- 使用 `eventId` 去重；
- 验签前保留原始请求体，不要先解析再重新序列化；
- 成功处理后返回任意 `2xx`。

默认最多投递 4 次；失败后按约 1 秒、2 秒、4 秒的指数退避重试。相同事件的重试保持同一个 `eventId`。

## 14. 错误响应

所有同步 `/v1` 错误使用统一结构，并在响应头返回同一个 `X-Request-Id`：

```json
{
  "error": {
    "code": "ASSET_NOT_READY",
    "message": "Screenshot asset is not ready.",
    "retryable": true,
    "requestId": "req_..."
  }
}
```

`details` 仅在有补充信息时出现。

### 14.1 HTTP 错误码

| HTTP | `error.code` | 常见原因 | 建议处理 |
| --- | --- | --- | --- |
| 400 | `INVALID_REQUEST` | JSON、字段、AI、回调、设备或证据组合无效 | 修正请求，不自动重试 |
| 400/403 | `H5_ACCESS_DENIED` | URL 协议、Host 白名单、私网地址或 DNS 变化不允许 | 修改服务端白名单或目标地址 |
| 400 | `H5_NAVIGATION_FAILED` | H5 Host 无法解析 | 可退避重试 |
| 401 | `UNAUTHORIZED` | Bearer Token 缺失或无效 | 更新 Token |
| 403 | `FORBIDDEN` | Token 缺少接口所需 Scope | 调整服务身份权限 |
| 403 | `INVALID_SIGNATURE` | 上传/下载 URL 签名错误 | 重新获取签名 URL |
| 404 | `RESOURCE_NOT_FOUND` | 资产、Review、制品不存在或不属于当前租户 | 核对 ID 和租户 |
| 409 | `ASSET_NOT_READY` | 创建 Review 时截图尚未上传完成 | 等待资产 `ready` 后重试 |
| 409 | `ASSET_NOT_WRITABLE` | 已 ready/rejected 的资产被重复上传 | 重新声明资产 |
| 409 | `IDEMPOTENCY_CONFLICT` | 同一幂等 Key 对应不同请求体 | 更换 Key 或恢复原请求 |
| 409 | `REVIEW_NOT_READY` | 结果或制品尚不可读取 | 继续轮询状态 |
| 409 | `REVIEW_NOT_CANCELLABLE` | Review 已进入终态 | 不再取消 |
| 410 | `SIGNED_URL_EXPIRED` | 上传或下载 URL 已过期 | 重新声明资产或重新列出制品 |
| 413 | `REVIEW_QUOTA_EXCEEDED` | PagePair 数或引用资产总字节超限 | 拆分 Review 或压缩图片 |
| 429 | `REVIEW_CAPACITY_EXCEEDED` | 全局或租户 Review 等待队列已满 | 按 `Retry-After` 退避后重试，并复用原 `Idempotency-Key` |
| 429 | `REVIEW_RATE_LIMITED` | 单租户提交速率超过限制 | 按 `Retry-After` 退避后重试 |
| 422 | `UNSUPPORTED_ASSET` | 内容类型、大小、哈希、解码、格式或像素校验失败 | 重新生成并声明资产 |
| 500 | `INTERNAL_ERROR` | 服务内部或凭据解析错误 | 携带 `requestId` 排查，可退避重试 |

### 14.2 异步执行错误

异步错误通过 `GET /v1/reviews/{reviewId}` 或结果中的 PageResult 返回，不会改变已经发出的 `202`：

| `code` | 层级 | 含义 |
| --- | --- | --- |
| `PAGE_REVIEW_FAILED` | PagePair | Figma、采集、比对或报告生成失败 |
| `REVIEW_TIMEOUT` | Review | 超过总运行时限，默认 120 秒 |
| `INTERNAL_ERROR` | Review | 未分类执行错误 |

每个错误都带 `retryable`。批量 Review 中，一个页面失败不会删除其他已完成页面的结果；只要形成批量结果，仍可读取结构化结果和 Excel。

## 15. 服务端环境配置

当前本地简易部署通过环境变量登记一个服务身份及相关凭据：

| 环境变量 | 必填条件 | 说明 |
| --- | --- | --- |
| `DIFFLAB_SERVICE_TOKEN` | 使用 `/v1` 必填 | Bearer Token；未设置时没有可用公共身份 |
| `DIFFLAB_TENANT_ID` | 否 | Token 所属租户，默认 `default` |
| `DIFFLAB_FIGMA_CREDENTIAL_REF` | 创建 Review 必填 | 请求中允许使用的 Figma `credentialRef` |
| `FIGMA_TOKEN` | 创建 Review 必填 | 服务端实际 Figma Token |
| `DIFFLAB_ALLOWED_H5_HOSTS` | Live/Hybrid 必填 | 逗号分隔的精确 Host 白名单，不含协议和端口 |
| `DIFFLAB_BROWSER_CREDENTIAL_REF` | H5 需登录态时 | 请求中允许使用的浏览器凭据引用 |
| `DIFFLAB_BROWSER_CREDENTIAL_JSON` | H5 需登录态时 | `extraHTTPHeaders` 和/或 Playwright cookies JSON |
| `DIFFLAB_SIGNING_SECRET` | 建议必填 | 上传/下载 URL 的 HMAC 密钥；省略时进程启动时随机生成 |
| `DIFFLAB_ALLOWED_WEBHOOK_HOSTS` | 使用 Callback 时 | 逗号分隔的回调 Host 白名单 |
| `DIFFLAB_WEBHOOK_SECRET_REF` | 使用 Callback 时 | 请求中允许使用的 Webhook 密钥引用 |
| `DIFFLAB_WEBHOOK_SECRET` | 使用 Callback 时 | Webhook HMAC 密钥 |
| `DIFFLAB_MAX_PAGES` | 否 | 单 Review 最大 PagePair 数，默认 `10` |
| `DIFFLAB_MAX_CONCURRENT_PAGES` | 否 | PagePair 最大并发数，默认 `3` |
| `DIFFLAB_MAX_CONCURRENT_PAGE_PAIRS` | 否 | 全服务跨 Review 共享的 PagePair 并发预算，默认 `8` |
| `DIFFLAB_MAX_CONCURRENT_REVIEWS` | 否 | 全服务同时运行的 Review 数，默认 `5` |
| `DIFFLAB_MAX_CONCURRENT_REVIEWS_PER_TENANT` | 否 | 单租户同时运行的 Review 数，默认 `2` |
| `DIFFLAB_MAX_QUEUED_REVIEWS` | 否 | 全服务最多排队的 Review 数，默认 `100` |
| `DIFFLAB_MAX_QUEUED_REVIEWS_PER_TENANT` | 否 | 单租户最多排队的 Review 数，默认 `20` |
| `DIFFLAB_REVIEW_SUBMISSIONS_PER_MINUTE` | 否 | 单租户每分钟最多提交的 Review 数，默认 `60` |
| `DIFFLAB_CAPACITY_RETRY_AFTER_SECONDS` | 否 | 队列满载时返回的 `Retry-After` 秒数，默认 `5` |
| `DIFFLAB_REVIEW_TIMEOUT_MS` | 否 | Review 总运行时限，默认 `120000` |
| `DIFFLAB_AI_ALERT_MIN_ATTEMPTS` | 否 | AI 告警评估最小尝试数，默认 `20` |
| `DIFFLAB_AI_TIMEOUT_ALERT_RATIO` | 否 | AI 超时率告警阈值，默认 `0.2` |
| `DIFFLAB_AI_EVIDENCE_DANGLING_ALERT_RATIO` | 否 | AI 证据断链率告警阈值，默认 `0.1` |
| `DIFFLAB_MAX_ASSET_BYTES` | 否 | 单资产最大字节数，默认 `26214400` |
| `DIFFLAB_MAX_IMAGE_PIXELS` | 否 | 单图最大像素数，默认 `40000000` |
| `DIFFLAB_MAX_REVIEW_ASSET_BYTES` | 否 | 单 Review 引用资产总量，默认 `104857600` |
| `DIFFLAB_AI_ENABLED` | 否 | 公共 Review 是否默认启用 AI |
| `OPENAI_API_KEY` | AI 启用时 | 服务端 AI Key |
| `OPENAI_BASE_URL` | 否 | OpenAI 兼容 API 地址 |
| `OPENAI_MODEL` | 否 | 默认模型 ID |

浏览器凭据示例：

```json
{
  "extraHTTPHeaders": {
    "Authorization": "Bearer h5-session-token"
  },
  "cookies": [
    {
      "name": "session",
      "value": "...",
      "domain": "h5.example.com",
      "path": "/",
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ]
}
```

启动示例：

```bash
DIFFLAB_SERVICE_TOKEN=your-service-token \
DIFFLAB_TENANT_ID=team-a \
DIFFLAB_FIGMA_CREDENTIAL_REF=cred_figma \
FIGMA_TOKEN=figma-access-token \
DIFFLAB_ALLOWED_H5_HOSTS=h5.example.com \
DIFFLAB_SIGNING_SECRET=replace-with-a-long-random-secret \
npm run dev:server
```

## 16. 安全边界

- H5、跳转和子资源 URL 必须使用 HTTP/HTTPS、不能包含 URL 用户名或密码，并受精确 Host 白名单约束。
- 服务会解析目标 DNS 并拒绝私网、回环、链路本地、文档保留和组播地址；采集期间 DNS 结果变化也会被拒绝。
- Webhook 使用独立 Host 白名单和相同网络边界检查。
- 原始 Figma Token、浏览器 Headers/Cookies 和 Webhook Secret 只在服务端由引用解析，不进入公共结果。
- 资产上传和制品下载使用带用途、资源 ID 和到期时间的 HMAC 签名。
- Review 与问题复核共享租户提交速率、Review／PagePair 并发与有界队列；触发背压时返回 `429` 和 `Retry-After`。其他路由的网关限流、TLS、审计和密钥轮换由部署方配置。

## 17. 当前持久化限制

当前实现把资产、Review、幂等记录、Excel、图片制品和 Webhook 投递状态保存在单个服务进程内：

- 服务重启后，已有 `assetId`、`reviewId` 和签名下载资源不可继续使用；
- 不支持多实例共享任务或跨实例轮询；
- 不支持对象存储、持久化队列、历史列表或自动清理 API；
- 适合本地、单实例原型和受控集成验证，不应直接视为生产级持久化服务。

生产化时需要保持本文件的业务契约，同时把状态、二进制资产、幂等和任务执行迁移到租户隔离的持久化存储与队列。

## 18. 与 MCP 的关系

MCP `/mcp` 和 stdio Server 是 `/v1` 的薄适配层，复用相同 ReviewService 和服务 Token。目前 MCP 暴露：

| MCP Tool | 对应 HTTP 接口 |
| --- | --- |
| `review.create` | `POST /v1/reviews` |
| `review.get` | `GET /v1/reviews/{reviewId}` |
| `review.get_result` | `GET /v1/reviews/{reviewId}/result` |
| `review.list_artifacts` | `GET /v1/reviews/{reviewId}/artifacts` |

需要上传截图时，调用方目前先通过本文件描述的 HTTP 资产接口上传，再让 MCP `review.create` 的 `request` 引用 `assetId`。服务间固定编排优先直接调用 `/v1`；需要 Agent 自主选择和解释工具时使用 MCP。

## 19. 单问题复核

### 19.1 提交

`POST /v1/issue-rechecks` 使用 JSON、`reviews:create` Scope 和可选 `Idempotency-Key`。每次提交一个 PagePair 和一个 issue；页面的设计来源、最新实际来源需重新提供。支持现有 Live、Screenshot、Hybrid 和 Long Screenshot 输入，截图继续先上传 `/v1/assets`。这是异步 JSON 契约，不接受管理端旧提案中的 multipart `payload / targets`，也未增加 `/v1/judge`。

```json
{
  "name": "首页按钮圆角复核",
  "locale": "zh-CN",
  "pagePair": {
    "clientPageId": "home",
    "pageName": "首页",
    "design": {
      "kind": "figma",
      "frameUrl": "https://www.figma.com/design/FILE/page?node-id=1-1",
      "credentialRef": "cred_figma"
    },
    "actual": { "kind": "live", "url": "https://h5.example.com/home" }
  },
  "issue": {
    "issueId": 501,
    "rule": "decoration",
    "property": "borderRadius",
    "figmaNodeId": "1:2",
    "selector": ".submit-button"
  }
}
```

| 字段 | 约定 |
| --- | --- |
| `name / locale / ai / callback` | 与创建 Review 相同；AI 和回调仍按现有服务配置、安全边界执行 |
| `pagePair` | 单个标准 PagePair，注意是单数；Figma Frame 在 `design.frameUrl` 中 |
| `issue.issueId` | 管理端关联 ID，必填；非空字符串（最多 200 字符）或安全整数，结果原样回传 |
| `issue.rule` | 必填，当前 DiffLab 问题的真实 `rule`，最多 100 字符 |
| `issue.figmaNodeId` | 必填，具体元素／模块的真实 Figma ID，最多 200 字符，不要误用页面 Frame ID |
| `issue.property` | 可选，复核该规则下的一条属性；省略则检查该目标该规则下的全部适用属性；最多 1024 字符 |
| `issue.selector` | 可选历史定位提示，最多 1024 字符；本轮以经验证的 Figma 对应和测量为准，不因旧 selector 消失直接判修复 |

允许携带原 issue 的其他字段便于调用，但历史标题、expected／actual、bbox、开发反馈不参与通过判定，也不作为新测量返回。复核以本次提供的 Figma 和当前生效规则为准；调用方应保持原设计基准与规则配置一致，当前不支持指定历史规则版本或纯设计图片。

优先支持有逐属性测量记录的 `position / size / content / typography / alignment / color / decoration`，以及结构存在性 `missing_module`。例如圆角是 `rule: "decoration", property: "borderRadius"`，不是 `rule: "radius"`。其他规则可以提交，但无适用、可验证的检查记录时返回 `needs_review`，不会根据“本轮没报问题”判通过。规则和属性名称区分大小写。

成功提交返回 `202`，结构与第 7.11 节相同。继续调用返回的 `statusUrl / resultUrl / artifactsUrl`；取消仍使用 `POST /v1/reviews/{reviewId}/cancel`。相同租户／幂等键／请求（含操作类型）重放同一个执行，同时到达的重试也合并；内容或操作类型改变返回 `409 IDEMPOTENCY_CONFLICT`。新一轮实际复核应换新幂等键。

### 19.2 结果

复核的 `resultUrl` 返回 `mode: "issue_recheck"` 和只有一条的 `results`，不返回整页 `pageResults / metrics / verdict`。结构示意（图片引用采用第 10.3 节结构，下例省略引用的元数据）：

```json
{
  "schemaVersion": "1.0",
  "mode": "issue_recheck",
  "reviewId": "rev_example",
  "status": "succeeded",
  "clientPageId": "home",
  "pageName": "首页",
  "pageEvidence": {
    "designImage": { "artifactId": "image_0_reference", "downloadUrl": "/v1/reviews/rev_example/artifacts/image_0_reference?expires=1789517400000&signature=example" },
    "actualImage": { "artifactId": "image_0_actual", "downloadUrl": "/v1/reviews/rev_example/artifacts/image_0_actual?expires=1789517400000&signature=example" },
    "diffImage": { "artifactId": "image_0_diff", "downloadUrl": "/v1/reviews/rev_example/artifacts/image_0_diff?expires=1789517400000&signature=example" }
  },
  "results": [{
    "issueId": 501,
    "rule": "decoration",
    "property": "borderRadius",
    "figmaNodeId": "1:2",
    "selector": "button",
    "verdict": "passed",
    "reasonCode": "VERIFIED_FIXED",
    "message": "The target was verified and all applicable requested measurements passed.",
    "checks": [{
      "property": "borderRadius", "rule": "decoration", "selector": "button",
      "actualBox": { "x": 10, "y": 130, "width": 60, "height": 30 },
      "expected": 8, "actual": 8, "tolerance": 2, "status": "passed", "reason": "measured"
    }],
    "coverage": { "figmaNodeId": "1:2", "status": "matched", "reasonCode": "verified-binding", "selector": "button" },
    "evidenceRefs": [],
    "evidence": [],
    "designBox": { "x": 10, "y": 130, "width": 60, "height": 30 },
    "actualBox": { "x": 10, "y": 130, "width": 60, "height": 30 },
    "designCrop": { "artifactId": "crop_0_0_designCrop", "downloadUrl": "/v1/reviews/rev_example/artifacts/crop_0_0_designCrop?expires=1789517400000&signature=example" },
    "actualCrop": { "artifactId": "crop_0_0_actualCrop", "downloadUrl": "/v1/reviews/rev_example/artifacts/crop_0_0_actualCrop?expires=1789517400000&signature=example" }
  }],
  "artifactIds": ["art_excel", "image_0_reference", "image_0_actual", "image_0_diff", "crop_0_0_designCrop", "crop_0_0_actualCrop"]
}
```

| `reasonCode` | `verdict` | 含义 |
| --- | --- | --- |
| `VERIFIED_FIXED` | `passed` | 对象对应已验证，全部适用的指定属性检查通过 |
| `DIFFERENCE_REMAINS` | `failed` | 至少一条本轮指定测量仍有确定性差异 |
| `VERIFIED_PRESENT` | `passed` | 缺失问题的目标在本轮存在可信对应；仅核验存在性，不代表所有样式或子项通过 |
| `VERIFIED_ABSENT` | `failed` | 本轮正式 `missing_module/error` 证据仍证明目标缺失 |
| `TARGET_NOT_VERIFIED` | `needs_review` | 节点已删除／变更、未定位、对应不确定或存在多个覆盖条目，无法确认唯一目标 |
| `RULE_NOT_VERIFIED` | `needs_review` | 没有该规则／属性的适用测量，或设计未声明该约束 |
| `EVIDENCE_INSUFFICIENT` | `needs_review` | 无已确认差异，但检查包含 pending、豁免或未执行项，不能证明已修复 |
| `EXECUTION_FAILED` | `needs_review` | 页面采集／比较执行失败，附带 `error: { code, message, retryable }` |

结果中 `checks` 是本次测量，`coverage` 是本次目标对应摘要；`evidence` 为相关正式 ReviewIssue，`evidenceRefs` 中 `review-issue:<id>` 可在该数组解析，`design-coverage:<figmaNodeId>` 可在 `coverage` 解析。测量通过可直接由 checks 证明，引用数组可为空。`message` 仅作展示，分支判断使用枚举／原因码。

执行成功时，即使目标仍 `failed / needs_review`，任务 `status` 仍为 `succeeded`。状态查询的 `mode` 为 `issue_recheck`，其 `verdict` 及 summary 仅代表该目标复核：failed 目标计入 p1，待核验目标计入 pending，不携带其他问题统计。成功复核仍提供本轮图片和裁图；未能确认目标实际范围时实际裁图可为空。

页面执行失败且形成批量结果时，任务 `status=failed`，results 仍保留原 issueId；无图时 pageEvidence 各图为 null。若是任务总超时／取消等未形成结果的执行故障，沿用原状态／错误契约，result 返回 `409 REVIEW_NOT_READY`，不要将其解释为通过。

复核内部重新采集并运行共享比较链路，从中提取指定规则的结果，因此不是仅截取旧 bbox 的廉价图像检查。复核与普通 Review 共用租户鉴权、凭据引用、SSRF 检查、速率限制、队列、全局／租户 Review 和 PagePair 并发、运行时限及回调签名。复核 Excel 使用“问题复核／Issue Rechecks”和逐属性工作表，仅导出指定目标；整图／差异图仍展示完整页面，不能据此声称整页通过。当前 MCP 未增加复核创建工具；可直接使用本节 HTTP 接口。

## 设计覆盖兼容性

覆盖字段已纳入第 9.2.1 节，模块核验字段见第 9.3 节；各接口路径和 `schemaVersion: "1.0"` 不变。完整判定边界见 [设计覆盖契约](./DESIGN_COVERAGE.md)。旧保存报告必须重新采集／走查才能取得新增覆盖与状态证据，不能仅刷新旧 JSON 后推断已完成核验。
