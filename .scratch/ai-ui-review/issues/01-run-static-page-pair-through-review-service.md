# 通过统一 ReviewService 运行现有静态 PagePair

Status: ready-for-human

Type: AFK

User stories: US-01, US-06

## What to build

建立不依赖 HTTP 的统一走查服务，使现有单个 Figma/H5 静态比对通过该服务运行。当前 Web UI、演示路径和报告结果保持兼容，同时为公共 API、MCP、CLI 和批处理调用建立唯一业务入口。

## Acceptance criteria

- [x] 一个静态 PagePair 可以通过 ReviewService 完成设计读取、页面采集、比对和报告生成
- [x] 当前 Web UI 和现有比较接口继续返回兼容结果
- [x] 演示比较继续通过同一个服务完成，不复制走查逻辑
- [x] ReviewService 可以在不启动 HTTP 服务器的测试中直接调用
- [x] 自动化测试覆盖成功、设计输入失败和页面采集失败路径

## Blocked by

None - can start immediately.

## Comments

- 2026-09-08：实现 `ReviewService`，`/api/compare` 与 `/api/demo-compare` 改为 HTTP 适配层；通过单元测试、类型检查、生产构建和 Demo HTTP 冒烟，转交人工复核。
