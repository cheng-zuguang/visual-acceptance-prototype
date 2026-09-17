# DiffLab 公共服务 API 设计草案

> 状态：渐进实现中。任务 15–18 已实现安全异步调用、受控截图资产、批量幂等与签名 Webhook。
> 当前真实路由、配置和未实现边界以 [HTTP API 参考](./API.md) 为准。

## 1. 设计目标

公共接口用于让研发平台、测试平台、设计工具、CI 或其他内部服务调用同一套 UI 视觉走查能力。接口只暴露稳定的业务对象，不泄漏 Agent 内部轮次、提示词或具体模块结构。

核心原则：

- 走查核心只有一套：Web UI、公共 HTTP API、MCP 和未来 CLI 都调用 `ReviewService`；
- 使用版本化接口 `/v1`，不让调用方依赖当前原型路由；
- 走查通常包含浏览器采集和 AI 调用，公共接口默认采用异步任务模型；
- 一个任务可包含多个页面配对，每个页面配对仍是一对一比对；
- 大文件通过资产接口或受控对象存储传递，不内嵌在 JSON 中；
- 凭据通过服务端密钥引用传递，不把 Figma Token、Cookie 或 AI Key 写入任务和报告；
- 创建请求支持幂等，完成结果支持轮询和签名 Webhook；
- JSON 结果与 Excel、HTML、Markdown、局部截图等制品分离。

## 2. 服务边界

```text
外部调用方
├── Web UI
├── 研发/测试平台
├── CI
└── MCP Client
        ↓
Public API / MCP Adapter
        ↓
ReviewService
        ↓
DesignTruth + ActualEvidence + Dynamic Pipeline
        ↓
DeterministicOracle
        ↓
Result Store + Artifact Store
```

公共 API 不负责 Jira 流程、企微通知、开发整改状态和业务自动化测试。调用方可以在自己的流程中创建走查任务、查询结果或接收完成回调。

## 3. 资源模型

### 3.1 Review

一次走查任务，包含一个或多个 `PagePair`。

```text
Review
├── metadata
├── PagePair[]
├── effective rules
├── status
├── summary
└── Artifact[]
```

### 3.2 PagePair

一个 Figma Frame 与一个开发页面状态组成的一对一比对单元：

```text
PagePair
├── DesignSource
├── ActualSource
├── ViewportProfile
├── optional rule overrides
└── PageResult
```

### 3.3 Asset

用户上传的实际截图、长截图或其他受控文件。资产与任务分离，使用短期上传凭据和受限下载地址。

### 3.4 Artifact

服务生成的交付物：

- Excel 走查结果；
- JSON 机器结果；
- HTML 和 Markdown 报告；
- 设计图、实际图和差异图；
- 局部红框证据图；
- 可选诊断或浏览器 Trace。

