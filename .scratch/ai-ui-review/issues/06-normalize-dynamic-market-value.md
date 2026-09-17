# 归一化单个动态行情数值

Status: ready-for-human

Type: AFK

User stories: US-02, US-07

## What to build

识别一个跨样本持续变化但元素身份、容器和样式稳定的行情数值，并应用窄范围 NormalizationStrategy。具体字符不参与像素失败判定，但该元素的排版、位置、尺寸、对齐、溢出和布局抖动仍被审查。

## Acceptance criteria

- [x] 至少三个样本共同支持时才自动识别动态行情值
- [x] 数字、价格、百分比和成交量格式可作为辅助证据而非唯一证据
- [x] 归一化同时作用于对应设计区域和实际区域，不形成单边遮罩偏差
- [x] 归一化不移除字体、字号、字重、颜色、位置、尺寸、对齐和溢出检查
- [x] 报告分别展示稳定区域相似度、动态区域占比和采用的策略
- [x] 一个真实静态文字错误不会因邻近行情值而被自动忽略
- [x] 自动化测试覆盖合法数值刷新、错误字号、位置偏移和长数字溢出

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)
- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)
- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)

## Comments

- 2026-09-08：新增 `server/dynamic.ts`，仅在至少 3 个样本共同证明身份、几何和样式稳定且行情文字变化时，输出 `normalize-market-value-text`。
- 2026-09-08：设计框与实际框采用对称像素归一化，并从稳定相似度的变化像素与审查像素分母中同时排除；具体内容跳过后，字体族、字号、字重、行高、颜色、位置、尺寸、文字对齐和溢出规则继续执行。
- 2026-09-08：报告、前端、Markdown、独立 HTML 和公共响应模型分别暴露稳定区域相似度、动态区域占比、策略及 DynamicRegion 证据。
- 2026-09-08：测试覆盖三帧合法刷新、两帧证据不足、静态数字、无 Figma id 黑盒绑定、百分比/复合成交量、跨帧几何或样式变化、字体族/字号/对齐、位置、长数字溢出、相邻静态文字和稳定相似度分母；完整测试 46/46、类型检查和生产构建通过。
