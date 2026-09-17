# 通过安全异步 API 走查一个 Live PagePair

Status: ready-for-human

Type: AFK

User stories: US-06, US-07

## What to build

提供第一个完整公共调用路径：已鉴权的外部服务提交一个 Live PagePair，异步获得 Review 标识，查询任务状态和结构化结果，并下载 Excel 制品。公共边界使用稳定版本、机器错误码和受控 H5 网络访问策略。

## Acceptance criteria

- [x] 外部服务通过版本化 JSON 接口创建一个 Live Review 并收到 `202 Accepted`
- [x] 创建、读取和取消操作受到服务身份和权限范围保护
- [x] H5 URL 接受项目允许域名策略，并阻止内网探测、DNS 重绑定和越权重定向
- [x] 调用方可以查询 queued、running、succeeded、failed 和 cancelled 状态
- [x] 执行状态与 passed、failed、needs_review 验收结论分别表达
- [x] 结构化结果不内嵌大型 base64 图片
- [x] Excel 制品通过受控下载引用获取
- [x] 错误包含稳定机器码、可重试标记和请求关联标识
- [x] 契约测试覆盖成功、未鉴权、禁止域名、执行失败和验收失败

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)
- [13 生成红框证据图与 Excel 报告](./13-generate-excel-with-annotated-evidence.md)

## Comments

- `server/public-api.ts` 提供内存任务存储上的第一版安全异步适配器；持久化、签名 URL、限流和多实例队列留给后续部署任务。