## 4. API 总览

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/v1/assets` | 创建受控上传资产 |
| `GET` | `/v1/assets/{assetId}` | 查询资产状态和元数据 |
| `POST` | `/v1/reviews` | 创建走查任务 |
| `GET` | `/v1/reviews/{reviewId}` | 查询任务状态与摘要 |
| `GET` | `/v1/reviews/{reviewId}/result` | 获取结构化走查结果 |
| `GET` | `/v1/reviews/{reviewId}/artifacts` | 获取制品清单和短期下载地址 |
| `POST` | `/v1/reviews/{reviewId}/cancel` | 尝试取消尚未结束的任务 |
| `GET` | `/v1/capabilities` | 查询输入模式、规则版本和制品能力 |
| `GET` | `/v1/rule-schema` | 获取当前规则 JSON Schema 或 YAML 说明 |

当前已实现截图资产创建/查询与短期上传、Live/Screenshot/Hybrid 批量 Review、租户级幂等、页面进度、结果/Excel 短期下载、取消和签名 Webhook。当前资产、任务、幂等、制品和投递记录均为进程内实现；生产对象存储与持久化队列仍待补齐。

## 5. 鉴权与租户范围

所有 `/v1` 接口使用服务身份鉴权：

```http
Authorization: Bearer <service-token>
```

Token 至少包含以下范围之一：

- `reviews:create`
- `reviews:read`
- `reviews:cancel`
- `assets:write`
- `rules:read`

服务端根据 Token 确定租户与项目访问范围，调用方不能通过请求体覆盖租户标识。

Figma Token、H5 登录态、请求头或 Cookie 使用预先登记的 `credentialRef`：

```json
{
  "figmaCredentialRef": "cred_figma_design_team",
  "browserCredentialRef": "cred_h5_test_environment"
}
```

凭据内容不得写入日志、报告、Webhook 或 Agent 输入之外的持久化字段。

## 6. 上传实际截图

推荐使用两步上传，避免让 API 服务代理大文件。

### 6.1 创建资产

```http
POST /v1/assets
Content-Type: application/json
```

```json
{
  "kind": "actual-screenshot",
  "filename": "market-list-iphone15.png",
  "contentType": "image/png",
  "sizeBytes": 2381940,
  "sha256": "..."
}
```

响应：

```json
{
  "assetId": "ast_01J...",
  "status": "awaiting_upload",
  "uploadUrl": "https://storage.example/upload/...",
  "expiresAt": "2026-09-04T12:10:00Z"
}
```

上传完成后，服务校验文件类型、尺寸、哈希和图片可解码性。走查任务只能引用状态为 `ready` 的资产。

## 7. 创建走查任务

### 7.1 请求

```http
POST /v1/reviews
Content-Type: application/json
Idempotency-Key: 5ea2ba2d-9d22-4a5e-89a7-85965847e893
```

```json
{
  "name": "行情首页 UI 走查",
  "clientReferenceId": "release-2026-09-04-001",
  "locale": "zh-CN",
  "pagePairs": [
    {
      "clientPageId": "market-list",
      "pageName": "行情列表",
      "design": {
        "kind": "figma",
        "frameUrl": "https://www.figma.com/design/FILE_KEY/...?node-id=123-456",
        "credentialRef": "cred_figma_design_team"
      },
      "actual": {
        "kind": "hybrid",
        "url": "https://h5.example.com/market",
        "screenshotAssetIds": ["ast_01J..."],
        "browserCredentialRef": "cred_h5_test_environment",
        "device": {
          "platform": "iOS",
          "dpr": 3,
          "orientation": "portrait",
          "viewport": { "width": 390, "height": 844 }
        }
      },
      "viewport": {
        "width": 390,
        "height": 844,
        "deviceScaleFactor": 3
      },
      "ruleOverrides": {
        "scope": {
          "mode": "intersection_only"
        }
      }
    }
  ],
  "ruleset": {
    "id": "financial-h5-default",
    "version": "1.0.0"
  },
  "callback": {
    "url": "https://caller.example.com/hooks/difflab",
    "events": ["review.completed", "review.failed"],
    "secretRef": "cred_webhook_caller"
  }
}
```

`actual.kind` 支持：

- `live`：必须提供 `url`；
- `screenshot`：必须提供一个或多个 `screenshotAssetIds`；
- `hybrid`：同时提供 `url` 和截图资产；
- `long_screenshot`：提供且仅提供一个长截图资产，并携带目标设备 viewport 与 DPR；服务按 viewport 分片审查。可选提供 `url` 和 `browserCredentialRef`，使每个分片叠加同一 H5 会话中的多帧 DOM、样式和动态证据；逐片对齐失败时安全降级为 Screenshot。

### 7.2 响应

```http
HTTP/1.1 202 Accepted
Location: /v1/reviews/rev_01J...
```

```json
{
  "reviewId": "rev_01J...",
  "status": "queued",
  "createdAt": "2026-09-04T12:00:00Z",
  "statusUrl": "/v1/reviews/rev_01J...",
  "resultUrl": "/v1/reviews/rev_01J.../result",
  "artifactsUrl": "/v1/reviews/rev_01J.../artifacts"
}
```

同一租户、同一 `Idempotency-Key` 和相同请求体必须返回同一个任务；相同 Key 但请求体不同返回 `409 IDEMPOTENCY_CONFLICT`。

## 8. 任务状态

顶层状态：

```text
queued → running → succeeded
                 ↘ failed
