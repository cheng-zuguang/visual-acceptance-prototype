# 把底层差异归并为 ReviewIssue

Status: ready-for-agent

Type: AFK

User stories: US-04, US-07

## What to build

将同一元素或区域上由一个根因产生的像素、位置、排版、颜色和图标差异归并成一个可执行 ReviewIssue。每个问题保留主要规则、关联证据、设计与开发表现、修改建议、优先级和 EvidenceConfidence。

## Acceptance criteria

- [ ] 同一元素整体偏移不会输出多条重复修改项
- [ ] 不同根因或不同页面区域的问题不会被错误合并
- [ ] 每个 ReviewIssue 有明确页面位置和主要修改动作
- [ ] 设计参数、实际参数和底层证据可以追溯
- [ ] Agent 可以改写说明和建议，但不能新增无证据参数
- [ ] 优先级区分 P0、P1、P2 和 Pending
- [ ] JSON、HTML 和 Markdown 报告消费同一组 ReviewIssue

## Blocked by

- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments
