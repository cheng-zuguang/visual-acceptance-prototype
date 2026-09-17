# 使用实际截图构建 ActualEvidence

Status: ready-for-human

Type: AFK

User stories: US-03, US-07

## What to build

允许设计人员使用一张或多张实际设备截图替代难以采集的 H5。系统规范化截图尺寸和设备元数据，使用 Figma 结构、OCR、视觉区域和几何证据进行一对一审查，并对缺少 DOM 或时间证据的结论设置严格置信度上限。

## Acceptance criteria

- [x] 可以提交一张或多张 PNG/JPEG/WebP 实际截图作为 ActualEvidence
- [x] 截图尺寸、方向、设备信息、DPR 和裁剪信息被校验并写入诊断
- [x] 单张截图能够执行像素、区域和可证明的视觉参数检查
- [x] 多张同状态截图能够提供动态变化证据
- [x] 纯图像推断遵守视觉证据置信度上限
- [x] 无法可靠识别的动态文字不会被自动忽略
- [x] 报告明确标记证据模式为 Screenshot

## Blocked by

- [01 通过统一 ReviewService 运行现有静态 PagePair](./01-run-static-page-pair-through-review-service.md)
- [03 采用交集匹配并输出 EvidenceConfidence](./03-match-intersection-with-evidence-confidence.md)

## Comments

- 2026-09-08：新增 `buildScreenshotActualEvidence` 与 `ReviewService.reviewScreenshotPagePair`。实际截图规范化后作为正式像素证据；纯视觉区域映射最高 0.82 且保持 Pending，多截图变化不会自动触发文字归一化。
- 2026-09-08：上游 OCR/视觉锚点可作为 `visual-inference` 参与交集匹配和位置参数检查；匹配与问题置信度均受 0.82 上限约束。
- 2026-09-08：任务级验证通过：72 tests、TypeScript typecheck、`git diff --check`。
