# 采集多帧 Live ActualEvidence

Status: ready-for-agent

Type: AFK

User stories: US-02, US-03, US-07

## What to build

让一个已处于目标状态的 H5 页面在固定浏览器环境中产生多帧 ActualEvidence。每个样本包含截图、可见 DOM、computed styles、文字和几何信息，并能形成像素及元素变化轨迹。

## Acceptance criteria

- [ ] 采样次数、间隔和总超时可配置并有安全范围
- [ ] 默认在一个浏览器上下文中采集3–5个样本
- [ ] 每个样本包含截图、元素指纹、文字、几何和样式
- [ ] 能生成像素方差图和跨样本元素变化摘要
- [ ] 持续变化页面不会因等待“完全稳定”而无限阻塞
- [ ] 单帧静态页面继续得到兼容的实际证据和结果
- [ ] 自动化测试覆盖静态页面、持续变化文本和采集超时

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)

## Comments
