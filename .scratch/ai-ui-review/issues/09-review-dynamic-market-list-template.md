# 按行模板审查动态行情列表

Status: ready-for-agent

Type: AFK

User stories: US-02, US-07

## What to build

把重复的行情列表识别为容器、表头、行模板和分页/加载区域。具体行情值、自然排序和默认行数不参与门禁，但列结构、列宽、行高、间距、对齐、分割线、行内组件和 MarketVariant 继续接受设计审查。

## Acceptance criteria

- [ ] 结合 Figma 层级和重复 DOM 子树识别一个行情列表及其行模板
- [ ] 不同数据、顺序和合理行数的同一列表模板得到稳定结果
- [ ] 表头、列数、列宽、行高、间距、分割线和对齐参与确定性比对
- [ ] 行内动态数值复用已验证的行情值归一化策略
- [ ] 行内涨跌颜色和图标使用对应 MarketVariant 检查
- [ ] 长名称和长数字造成的裁切、挤压或横向溢出能够被报告
- [ ] 无法可靠识别重复结构时退回元素级审查或 `pending`

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)
- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)
- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments
