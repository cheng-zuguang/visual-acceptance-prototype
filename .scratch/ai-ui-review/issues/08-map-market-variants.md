# 映射非统一命名的 MarketVariant

Status: ready-for-agent

Type: AFK

User stories: US-02, US-07

## What to build

从 Figma 的组件属性、颜色、图标、示例文本符号和实例关系识别上涨、下跌和平盘 MarketVariant，并将开发页面当前数值状态映射到有设计证据支持的 Variant。Figma 名称不要求使用统一英文词汇。

## Acceptance criteria

- [ ] 中英文或项目自定义 Variant 名称可以保留并参与语义归一
- [ ] 颜色、图标和文本符号共同形成 Variant 证据
- [ ] 有足够证据时输出 `market.up`、`market.down` 或 `market.flat`
- [ ] 只能区分视觉状态时使用中性 `variant-A/B/C`，不虚构涨跌语义
- [ ] 线上 Variant 的颜色、图标、位置和尺寸与对应 Figma Variant 确定性比较
- [ ] 服务不硬编码红涨绿跌或绿涨红跌
- [ ] 缺少设计侧 Variant 证据时结果降级为 `pending`

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)
- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments
