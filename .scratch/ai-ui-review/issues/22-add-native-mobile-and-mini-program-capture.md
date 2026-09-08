# 接入移动端和小程序原生采集器

Status: ready-for-human

Type: HITL

User stories: US-03

## What to build

确定并实现 iOS、Android、鸿蒙和小程序的原生 ActualEvidence 采集边界。根据各平台可获得的截图、可访问性树、设备参数和安装制品能力，为同一个 PagePair 审查核心提供标准化证据，并明确哪些平台只能使用 Screenshot 模式。

## Acceptance criteria

- [ ] 对每个平台记录可用自动化驱动、截图、层级树和样式参数能力
- [ ] 设计人员和移动端研发共同确认安装、授权、登录态和测试设备边界
- [ ] 每个平台至少有一个 Figma Frame 与原生页面的一对一演示样本
- [ ] 采集结果转换为统一 ActualEvidence，不复制确定性比对逻辑
- [ ] 只能获得截图的平台遵守 Screenshot 置信度上限
- [ ] 设备型号、系统版本、屏幕尺寸、DPR 和安全区写入运行证据
- [ ] 形成各平台的支持矩阵、已知限制和后续自动化计划

## Blocked by

- [10 使用实际截图构建 ActualEvidence](./10-build-screenshot-actual-evidence.md)
- [11 运行 Hybrid 设备截图走查](./11-run-hybrid-device-screenshot-review.md)

## Comments
