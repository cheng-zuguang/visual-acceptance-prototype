# 使用实际截图构建 ActualEvidence

Status: ready-for-agent

Type: AFK

User stories: US-03, US-07

## What to build

允许设计人员使用一张或多张实际设备截图替代难以采集的 H5。系统规范化截图尺寸和设备元数据，使用 Figma 结构、OCR、视觉区域和几何证据进行一对一审查，并对缺少 DOM 或时间证据的结论设置严格置信度上限。

## Acceptance criteria

- [ ] 可以提交一张或多张 PNG/JPEG/WebP 实际截图作为 ActualEvidence
- [ ] 截图尺寸、方向、设备信息、DPR 和裁剪信息被校验并写入诊断
- [ ] 单张截图能够执行像素、区域和可证明的视觉参数检查
- [ ] 多张同状态截图能够提供动态变化证据
- [ ] 纯图像推断遵守视觉证据置信度上限
- [ ] 无法可靠识别的动态文字不会被自动忽略
- [ ] 报告明确标记证据模式为 Screenshot

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)
- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)

## Comments
