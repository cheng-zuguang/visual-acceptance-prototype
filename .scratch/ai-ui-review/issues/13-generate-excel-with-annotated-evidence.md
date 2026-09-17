# 生成红框证据图与 Excel 报告

Status: ready-for-human

Type: AFK

User stories: US-04

## What to build

为一个走查结果生成可交付 Excel。主表按 ReviewIssue 一行一个修改项，嵌入统一裁剪范围的设计图和开发图红框证据，并提供页面汇总、运行信息和生效规则快照。

## Acceptance criteria

- [x] Excel 文件名采用“走查项目名称UI走查结果”
- [x] 主表包含序号、页面名称、差异位置、设计表现、开发表现、修改内容、两张红框图和优先级
- [x] 技术字段包含规则类型、EvidenceConfidence、Figma Node ID、开发元素指纹和动态策略
- [x] 设计图与开发图使用可对应的裁剪范围并清晰标出问题区域
- [x] 页面汇总包含每页结论、相似度、问题数量和待确认数量
- [x] 运行信息包含证据模式、viewport、耗时和诊断
- [x] 规则快照记录实际生效配置
- [x] 生成文件能够被常用表格软件打开并通过结构与视觉检查

## Blocked by

- [12 把底层差异归并为 ReviewIssue](./12-aggregate-low-level-diffs-into-review-issues.md)

## Comments

- `server/excel-report.ts` 生成四张工作表和成对红框裁剪图；样例经 ExcelJS 结构回读、Artifact Tool 内容检查及 macOS Quick Look/LibreOffice 打开验证。
