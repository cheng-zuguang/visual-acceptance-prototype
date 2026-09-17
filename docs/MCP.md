# DiffLab MCP 接入文档

简体中文 | [English](./MCP.en.md)

## 1. 文档目的

DiffLab MCP Server 向 Agent、IDE 和其他支持 MCP 的服务提供 UI 走查能力。调用方可以创建异步走查、查询状态、获取结构化结果以及下载 Excel 制品。

MCP 是公共 `/v1` HTTP API 的薄适配层，不读取 Figma、不启动浏览器，也不实现独立的比对逻辑。所有设计稿解析、H5/截图采集、动态内容识别、确定性比对、Agent 辅助和报告生成仍由同一个 `ReviewService` 完成。

```text
MCP Client
  ├─ stdio
  └─ Streamable HTTP /mcp
          ↓
    MCP Review Tools
          ↓
    Public API /v1
          ↓
      ReviewService
          ↓
 DesignTruth + ActualEvidence + Report
```

## 2. 当前能力

| 能力 | MCP 工具 | 对应 HTTP API |
| --- | --- | --- |
| 创建异步 UI 走查 | `review.create` | `POST /v1/reviews` |
| 查询执行状态和验收结论 | `review.get` | `GET /v1/reviews/{reviewId}` |
| 获取结构化走查结果 | `review.get_result` | `GET /v1/reviews/{reviewId}/result` |
| 获取报告制品和下载地址 | `review.list_artifacts` | `GET /v1/reviews/{reviewId}/artifacts` |

支持的 `ActualEvidence` 类型包括：

- Live H5；
- Screenshot；
- Screenshot + H5 Hybrid；
- Long Screenshot；
- Long Screenshot + H5 Hybrid。

完整 PagePair 请求字段见 [公共 HTTP API 详细文档](./PUBLIC_HTTP_API.md)。

## 3. 传输方式

DiffLab 同时支持 stdio 和 Streamable HTTP。两种传输暴露完全相同的四个工具，并复用同一套 `/v1` 契约。

### 3.1 Streamable HTTP

适用于远程 Agent、公共 MCP 服务或多个调用方共享部署。MCP 与主 API 使用同一端口：

```bash
DIFFLAB_SERVICE_TOKEN=your-service-token \
npm run dev:server
```

默认地址：

```text
http://127.0.0.1:4318/mcp
```

每个请求都必须携带 Bearer Token：

```http
Authorization: Bearer your-service-token
```

服务端验证 Token 后，将同一 Token 转发到 `/v1`。因此 tenant、Scope、幂等、SSRF 和制品权限与直接调用公共 HTTP API 完全一致。

监控指标不作为 MCP Tool 暴露。Prometheus 应使用带 `metrics:read` 的同租户服务 Token 直接抓取 `/v1/metrics`，避免 Agent 调用路径参与监控采集。

TypeScript 客户端示例：

```ts
import {
  Client,
  StreamableHTTPClientTransport
} from "@modelcontextprotocol/client";

const client = new Client({
  name: "difflab-client",
  version: "1.0.0"
});

const transport = new StreamableHTTPClientTransport(
  new URL("http://127.0.0.1:4318/mcp"),
  {
    authProvider: {
      token: async () => process.env.DIFFLAB_SERVICE_TOKEN!
    }
  }
);

await client.connect(transport);

const tools = await client.listTools();
console.log(tools.tools.map((tool) => tool.name));
```

可使用以下请求做协议连通性检查：

