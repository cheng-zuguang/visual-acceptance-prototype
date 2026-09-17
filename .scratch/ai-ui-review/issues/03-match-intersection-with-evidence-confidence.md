# 采用交集匹配并输出 EvidenceConfidence

Status: ready-for-human

Type: AFK

User stories: US-01, US-07

## What to build

将设计节点和开发元素匹配改为交集审查。可靠匹配的元素继续执行参数和像素规则，未匹配元素默认不阻断；每个匹配和问题输出由真实证据计算的 EvidenceConfidence，证据不足时自动降级为待确认。

## Acceptance criteria

- [x] 只有可靠匹配的设计与开发元素进入确定性参数比对
- [x] 设计侧缺失实现和开发侧额外元素默认不生成阻断问题
- [x] 报告保留未匹配数量和诊断信息，便于发现覆盖不足
- [x] EvidenceConfidence 区分精确 ID、稳定文本、结构几何和纯视觉推断
- [x] 低于高置信度门槛的问题自动变为 `pending`
- [x] 自动化测试覆盖交集匹配、低置信度降级和未匹配忽略

## Blocked by

- [02 为一个 Figma Frame 构建结构化 DesignTruth](./02-build-structured-design-truth.md)

## Comments

- 2026-09-08：按 TDD 完成交集匹配。精确 ID、稳定文本和结构几何通过统一证据模型输出匹配明细；稳定文本与几何候选均服从 `match_confidence_min`。
- 2026-09-08：每个匹配和问题现均输出结构化 `EvidenceConfidence`（`score`、`level`、`basis`、`reasons`）。低于 `high_confidence_min` 的 error/warning 元素问题统一降为 `pending`，纯视觉区域推断上限为 `0.70`。
- 2026-09-08：未匹配设计节点和开发元素不再生成问题；`CompareReport` 保留匹配明细、双方未匹配数量和诊断。旧 `Issue.confidence`、`missing_element`、`extra_element`、`critical_figma_nodes` 契约已移除。
- 2026-09-08：像素门禁相似度仅统计可靠匹配元素的设计框与实际框并集；完整差异热图仍保留全屏纯视觉线索，未匹配像素不会间接触发失败。
- 2026-09-08：验证通过：23/23 自动化测试、TypeScript 类型检查、生产构建、`git diff --check`，以及 `/api/demo-compare` HTTP 冒烟（交集相似度 0.8885、10 个匹配、每条问题均含 EvidenceConfidence）。
- 2026-09-10：`PageAlignmentRegionDecision` 新增结构化 `anchorStats`，记录候选、稳定、动态排除、结构锚点、RANSAC 内点与 RMS 残差；区域 EvidenceConfidence 由这些可复现指标校准，并在 JSON、Markdown 和 HTML 报告中公开。
- 2026-09-10：页面对齐六项评分权重及 H/M/L 阈值移入 `page_alignment.confidence` YAML 配置；权重会归一化、阈值会按序钳制。每个区域新增 `scoreBreakdown`，保留特征值、权重、贡献、加权分、基础上限、最终分和生效阈值，支持真实样本离线调参。
