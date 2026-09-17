# 支持批量公共调用与幂等提交

Status: ready-for-human

Type: AFK

User stories: US-05, US-06

## What to build

允许外部服务通过公共 API 提交包含多个 PagePair 的 Review，并使用幂等键安全重试创建请求。批量任务保留每页进度和部分结果，任务级结果能够表达混合执行状态和混合验收结论。

## Acceptance criteria

- [x] 一个公共 Review 请求可以包含多个独立 PagePair
- [x] 调用方页面标识在状态、结果、问题和制品中保持一致
- [x] 相同租户、幂等键和请求内容返回同一个 Review
- [x] 相同幂等键配合不同请求内容返回稳定冲突错误
- [x] 查询状态可以看到总页面数、已完成页数、当前阶段和每页状态
- [x] 单页执行失败不会删除其他页面结果
- [x] 批量任务遵守页面数、并发数、运行时长和资源配额
- [x] 契约测试覆盖重复提交、幂等冲突、部分失败和混合结论

## Blocked by

- [14 批量运行多个独立 PagePair](./14-run-batch-page-pairs.md)
- [15 通过安全异步 API 走查一个 Live PagePair](./15-submit-live-review-through-public-api.md)

## Comments

- 幂等记录按租户与 Key 隔离并绑定规范化请求哈希；`ReviewService` 使用受限 worker 并发并发布页面进度，部分执行失败仍可读取结构化结果和统一 Excel。
