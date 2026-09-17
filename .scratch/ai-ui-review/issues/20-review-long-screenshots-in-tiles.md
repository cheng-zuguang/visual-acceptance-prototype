# 分片审查长截图

Status: ready-for-human

Type: AFK

User stories: US-03, US-04

## What to build

支持一个长 Figma Frame 与一个开发长截图的一对一审查。系统去除设备或浏览器边框，按稳定锚点和目标 viewport 分片，处理吸顶元素、懒加载和拼接空白，逐片运行现有动态与确定性审查并汇总整页结果。

## Acceptance criteria

- [x] 长设计图和长实际图经过方向、比例和有效内容区校验
- [x] 分片尺寸与目标 viewport 对齐，并保留长图绝对坐标
- [x] 吸顶导航或表头不会在相邻分片中重复生成问题
- [x] 懒加载空白和截图拼接异常可以识别并降低结论置信度
- [x] 每个 ReviewIssue 记录分片、滚动位置和长图绝对位置
- [x] Excel 红框图能够回溯到长图中的原始区域
- [x] 自动化测试覆盖普通长页、吸顶页和对齐失败

## Blocked by

- [10 使用实际截图构建 ActualEvidence](./10-build-screenshot-actual-evidence.md)
- [11 运行 Hybrid 设备截图走查](./11-run-hybrid-device-screenshot-review.md)
- [13 生成红框证据图与 Excel 报告](./13-generate-excel-with-annotated-evidence.md)

## Comments

- 2026-09-08：新增 `server/long-screenshot.ts` 与 `ReviewService.reviewLongScreenshotPagePair`。长图按设备 viewport 分片，最后一片补齐但保留有效高度；问题映射回绝对坐标，并抑制高置信吸顶锚点副本。
- 2026-09-08：懒加载空白和 viewport 边界重复条带生成结构化质量异常、Pending 问题及置信度上限；公共 `/v1`、本机 Web UI、批量 Review 和 Excel 均已接入 Long Screenshot。
- 2026-09-09：Long Screenshot 可选携带 H5 URL 与凭据引用。Playwright 在同一会话按每片 `scrollY` 采集多帧 Live ActualEvidence，逐片与上传长图构建 Hybrid；未可靠对齐的分片安全降级 Screenshot，报告输出有效模式、Hybrid 分片数和逐片对齐证据。
