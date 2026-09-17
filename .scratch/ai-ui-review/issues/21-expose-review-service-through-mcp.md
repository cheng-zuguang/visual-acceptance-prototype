# 提供公共 MCP 薄适配层

Status: ready-for-human

Type: AFK

User stories: US-06

## What to build

在稳定公共走查服务之上增加 MCP 薄适配层，使 MCP Client 能创建 Review、查询状态、读取结构化结果和列出制品。MCP 不重新实现采集、Agent、比对、鉴权或任务状态逻辑。

## Acceptance criteria

- [x] MCP 提供创建、查询、获取结果和列出制品能力
- [x] 长时间任务返回 Review 标识，不保持同步调用直到完成
- [x] MCP 与公共 HTTP API 使用相同的服务身份和权限边界
- [x] 状态、验收结论、错误码和制品语义与 HTTP API 一致
- [x] MCP 输出不包含 Figma Token、浏览器凭据或内部 Agent 提示词
- [x] 契约测试证明 MCP 和 HTTP 入口对同一 Review 返回一致结果
- [x] 走查核心不存在 MCP 专用分支或复制实现

## Blocked by

- [15 通过安全异步 API 走查一个 Live PagePair](./15-submit-live-review-through-public-api.md)
- [16 通过公共 API 运行 Screenshot/Hybrid 走查](./16-submit-screenshot-and-hybrid-through-public-api.md)
- [17 支持批量公共调用与幂等提交](./17-support-idempotent-batch-public-reviews.md)
- [18 发送签名完成 Webhook](./18-deliver-signed-review-webhooks.md)

## Comments

- 2026-09-09：新增 `server/mcp.ts`，通过配置的公共 API 服务身份提供 `review.create`、`review.get`、`review.get_result` 和 `review.list_artifacts`；所有结果和错误体均由 `/v1` 原样返回。
- 2026-09-09：新增 `server/mcp-stdio.ts` 与 `npm run mcp`，使用 `DIFFLAB_API_BASE_URL`、`DIFFLAB_SERVICE_TOKEN` 启动 stdio MCP Server；工具参数不承载原始凭据。
- 2026-09-09：新增 MCP/HTTP 契约测试，覆盖异步创建、同一 Review 状态、完成结果、签名制品元数据和 Scope 拒绝；全量 138 项测试、类型检查、生产构建及生产依赖审计均通过。
- 2026-09-09：MCP 与 `/v1` 增加可选 AI 配置；默认从 `DIFFLAB_AI_ENABLED`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 读取，`review.create.ai` 可按字段覆盖且不会进入公共结果；更新后全量 143 项测试与生产构建通过。