```bash
curl -sS -X POST http://127.0.0.1:4318/mcp \
  -H "Authorization: Bearer your-service-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Streamable HTTP 当前采用无状态模式：每个 HTTP 请求创建一个短生命周期 MCP Server，不在 MCP 层保存 Review 状态。

### 3.2 stdio

适用于本机 IDE、桌面 Agent 或由 MCP Host 直接拉起的子进程。先启动 DiffLab API：

```bash
DIFFLAB_SERVICE_TOKEN=your-service-token npm run dev:server
```

再启动 stdio MCP：

```bash
DIFFLAB_API_BASE_URL=http://127.0.0.1:4318 \
DIFFLAB_SERVICE_TOKEN=your-service-token \
npm run mcp
```

通用 MCP Host 配置示例，具体字段名以所用客户端为准：

```json
{
  "mcpServers": {
    "difflab": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/visual-acceptance-prototype",
      "env": {
        "DIFFLAB_API_BASE_URL": "http://127.0.0.1:4318",
        "DIFFLAB_SERVICE_TOKEN": "your-service-token"
      }
    }
  }
}
```

一个 stdio MCP 进程对应一个服务身份。不要让多个不可信租户共享同一个 stdio 进程或 Service Token。

## 4. 环境变量

| 环境变量 | 是否必填 | 说明 | 默认值 |
| --- | --- | --- | --- |
| `DIFFLAB_SERVICE_TOKEN` | 是 | MCP 与 `/v1` 共用的 Bearer 服务身份 | 无 |
| `DIFFLAB_TENANT_ID` | 否 | 当前 Service Token 所属租户 | `default` |
| `DIFFLAB_API_BASE_URL` | stdio 必填 | MCP 工具转发到 `/v1` 的地址 | HTTP 模式下为当前服务 |
| `DIFFLAB_MCP_ALLOWED_HOSTS` | 对外部署必填 | Streamable HTTP 允许的 Host，逗号分隔，不含协议和端口 | 仅本机主机名 |
| `DIFFLAB_MCP_ALLOWED_ORIGINS` | 否 | 允许的 Origin 主机名，逗号分隔 | 与 allowed hosts 相同 |
| `DIFFLAB_AI_ENABLED` | 否 | 是否默认启用 Agent 辅助 | 根据 AI Key/API 地址判断 |
| `OPENAI_API_KEY` | 否 | 默认 AI API Key | 无 |
| `OPENAI_BASE_URL` | 否 | OpenAI 兼容 API 地址 | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 否 | 默认视觉模型 | 项目内置默认值 |

执行真实 Review 时，通常还需要配置 Figma、H5 和签名相关变量：

```bash
DIFFLAB_ALLOWED_H5_HOSTS=h5.example.com \
DIFFLAB_FIGMA_CREDENTIAL_REF=figma-team-default \
FIGMA_TOKEN=your-figma-token \
DIFFLAB_SIGNING_SECRET=your-signing-secret \
DIFFLAB_SERVICE_TOKEN=your-service-token \
npm run dev:server
```

## 5. 工具契约

### 5.1 `review.create`

异步创建一个 Review。该工具在任务进入队列后立即返回，不等待 Figma、浏览器采集和比对完成。

输入结构：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `request` | object | 是 | 与 `POST /v1/reviews` 相同的请求体 |
| `ai` | object | 否 | 本次调用的 AI 配置覆盖 |
| `idempotencyKey` | string | 否 | 幂等键，最长 200 字符 |

Live H5 示例：

```json
{
  "request": {
    "name": "行情首页",
    "locale": "zh-CN",
    "pagePairs": [
      {
        "clientPageId": "market-home",
        "pageName": "行情首页",
        "design": {
          "kind": "figma",
          "frameUrl": "https://www.figma.com/design/FILE_KEY/file?node-id=1-2",
          "credentialRef": "figma-team-default"
        },
        "actual": {
          "kind": "live",
          "url": "https://h5.example.com/market"
        }
      }
    ]
  },
  "ai": {
    "requested": true,
    "apiUrl": "http://127.0.0.1:11434/v1",
    "model": "local-vision-model"
  },
  "idempotencyKey": "market-home-attempt-1"
}
```

成功结果：

```json
{
  "schemaVersion": "1.0",
  "reviewId": "rev_xxx",
  "status": "queued",
  "createdAt": "2026-09-09T00:00:00.000Z",
  "statusUrl": "/v1/reviews/rev_xxx",
  "resultUrl": "/v1/reviews/rev_xxx/result",
  "artifactsUrl": "/v1/reviews/rev_xxx/artifacts"
}
```

建议调用方始终提供稳定的 `idempotencyKey`。同一租户使用相同 Key 和相同请求时会复用原 Review；相同 Key 配合不同请求会返回 `IDEMPOTENCY_CONFLICT`。

AI 配置按字段合并，优先级如下：

```text
MCP 顶层 ai
  > request.ai
  > MCP 进程环境变量
  > API 进程环境变量
  > ReviewService 内置默认值
