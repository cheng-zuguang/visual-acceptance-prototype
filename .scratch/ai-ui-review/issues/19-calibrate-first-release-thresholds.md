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
