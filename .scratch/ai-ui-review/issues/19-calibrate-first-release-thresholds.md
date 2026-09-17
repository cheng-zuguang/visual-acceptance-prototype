# 校准阈值并确认首版发布标准

Status: ready-for-human

Type: HITL

User stories: US-02, US-04, US-07

## What to build

在人工标注的金融 H5 样本集上运行首版完整走查能力，由设计人员审阅误报、漏报、动态归一化、MarketVariant、列表模板、Hybrid 对齐和 Excel 问题质量，确认最终阈值与发布标准。

## Acceptance criteria

- [ ] 全部标注样本使用相同版本的规则和模型运行
- [ ] 统计动态区域准确率与召回率、UI 问题误报率与漏报率
- [ ] 统计元素匹配率、MarketVariant 映射率、`pending` 占比和重复运行一致性
- [ ] 统计单页平均和 P95 时延，并与15–20秒目标比较
- [ ] 设计人员记录保留、删除和修改 AI 问题的比例及原因
- [ ] 阈值调整后重新运行完整样本集，避免只优化个别页面
- [ ] 形成明确的发布/不发布结论和后续未解决风险
- [ ] 最终规则版本与评测结果一并归档

## Blocked by

- [04 建立金融 H5 人工标注样本集](./04-build-financial-h5-gold-set.md)
- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)
- [07 用受限 AgentHypothesis 处理歧义动态区域](./07-verify-ambiguous-agent-hypothesis.md)
- [08 映射非统一命名的 MarketVariant](./08-map-market-variants.md)
- [09 按行模板审查动态行情列表](./09-review-dynamic-market-list-template.md)
- [11 运行 Hybrid 设备截图走查](./11-run-hybrid-device-screenshot-review.md)
- [13 生成红框证据图与 Excel 报告](./13-generate-excel-with-annotated-evidence.md)

## Comments

- 已增加页面模块对齐置信度的离线校准工具：读取单页、批量或公共 API Review JSON 与人工 `correct / false_positive` 标签，网格搜索六项权重和 High/Medium 边界，输出候选 YAML、准确率、混淆矩阵和逐样本预测。工具不覆盖生产规则。该能力只完成本任务中的页面对齐子项；完整首版发布校准仍需覆盖动态区域、UI 问题、MarketVariant、列表、Hybrid、时延与人工保留率。
- 页面对齐校准已增加按 Page/Frame 的确定性训练/验证分组、group k-fold 交叉验证，以及训练集、留出集和 out-of-fold 的“当前配置 vs 候选配置”指标差异。当前配置从各 Review 的 `scoreBreakdown` 实际权重与阈值重算，避免默认规则污染历史样本基线。
- 已增加跨折候选参数稳定性分析：输出六项权重和 High/Medium 阈值的方差、标准差、范围及近似 95% 置信区间。有效折数不足或参数标准差超限时，推荐状态为 `rejected`，CLI 只保留诊断 metrics JSON，不发布候选 YAML。
- 候选推荐现已增加 OOF 效果门禁：默认不允许平衡准确率低于当前规则，也不允许假阳性率增加。参数稳定性与两项 OOF 指标必须全部通过才发布候选 YAML；metrics JSON 保留每项门禁的当前值、候选值、差值、阈值和拒绝原因。