```

`requested: false` 可以对单次 Review 禁用 AI。

### 5.2 `review.get`

查询 Review 当前执行状态、进度、页面状态和已经可用的验收结论。

输入：

```json
{
  "reviewId": "rev_xxx"
}
```

主要响应字段：

```json
{
  "schemaVersion": "1.0",
  "reviewId": "rev_xxx",
  "name": "行情首页",
  "status": "running",
  "progress": {
    "totalPages": 1,
    "completedPages": 0,
    "currentStage": "review"
  },
  "pagePairs": [
    {
      "clientPageId": "market-home",
      "status": "running",
      "stage": "capture"
    }
  ]
}
```

### 5.3 `review.get_result`

Review 完成后获取结构化结果。

输入：

```json
{
  "reviewId": "rev_xxx"
}
```

结果包含：

- Review 的执行状态与 UI 验收结论；
- 总体汇总和页面级结果；
- `stablePixelSimilarity`、动态区域占比和匹配覆盖率；
- ReviewIssue、优先级和 EvidenceConfidence；
- AI 建议被拒绝时的 `aiAdviceRejection`，包含 `ai_timeout / ai_format_error / ai_generation_failed / evidence_integrity_failed` 代码；证据完整性失败还会给出断链引用和从 1 开始的建议序号；
- Long Screenshot 分片、滚动位置及绝对坐标；
- `artifactIds`。

Review 未完成时返回 `REVIEW_NOT_READY`，此时调用方应继续查询 `review.get`。

### 5.4 `review.list_artifacts`

获取报告制品元数据和短期签名下载地址。

输入：

```json
{
  "reviewId": "rev_xxx"
}
```

响应示例：

```json
{
  "schemaVersion": "1.0",
  "artifacts": [
    {
      "artifactId": "art_excel",
      "kind": "excel",
      "filename": "行情首页UI走查结果.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "sizeBytes": 102400,
      "downloadUrl": "/v1/reviews/rev_xxx/artifacts/art_excel?expires=...&signature=...",
      "expiresAt": "2026-09-09T00:10:00.000Z"
    }
  ]
}
```

MCP 结果不会内嵌 Excel、截图、Base64 或其他大文件字节。

## 6. 推荐 Agent Loop

```text
1. review.create
2. 保存 reviewId
3. 周期性调用 review.get
4. 等待 status 进入终态
5. status = succeeded 时调用 review.get_result
6. status = failed 且状态响应包含 summary 时，调用 review.get_result 获取部分结果
7. 按需调用 review.list_artifacts
8. 下载 Excel 或把结构化问题交给后续系统
```

建议采用有上限的退避轮询，例如 1 秒、2 秒、4 秒，之后固定为 5 秒。不要在单次 Agent 调用中无限等待。

`review.get` 在任务仍排队时可能返回 `queuePosition`。它只表示当前进程内队列的瞬时位置；调用方应继续以 `status` 为准。`review.create` 遇到 `REVIEW_CAPACITY_EXCEEDED` 或 `REVIEW_RATE_LIMITED` 时，应按 HTTP `Retry-After` 退避并复用同一个 `idempotencyKey`。

`review.get_result` 的每页 `matching.pageAlignment` 提供结构化页面模块对应：`matched / missing-in-actual / uncertain`、开发区域、整体位移、判断来源、EvidenceConfidence、`anchorStats`（候选/稳定/动态排除/结构/RANSAC 内点/残差）、`scoreBreakdown`（分量值/权重/贡献/阈值）和被拒绝提案数。Agent 可以用它解释“为何没有匹配”或安排人工复核，但不得把它改写为通过/不通过结论；门禁仍由确定性规则产生的 `verdict` 决定。

## 7. 状态和结论

公共结果现包含 `pageEvidence` 整图引用和问题的 `designCrop / actualCrop`；`review.get_result` 与 `review.list_artifacts` 原样转发这些签名图片元数据，不处理图片字节。图片下载和单问题复核创建 `POST /v1/issue-rechecks` 详见 [HTTP 契约](./PUBLIC_HTTP_API.md#19-单问题复核)；当前未增加 MCP 复核创建工具。

执行状态与 UI 验收结论是两个不同维度：

| 字段 | 可能值 | 含义 |
| --- | --- | --- |
| `status` | `queued`、`running`、`succeeded`、`failed`、`cancelled` | Review 是否成功执行完毕 |
| `verdict` | `passed`、`failed`、`needs_review` | 页面是否达到 UI 验收标准 |

例如：

- `status=succeeded, verdict=failed`：走查执行成功，但页面存在阻断问题；
- `status=succeeded, verdict=needs_review`：走查执行成功，但证据置信度不足，需要人工确认；
- `status=failed`：走查任务本身执行失败，不能将其解释为 UI 不合格。

## 8. 错误处理

公共 HTTP API 的稳定错误体会原样写入 MCP `structuredContent`，同时设置 `isError: true`：

```json
{
  "structuredContent": {
    "error": {
      "code": "REVIEW_NOT_READY",
      "message": "The Review result is not available yet.",
      "retryable": true,
      "requestId": "req_xxx"
    }
  },
  "isError": true
}
```

Streamable HTTP 的 Token 缺失或无效时，会在进入 MCP 工具前直接返回 HTTP `401` 和 `WWW-Authenticate: Bearer ...`；这类传输层鉴权失败没有 MCP `structuredContent`。

常见错误：

| 错误码 | 是否可重试 | 说明 |
| --- | --- | --- |
| `UNAUTHORIZED` | 否 | Token 缺失或无效 |
| `FORBIDDEN` | 否 | Service Token 缺少工具对应 Scope |
| `INVALID_REQUEST` | 否 | 请求结构或参数不合法 |
| `RESOURCE_NOT_FOUND` | 否 | Review 不存在或不属于当前租户 |
| `REVIEW_NOT_READY` | 是 | Review 尚未完成 |
| `IDEMPOTENCY_CONFLICT` | 否 | 幂等键已被不同请求使用 |
| `REVIEW_CAPACITY_EXCEEDED` | 是 | 全局或当前租户的 Review 等待队列已满 |
| `REVIEW_RATE_LIMITED` | 是 | 当前租户的 Review 提交速率超过限制 |
| `REVIEW_TIMEOUT` | 是 | Review 超过总运行时间限制 |

调用方应优先按 `error.code` 和 `error.retryable` 分支处理，不要解析自然语言错误信息。

## 9. 网络与部署安全

### 9.1 Host 和 Origin

Streamable HTTP 默认只接受以下主机：

```text
localhost
127.0.0.1
[::1]
```

对外部署时必须显式配置实际域名：

```bash
DIFFLAB_MCP_ALLOWED_HOSTS=review.example.com \
DIFFLAB_MCP_ALLOWED_ORIGINS=review.example.com \
DIFFLAB_SERVICE_TOKEN=your-service-token \
npm start
```

`DIFFLAB_MCP_ALLOWED_ORIGINS` 只执行 Origin 校验，不单独开启浏览器 CORS。非浏览器 MCP Client 通常不发送 `Origin`。

### 9.2 凭据

- Figma、浏览器登录态和 Webhook 只接受服务端凭据引用；
- `review.create.ai.apiKey` 仅用于本地原型，不会写入 Review 状态、结果或日志；
- 共享网络部署不应让调用方传递原始 AI Key，应使用服务端环境变量或租户级 Secret Reference；
- 不要在日志、MCP 工具结果或 Agent 提示词中输出 Service Token；
- 多租户部署不得共享同一个静态 Token。

### 9.3 当前鉴权边界

当前简易版本复用公共 API 的静态 Bearer Service Token，尚未提供：

- OAuth Authorization Server；
- Dynamic Client Registration；
- 租户级 Token 管理界面；
- Token 轮换与吊销接口。

正式公共部署建议增加 OAuth Protected Resource Metadata、租户级 Token Verifier、限流和审计日志。

## 10. 实现边界

- MCP 不维护独立 Review 数据库或状态机；
- MCP 不新增专属审查规则；
- MCP 不返回 Agent 内部轮次、提示词或中间推理；
- MCP 不绕过 `/v1` 的鉴权、租户隔离、SSRF、幂等和签名下载；
- MCP 与 HTTP API 返回同一套结构化 Review 契约；
- 生产部署仍需完善持久化队列、对象存储、限流和生产密钥托管。

## 11. 相关文档

- [HTTP API 参考](./API.md)
- [公共服务 API 设计](./PUBLIC_API_DESIGN.md)
- [系统架构](./ARCHITECTURE.md)
- [UI 走查蓝图](./AI_UI_REVIEW_BLUEPRINT.md)
