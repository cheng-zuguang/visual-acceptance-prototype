# 把底层差异归并为 ReviewIssue

Status: ready-for-human

Type: AFK

User stories: US-04, US-07

## What to build

将同一元素或区域上由一个根因产生的像素、位置、排版、颜色和图标差异归并成一个可执行 ReviewIssue。每个问题保留主要规则、关联证据、设计与开发表现、修改建议、优先级和 EvidenceConfidence。

## Acceptance criteria

- [x] 同一元素整体偏移不会输出多条重复修改项
- [x] 不同根因或不同页面区域的问题不会被错误合并
- [x] 每个 ReviewIssue 有明确页面位置和主要修改动作
- [x] 设计参数、实际参数和底层证据可以追溯
- [x] Agent 可以改写说明和建议，但不能新增无证据参数
- [x] 优先级区分 P0、P1、P2 和 Pending
- [x] JSON、HTML 和 Markdown 报告消费同一组 ReviewIssue

## Blocked by

- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments

- 2026-09-08：新增 `aggregateReviewIssues`，将同区域视觉差异挂到确定性主问题，按 rule + 元素身份去重，并保留完整底层 evidence 数组。
- 2026-09-08：ReviewIssue 统一输出 `priority`、`location`、`primaryAction` 和证据链；Agent 只允许改写三个文案字段，出现证据中不存在的数值时拒绝改写。
- 2026-09-11：新增受限结构完整性规则。Agent 验证的 `missing-in-actual` 模块只有在同级稳定模块位移阶跃与 Figma 设计流缺口一致时才发布为 `missing_module` ReviewIssue；页面中段要求前后双侧证据，页首可使用顶部边界与后续模块等量上移，页尾无额外证据时仍非阻断。AI 只能引用最终问题。同步规范化 `PingFangSC/PingFang SC` 与 LTR `start/left`、`end/right` 等价项以减少报告噪音。
- 2026-09-11：阻断级 `missing_module` 成为 AI 汇总必选证据；模型漏选时服务端只补入该正式问题引用及其既有文案，不允许原始未匹配区域绕过证据边界。
- 2026-09-08：JSON、HTML、Markdown 均消费 `ComparisonResult.issues`；Agent 失败时保留确定性原文。全量验证通过：82 tests、TypeScript typecheck、production build、`git diff --check`。