queued/running → cancelling → cancelled
```

`succeeded` 表示走查任务成功执行完毕，不表示 UI 验收通过。验收结论在 `verdict` 中表达：

```text
verdict = passed | failed | needs_review
```

- `passed`：没有阻断问题；
- `failed`：存在确定性的阻断问题；
- `needs_review`：任务执行成功，但存在影响结论的低置信度或未解析区域。

批量任务中每个 `PagePair` 有独立状态和结论，顶层任务在所有页面结束后聚合。

### 8.1 查询状态

```http
GET /v1/reviews/rev_01J...
```

```json
{
  "reviewId": "rev_01J...",
  "name": "行情首页 UI 走查",
  "status": "running",
  "progress": {
    "totalPages": 3,
    "completedPages": 1,
    "currentStage": "dynamic_verification"
  },
  "pagePairs": [
    {
      "clientPageId": "market-list",
      "status": "succeeded",
      "verdict": "needs_review"
    },
    {
      "clientPageId": "market-detail",
      "status": "running"
    }
  ],
  "createdAt": "2026-09-04T12:00:00Z",
  "updatedAt": "2026-09-04T12:00:12Z"
}
```

## 9. 结构化结果

```http
GET /v1/reviews/rev_01J.../result
```

结果只返回结构化元数据和制品引用，不内嵌 base64 图片：

```json
{
  "schemaVersion": "1.0",
  "reviewId": "rev_01J...",
  "status": "succeeded",
  "verdict": "needs_review",
  "summary": {
    "pages": 3,
    "passedPages": 1,
    "failedPages": 1,
    "needsReviewPages": 1,
    "issues": {
      "p0": 0,
      "p1": 2,
      "p2": 7,
      "pending": 1
    }
  },
  "pageResults": [
    {
      "clientPageId": "market-list",
      "pageName": "行情列表",
      "verdict": "needs_review",
      "evidenceMode": "hybrid",
      "metrics": {
        "stablePixelSimilarity": 0.968,
        "dynamicStructureSimilarity": 0.942,
        "dynamicAreaRatio": 0.185,
        "unresolvedDynamicRegions": 1,
        "matchedElements": 42,
        "unmatchedDesignElements": 3,
        "unmatchedActualElements": 5
      },
      "matching": {
        "matches": [],
        "unmatchedDesignCount": 3,
        "unmatchedActualCount": 5,
        "diagnostics": ["交集覆盖率不足，建议检查页面状态或补充稳定标识。"]
      },
      "issues": [
        {
          "issueId": "iss_01J...",
          "priority": "P1",
          "category": "layout",
          "title": "行情列表价格列向右偏移",
          "location": "行情列表 / 最新价列",
          "expected": "列左边界 x=214px",
          "actual": "列左边界 x=222px",
          "suggestion": "将最新价列整体向左调整 8px。",
          "rule": "alignment",
          "evidenceConfidence": {
            "score": 0.95,
            "level": "high",
            "basis": ["structure-geometry"],
            "reasons": ["多帧 DOM 指纹、Figma 结构和几何位置稳定一致。"]
          },
          "figmaNodeId": "123:456",
          "artifactIds": ["art_design_crop", "art_actual_crop"]
        }
      ]
    }
  ],
  "artifactIds": ["art_excel", "art_html", "art_json"]
}
```

## 10. 制品

```http
GET /v1/reviews/rev_01J.../artifacts
```

```json
{
  "artifacts": [
    {
      "artifactId": "art_excel",
      "kind": "excel",
      "filename": "行情首页UI走查结果.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "sizeBytes": 931224,
      "downloadUrl": "https://storage.example/download/...",
      "expiresAt": "2026-09-04T12:20:00Z"
    }
  ]
}
```

当前进程内实现已返回 HMAC 短期签名下载地址，同时保留同租户 `reviews:read` 鉴权下载。生产对象存储、跨实例签名与制品保留策略尚未实现。

## 11. Webhook

事件：

- `review.completed`
- `review.failed`
- `review.cancelled`

示例：

```json
{
  "eventId": "evt_01J...",
  "eventType": "review.completed",
  "occurredAt": "2026-09-04T12:00:18Z",
  "reviewId": "rev_01J...",
  "status": "succeeded",
  "verdict": "needs_review",
  "resultUrl": "/v1/reviews/rev_01J.../result"
}
```

Webhook 使用时间戳和 HMAC 签名，例如：

```http
X-DiffLab-Event-Id: evt_01J...
X-DiffLab-Timestamp: 1788494418
X-DiffLab-Signature: v1=<hex-hmac>
```

接收方通过 `eventId` 去重。服务采用指数退避重试，并记录每次投递结果；Webhook 失败不改变走查任务状态。

## 12. 错误模型

公共接口使用稳定机器错误码：

```json
{
  "error": {
    "code": "FIGMA_ACCESS_DENIED",
    "message": "无法读取指定的 Figma Frame。",
    "retryable": false,
    "requestId": "req_01J...",
    "details": {
      "clientPageId": "market-list"
    }
  }
}
```

基础错误码至少包括：

- `INVALID_REQUEST`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `IDEMPOTENCY_CONFLICT`
- `REVIEW_QUOTA_EXCEEDED`
- `ASSET_NOT_READY`
- `UNSUPPORTED_ASSET`
- `SIGNED_URL_EXPIRED`
- `INVALID_SIGNATURE`
- `FIGMA_ACCESS_DENIED`
- `FIGMA_RATE_LIMITED`
- `H5_NAVIGATION_FAILED`
- `H5_ACCESS_DENIED`
- `SCREENSHOT_ALIGNMENT_FAILED`
- `REVIEW_TIMEOUT`
- `RATE_LIMITED`
- `INTERNAL_ERROR`

HTTP 状态码表示 API 请求或服务执行状态；UI 验收不通过仍然是成功的 `200` 结果，其 `verdict` 为 `failed`。

## 13. 版本兼容

- 主版本通过 URL 表达：`/v1`；
- 响应包含 `schemaVersion`；
- 同一主版本内只做向后兼容的字段新增；
- 调用方必须忽略未知字段；
- 枚举新增需要提前记录在变更日志中；
- 破坏性变更通过 `/v2` 发布，并提供迁移窗口；
- 规则 Schema 与 API Schema 分别版本化。

正式实现应发布 OpenAPI 文档，并以契约测试验证服务实现与 Schema 一致。

## 14. 安全与资源边界

公共部署前必须具备：

- 租户、项目和资产隔离；
- API Token 轮换、作用域和吊销；
- Figma、浏览器登录态和 AI 凭据的密钥托管；
- H5 URL 域名白名单或项目级访问策略；
- 对 DNS 重绑定、内网地址、重定向目标进行校验；
- 浏览器任务隔离和任务结束后的上下文销毁；
- 图片类型、尺寸、像素总量和压缩炸弹防护；
- 请求体、页面数、并发数、运行时长和制品保留期限制；
- 日志、Agent 输入和报告中的 Token、Cookie 与个人信息脱敏；
- 完整审计日志和 `requestId`/`reviewId` 关联。

旧 `/api/compare` 没有这些边界，不能直接作为公共接口暴露。新 `/v1` 已实现服务 Token/作用域、租户隔离、资产校验、精确 H5/Webhook 域名白名单、逐请求 DNS 复验、私网/保留地址阻断、幂等批量、资源配额、进程内短期签名 URL 和 Webhook HMAC；持久化队列、调用频率限流、对象存储、生产密钥托管和完整审计仍是生产部署前置项。

## 15. 可观测性

每个请求和任务至少记录：

- `requestId`
- `reviewId`
- 调用方 `clientReferenceId`
- 页面总数及各页面阶段
- Figma、采集、动态分析、AI、比对和报告耗时
- Agent 调用次数和重试原因
- 页面结果与制品生成状态
- 可重试/不可重试错误码

指标需要支持统计成功率、平均/P95 时延、队列等待、页面吞吐量、动态识别准确率和 `pending` 占比。

## 16. MCP 适配

MCP 只包装公共应用服务，不重新实现走查逻辑。当前通过 `server/mcp.ts` 提供以下能力：

```text
review.create
review.get
review.get_result
review.list_artifacts
```

长时间任务仍使用异步 `reviewId`。MCP Client 可以轮询资源或由宿主调度后续检查，但 MCP 与 HTTP API 必须返回同一套状态、结果和错误语义。

当前 stdio 入口位于 `server/mcp-stdio.ts`，通过 `DIFFLAB_API_BASE_URL` 和 `DIFFLAB_SERVICE_TOKEN` 连接 `/v1`。一个 MCP 进程对应一条公共 API 服务身份，并继承其 tenant、Scope、幂等、SSRF、签名地址和结果脱敏边界。详细调用方式见 [MCP 走查接口](./MCP.md)。

本地简易版本允许从 MCP/API 进程的 `OPENAI_*` 环境变量启用 AI，也允许 `review.create` 用可选 `ai` 参数覆盖。内联 AI Key 不写入 Review 状态和结果；该方式只面向可信本地环境，共享网络部署仍应替换为 tenant-scoped 密钥引用。

## 17. 与当前原型的迁移关系

```text
当前：POST /api/compare
  → 同步执行
  → 返回内嵌图片的 CompareReport

目标：POST /v1/reviews
  → 创建异步 Review
  → ReviewService 执行多个 PagePair
  → Result Store 保存结构化结果
  → Artifact Store 保存 Excel 和图片
  → 调用方通过查询或 Webhook 获取完成状态
```

建议迁移顺序：

1. 从 `server/index.ts` 提取无 HTTP 依赖的 `ReviewService`；
2. 让当前 `/api/compare` 兼容调用 `ReviewService`，保持原型 UI 可用；
3. 建立任务、结果和制品存储接口；
4. 实现 `/v1/reviews` 异步外观；
5. 增加服务鉴权、幂等、错误码、限流和安全边界；
6. 发布 OpenAPI 和调用方契约测试；
7. 最后增加 MCP 薄适配层。
