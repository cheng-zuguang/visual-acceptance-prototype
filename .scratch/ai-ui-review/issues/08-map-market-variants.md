# 映射非统一命名的 MarketVariant

Status: ready-for-human

Type: AFK

User stories: US-02, US-07

## What to build

从 Figma 的组件属性、颜色、图标、示例文本符号和实例关系识别上涨、下跌和平盘 MarketVariant，并将开发页面当前数值状态映射到有设计证据支持的 Variant。Figma 名称不要求使用统一英文词汇。

## Acceptance criteria

- [x] 中英文或项目自定义 Variant 名称可以保留并参与语义归一
- [x] 颜色、图标和文本符号共同形成 Variant 证据
- [x] 有足够证据时输出 `market.up`、`market.down` 或 `market.flat`
- [x] 只能区分视觉状态时使用中性 `variant-A/B/C`，不虚构涨跌语义
- [x] 线上 Variant 的颜色、图标、位置和尺寸与对应 Figma Variant 确定性比较
- [x] 服务不硬编码红涨绿跌或绿涨红跌
- [x] 缺少设计侧 Variant 证据时结果降级为 `pending`

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)
- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments

- 2026-09-08：新增 `server/market-variant.ts`，保留 Figma 原始 Variant 属性与名称，并联合属性/名称、示例数值符号、方向图标和颜色建立可解释证据；至少两类语义证据一致时才映射涨、跌、平，否则保持 `variant-A/B/C` 中性标签。
- 2026-09-08：实际行情数值先按符号识别当前状态，再沿 Instance → Component → ComponentSet 关系选择设计侧目标 Variant；颜色、图标存在性、图标相对位置和尺寸均由目标 Variant 确定性审查。
- 2026-09-08：颜色只作为目标视觉状态证据，未编码红涨绿跌或绿涨红跌；设计侧证据不足时输出 `pending`，不猜测业务语义。
- 2026-09-08：测试覆盖自定义中文命名、语义不足的中性状态、反惯例配色、目标颜色、图标缺失/位置/尺寸及设计证据缺失；60/60 自动化测试、TypeScript 类型检查和生产构建通过。
