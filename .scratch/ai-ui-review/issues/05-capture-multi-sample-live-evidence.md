# 采集多帧 Live ActualEvidence

Status: ready-for-human

Type: AFK

User stories: US-02, US-03, US-07

## What to build

让一个已处于目标状态的 H5 页面在固定浏览器环境中产生多帧 ActualEvidence。每个样本包含截图、可见 DOM、computed styles、文字和几何信息，并能形成像素及元素变化轨迹。

## Acceptance criteria

- [x] 采样次数、间隔和总超时可配置并有安全范围
- [x] 默认在一个浏览器上下文中采集3–5个样本
- [x] 每个样本包含截图、元素指纹、文字、几何和样式
- [x] 能生成像素方差图和跨样本元素变化摘要
- [x] 持续变化页面不会因等待“完全稳定”而无限阻塞
- [x] 单帧静态页面继续得到兼容的实际证据和结果
- [x] 自动化测试覆盖静态页面、持续变化文本和采集超时

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)

## Comments

- 2026-09-08：按 TDD 新增 `LiveActualEvidence`。默认在同一个 browser context、page 和 document 中采集 3 帧，`samples`、`sample_interval_ms` 和覆盖会话初始化/采样/等待的 `timeout_ms` 均有安全范围。
- 2026-09-08：每帧保留截图、可见 DOM、computed styles、文字和几何，并生成稳定元素指纹；输出跨帧文字/几何/样式变化摘要和 PNG 像素方差图。
- 2026-09-08：持续变化页面只进行有界布局稳定探测，不等待“完全稳定”；总预算到期会关闭已打开会话，初始化超时后迟到的会话也会立即关闭。
- 2026-09-08：`ReviewService` 与确定性比对器已迁移到 Live ActualEvidence；比对器使用 canonical sample，`samples: 1` 保持静态单帧结果。
- 2026-09-08：验证通过：32/32 自动化测试（含真实 Playwright 动态行情页）、TypeScript 类型检查、生产构建与 `git diff --check`。
