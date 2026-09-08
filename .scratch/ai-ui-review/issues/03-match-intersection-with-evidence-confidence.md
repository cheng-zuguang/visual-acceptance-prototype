# 采用交集匹配并输出 EvidenceConfidence

Status: ready-for-agent

Type: AFK

User stories: US-01, US-07

## What to build

将设计节点和开发元素匹配改为交集审查。可靠匹配的元素继续执行参数和像素规则，未匹配元素默认不阻断；每个匹配和问题输出由真实证据计算的 EvidenceConfidence，证据不足时自动降级为待确认。

## Acceptance criteria

- [ ] 只有可靠匹配的设计与开发元素进入确定性参数比对
- [ ] 设计侧缺失实现和开发侧额外元素默认不生成阻断问题
- [ ] 报告保留未匹配数量和诊断信息，便于发现覆盖不足
- [ ] EvidenceConfidence 区分精确 ID、稳定文本、结构几何和纯视觉推断
- [ ] 低于高置信度门槛的问题自动变为 `pending`
- [ ] 自动化测试覆盖交集匹配、低置信度降级和未匹配忽略

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)

## Comments
