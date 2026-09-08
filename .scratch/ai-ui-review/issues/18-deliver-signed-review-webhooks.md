# 发送签名完成 Webhook

Status: ready-for-agent

Type: AFK

User stories: US-06

## What to build

在公共 Review 完成、执行失败或取消后向调用方发送签名 Webhook。事件只通知稳定任务事实和结果地址，不复制大型报告；接收方可以验签、按事件标识去重并在投递失败时等待重试。

## Acceptance criteria

- [ ] 支持 completed、failed 和 cancelled 事件
- [ ] 事件包含唯一事件标识、发生时间、Review 标识、执行状态、验收结论和结果地址
- [ ] 每次投递包含时间戳和 HMAC 签名
- [ ] Webhook 密钥通过密钥引用读取，不出现在任务结果中
- [ ] 失败投递使用有上限的指数退避重试并记录结果
- [ ] 相同事件重试保持同一个事件标识
- [ ] Webhook 最终失败不会改变 Review 的执行状态和结果
- [ ] 契约测试覆盖验签、重复事件、重试和永久失败

## Blocked by

- [15 通过安全异步 API 走查一个 Live PagePair](./15-submit-live-review-through-public-api.md)
- [17 支持批量公共调用与幂等提交](./17-support-idempotent-batch-public-reviews.md)

## Comments
