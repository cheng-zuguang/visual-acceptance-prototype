# AI UI 视觉走查引擎 PRD

Status: accepted

## Problem

开发人员完成界面后，设计人员需要依据 Figma 逐页检查开发页面的 UI 还原度，手工测量布局、排版、颜色和装饰差异，截取问题区域并整理报告。金融 H5 中持续变化的行情数值、列表顺序和涨跌状态会让普通像素比对产生大量误报。

## Goal

以 Figma 为设计真值，自动审查开发页面的视觉还原度，并生成可定位、可解释、可筛选的证据报告。Agent 只帮助处理动态内容和歧义，确定性规则负责最终门禁。

## User stories

- **US-01**：设计人员可对一个 Figma Frame 与一个 H5 页面进行一对一走查。
- **US-02**：动态行情数值、列表及涨跌 Variant 不产生错误告警。
- **US-03**：支持 Live、Screenshot、Hybrid 和 Long Screenshot 实际证据。
- **US-04**：输出可直接交付的 Excel 与红框截图。
- **US-05**：一次运行多个独立 PagePair。
- **US-06**：其他服务通过公共接口调用走查能力。
- **US-07**：所有自动判断都具备可解释置信度和可复现证据。

## Agreed scope

- 一个走查可以包含多个 PagePair，但每个 PagePair 保持一个 Figma Frame 对应一个已经处于目标状态的开发页面；
- 设计侧提供可访问的 Figma Frame、组件和 Variant 元数据；
- H5 不强制提供额外语义属性，系统按黑盒页面设计；
- 首批动态类型为行情数值、行情列表、涨跌/平盘 Variant 和异步加载；
- Agent 不点击页面寻找状态，不判断业务数据正确性，不直接改变门禁；
- 默认只审查 Figma 与开发页面可靠匹配的交集元素；
- 单页目标耗时为 15–20 秒；
- 公共调用采用版本化异步任务接口；
- 不建设 Jira、通知、整改状态或业务自动化测试流程。

## Source documents

- [AI UI 视觉走查需求与技术蓝图](../../docs/AI_UI_REVIEW_BLUEPRINT.md)
- [公共服务 API 设计草案](../../docs/PUBLIC_API_DESIGN.md)
- [领域上下文](../../CONTEXT.md)

## First delivery milestone

| Issue | Title | Type | Status |
| --- | --- | --- | --- |
| [01](./issues/01-run-static-page-pair-through-review-service.md) | 通过统一 ReviewService 运行现有静态 PagePair | AFK | ready-for-human |
| [02](./issues/02-build-structured-design-truth.md) | 为一个 Figma Frame 构建结构化 DesignTruth | AFK | ready-for-human |
| [03](./issues/03-match-intersection-with-evidence-confidence.md) | 采用交集匹配并输出 EvidenceConfidence | AFK | ready-for-human |
| [04](./issues/04-build-financial-h5-gold-set.md) | 建立金融 H5 人工标注样本集 | HITL | ready-for-human |
| [05](./issues/05-capture-multi-sample-live-evidence.md) | 采集多帧 Live ActualEvidence | AFK | ready-for-human |
| [06](./issues/06-normalize-dynamic-market-value.md) | 归一化单个动态行情数值 | AFK | ready-for-human |
| [07](./issues/07-verify-ambiguous-agent-hypothesis.md) | 用受限 AgentHypothesis 处理歧义动态区域 | AFK | ready-for-human |
| [08](./issues/08-map-market-variants.md) | 映射非统一命名的 MarketVariant | AFK | ready-for-human |
| [09](./issues/09-review-dynamic-market-list-template.md) | 按行模板审查动态行情列表 | AFK | ready-for-human |
| [10](./issues/10-build-screenshot-actual-evidence.md) | 使用实际截图构建 ActualEvidence | AFK | ready-for-human |
| [11](./issues/11-run-hybrid-device-screenshot-review.md) | 运行 Hybrid 设备截图走查 | AFK | ready-for-human |
| [12](./issues/12-aggregate-low-level-diffs-into-review-issues.md) | 把底层差异归并为 ReviewIssue | AFK | ready-for-human |
| [13](./issues/13-generate-excel-with-annotated-evidence.md) | 生成红框证据图与 Excel 报告 | AFK | ready-for-human |
| [14](./issues/14-run-batch-page-pairs.md) | 批量运行多个独立 PagePair | AFK | ready-for-human |
| [15](./issues/15-submit-live-review-through-public-api.md) | 通过安全异步 API 走查一个 Live PagePair | AFK | ready-for-human |
| [16](./issues/16-submit-screenshot-and-hybrid-through-public-api.md) | 通过公共 API 运行 Screenshot/Hybrid 走查 | AFK | ready-for-human |
| [17](./issues/17-support-idempotent-batch-public-reviews.md) | 支持批量公共调用与幂等提交 | AFK | ready-for-human |
| [18](./issues/18-deliver-signed-review-webhooks.md) | 发送签名完成 Webhook | AFK | ready-for-human |
| [19](./issues/19-calibrate-first-release-thresholds.md) | 校准阈值并确认首版发布标准 | HITL | ready-for-human |

## Follow-up backlog

| Issue | Title | Type | Status |
| --- | --- | --- | --- |
| [20](./issues/20-review-long-screenshots-in-tiles.md) | 分片审查长截图 | AFK | ready-for-human |
| [21](./issues/21-expose-review-service-through-mcp.md) | 提供公共 MCP 薄适配层 | AFK | ready-for-human |
| [22](./issues/22-add-native-mobile-and-mini-program-capture.md) | 接入移动端和小程序原生采集器 | HITL | ready-for-human |

## Release evidence

第一阶段发布必须使用人工标注集验证动态区域识别准确率、问题误报率和漏报率、Figma/开发元素匹配率、MarketVariant 映射率、重复运行一致性、`pending` 占比，以及单页平均和 P95 时延。
