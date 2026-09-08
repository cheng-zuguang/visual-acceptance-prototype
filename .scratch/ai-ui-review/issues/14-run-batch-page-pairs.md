# 批量运行多个独立 PagePair

Status: ready-for-agent

Type: AFK

User stories: US-05

## What to build

允许一次走查包含多个独立 PagePair。每个 PagePair 保持一个 Figma Frame 对应一个开发页面状态，拥有独立执行状态、验收结论和问题清单；任务级结果聚合页面统计并生成统一 Excel。

## Acceptance criteria

- [ ] 一个 Review 可以提交多个 PagePair
- [ ] 每个 PagePair 独立校验输入、运行并产生结论
- [ ] 一个页面失败不会丢失其他已完成页面的结果
- [ ] 任务级结果区分执行状态与 UI 验收结论
- [ ] 页面名称和调用方页面标识在全部报告中稳定保留
- [ ] 统一 Excel 包含全部页面问题和页面级汇总
- [ ] 自动化测试覆盖全部成功、部分执行失败和混合验收结论

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)
- [13 生成红框证据图与 Excel 报告](./13-generate-excel-with-annotated-evidence.md)

## Comments
