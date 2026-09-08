# 分片审查长截图

Status: ready-for-agent

Type: AFK

User stories: US-03, US-04

## What to build

支持一个长 Figma Frame 与一个开发长截图的一对一审查。系统去除设备或浏览器边框，按稳定锚点和目标 viewport 分片，处理吸顶元素、懒加载和拼接空白，逐片运行现有动态与确定性审查并汇总整页结果。

## Acceptance criteria

- [ ] 长设计图和长实际图经过方向、比例和有效内容区校验
- [ ] 分片尺寸与目标 viewport 对齐，并保留长图绝对坐标
- [ ] 吸顶导航或表头不会在相邻分片中重复生成问题
- [ ] 懒加载空白和截图拼接异常可以识别并降低结论置信度
- [ ] 每个 ReviewIssue 记录分片、滚动位置和长图绝对位置
- [ ] Excel 红框图能够回溯到长图中的原始区域
- [ ] 自动化测试覆盖普通长页、吸顶页和对齐失败

## Blocked by

- [10 使用实际截图构建 ActualEvidence](./10-build-screenshot-actual-evidence.md)
- [11 运行 Hybrid 设备截图走查](./11-run-hybrid-device-screenshot-review.md)
- [13 生成红框证据图与 Excel 报告](./13-generate-excel-with-annotated-evidence.md)

## Comments
