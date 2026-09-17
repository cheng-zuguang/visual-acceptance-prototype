# 按行模板审查动态行情列表

Status: ready-for-human

Type: AFK

User stories: US-02, US-07

## What to build

把重复的行情列表识别为容器、表头、行模板和分页/加载区域。具体行情值、自然排序和默认行数不参与门禁，但列结构、列宽、行高、间距、对齐、分割线、行内组件和 MarketVariant 继续接受设计审查。

## Acceptance criteria

- [x] 结合 Figma 层级和重复 DOM 子树识别一个行情列表及其行模板
- [x] 不同数据、顺序和合理行数的同一列表模板得到稳定结果
- [x] 表头、列数、列宽、行高、间距、分割线和对齐参与确定性比对
- [x] 行内动态数值复用已验证的行情值归一化策略
- [x] 行内涨跌颜色和图标使用对应 MarketVariant 检查
- [x] 长名称和长数字造成的裁切、挤压或横向溢出能够被报告
- [x] 无法可靠识别重复结构时退回元素级审查或 `pending`

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)
- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)
- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments

- 2026-09-08：新增 `server/market-list.ts`。列表识别联合 Figma 表头/行模板层级、精确容器绑定和至少两个同构 DOM 直属子树，输出结构化 `MarketListSummary` 与行列模板绑定。
- 2026-09-08：浏览器采集新增父选择器、兄弟序号和与文本无关的有限深度子树签名。具体数据、自然排序和合理行数不参与模板门禁；表头、稳定列数、列宽、行高、行间距、分割线和对齐继续确定性审查。
- 2026-09-08：每个重复行单元格映射到同一 Figma 行模板列，行内数字复用任务 06 的多帧行情值归一化，行内颜色和图标复用任务 08 的设计侧 MarketVariant。
- 2026-09-08：长名称和长数字继续触发裁切、挤压列宽和横向溢出规则；只有一个实际行、缺少重复子树或各行列数不稳定时保留元素级审查并输出 `market_list_structure/pending`。
- 2026-09-08：测试覆盖真实浏览器结构采集、模板识别、数据/顺序/行数变化、全部模板参数、行内动态数值、行内 Variant、长内容和降级路径；69/69 自动化测试、TypeScript 类型检查、生产构建与 `git diff --check` 通过。
