# 提供公共 MCP 薄适配层

Status: ready-for-agent

Type: AFK

User stories: US-06

## What to build

在稳定公共走查服务之上增加 MCP 薄适配层，使 MCP Client 能创建 Review、查询状态、读取结构化结果和列出制品。MCP 不重新实现采集、Agent、比对、鉴权或任务状态逻辑。

## Acceptance criteria

- [ ] MCP 提供创建、查询、获取结果和列出制品能力
- [ ] 长时间任务返回 Review 标识，不保持同步调用直到完成
- [ ] MCP 与公共 HTTP API 使用相同的服务身份和权限边界
- [ ] 状态、验收结论、错误码和制品语义与 HTTP API 一致
- [ ] MCP 输出不包含 Figma Token、浏览器凭据或内部 Agent 提示词
- [ ] 契约测试证明 MCP 和 HTTP 入口对同一 Review 返回一致结果
- [ ] 走查核心不存在 MCP 专用分支或复制实现

## Blocked by

- [15 通过安全异步 API 走查一个 Live PagePair](./15-submit-live-review-through-public-api.md)
- [16 通过公共 API 运行 Screenshot/Hybrid 走查](./16-submit-screenshot-and-hybrid-through-public-api.md)
- [17 支持批量公共调用与幂等提交](./17-support-idempotent-batch-public-reviews.md)
- [18 发送签名完成 Webhook](./18-deliver-signed-review-webhooks.md)

## Comments
