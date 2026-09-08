# 归一化单个动态行情数值

Status: ready-for-agent

Type: AFK

User stories: US-02, US-07

## What to build

识别一个跨样本持续变化但元素身份、容器和样式稳定的行情数值，并应用窄范围 NormalizationStrategy。具体字符不参与像素失败判定，但该元素的排版、位置、尺寸、对齐、溢出和布局抖动仍被审查。

## Acceptance criteria

- [ ] 至少三个样本共同支持时才自动识别动态行情值
- [ ] 数字、价格、百分比和成交量格式可作为辅助证据而非唯一证据
- [ ] 归一化同时作用于对应设计区域和实际区域，不形成单边遮罩偏差
- [ ] 归一化不移除字体、字号、字重、颜色、位置、尺寸、对齐和溢出检查
- [ ] 报告分别展示稳定区域相似度、动态区域占比和采用的策略
- [ ] 一个真实静态文字错误不会因邻近行情值而被自动忽略
- [ ] 自动化测试覆盖合法数值刷新、错误字号、位置偏移和长数字溢出

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)
- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)
- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)

## Comments
