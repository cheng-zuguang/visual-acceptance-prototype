# 运行 Hybrid 设备截图走查

Status: ready-for-agent

Type: AFK

User stories: US-03, US-07

## What to build

同时使用实际设备截图和 H5 URL 构建 ActualEvidence。设备截图作为正式实际图，H5 的多帧 DOM 和样式作为动态识别证据；服务通过稳定视觉锚点和几何变换对齐两者，并只在对齐可信时投影 DOM 区域。

## Acceptance criteria

- [ ] Hybrid 输入要求同时包含 H5 URL 和至少一张实际设备截图
- [ ] H5 采集使用与设备截图相符的 viewport 配置
- [ ] 标题、导航、表头等稳定锚点用于估算截图和 H5 的几何映射
- [ ] 对齐质量和残差被量化并写入 EvidenceConfidence
- [ ] 正式像素结论以实际设备截图为准
- [ ] 对齐不足时安全降级为 Screenshot 模式，不错误迁移 DOM 区域
- [ ] 自动化测试覆盖高质量对齐、比例偏差和完全不同页面状态

## Blocked by

- [05 采集多帧 Live ActualEvidence](./05-capture-multi-sample-live-evidence.md)
- [10 使用实际截图构建 ActualEvidence](./10-build-screenshot-actual-evidence.md)

## Comments
