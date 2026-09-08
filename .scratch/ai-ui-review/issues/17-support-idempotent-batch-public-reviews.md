# 支持批量公共调用与幂等提交

Status: ready-for-agent

Type: AFK

User stories: US-05, US-06

## What to build

允许外部服务通过公共 API 提交包含多个 PagePair 的 Review，并使用幂等键安全重试创建请求。批量任务保留每页进度和部分结果，任务级结果能够表达混合执行状态和混合验收结论。

## Acceptance criteria

- [ ] 一个公共 Review 请求可以包含多个独立 PagePair
- [ ] 调用方页面标识在状态、结果、问题和制品中保持一致
- [ ] 相同租户、幂等键和请求内容返回同一个 Review
- [ ] 相同幂等键配合不同请求内容返回稳定冲突错误
- [ ] 查询状态可以看到总页面数、已完成页数、当前阶段和每页状态
- [ ] 单页执行失败不会删除其他页面结果
- [ ] 批量任务遵守页面数、并发数、运行时长和资源配额
- [ ] 契约测试覆盖重复提交、幂等冲突、部分失败和混合结论

## Blocked by

- [14 批量运行多个独立 PagePair](./14-run-batch-page-pairs.md)
- [15 通过安全异步 API 走查一个 Live PagePair](./15-submit-live-review-through-public-api.md)

## Comments
