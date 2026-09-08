# 建立金融 H5 人工标注样本集

Status: ready-for-human

Type: HITL

User stories: US-02, US-07

## What to build

选取具有代表性的真实或脱敏金融 H5 页面，建立由设计人员确认的走查标注集。样本同时覆盖真实 UI 缺陷与合法行情动态变化，为算法调试、回归测试和首版阈值提供客观基线。

## Acceptance criteria

- [ ] 样本覆盖行情数值、行情列表、涨跌/平盘 Variant、异步加载和普通静态区域
- [ ] 每个样本包含 Figma Frame、实际页面证据和设备/视口信息
- [ ] 每个预期问题包含位置、类别、设计值、实际值和优先级
- [ ] 合法动态变化被明确标注为不应报告的问题
- [ ] 样本包含至少一组 Live、一组 Screenshot 和一组 Hybrid 证据
- [ ] 数据经过脱敏并允许在项目测试环境中持续使用

## Blocked by

None - can start immediately.

## Comments
