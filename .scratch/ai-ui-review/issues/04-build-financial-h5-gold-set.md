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

- 2026-09-10：已实现版本化金标清单校验器、CLI 和 PageAlignment 校准清单导出；草稿、缺失 Review JSON、凭据 URL、越界证据文件及未显式标注的动态内容均不能静默进入校准。
- 2026-09-10：已将“美联储观察” Figma `0:72`、对应 H5 和原始 Review JSON 登记为 Live 草稿，并将机构小程序 Figma `52:597` 登记为待配对来源。该 Review 尚无 `matching.pageAlignment.regions`，需重新走查后再做对齐标签。
- 2026-09-11：已为尾部缺失增加经过 temporal-consistency 验证的后置结构锚点回退，并收录重新走查的 Review JSON。`0:286` 投票模块候选暂标为正确缺失，已形成 `340px` 设计流缺口、`273px` 位移阶跃、`67px` residual（比例 `0.1971`）；`0:210` 原生导航暂标为误报。两条标签仍待设计师批准，且当前仅 1 个 Page/Frame 分组；不会用 `废` 页历史 Frame 凑满 3 组。
- 仍需设计人员确认问题真值与模块映射，补充 Screenshot、Hybrid、下跌和平盘样本，并确认数据可长期用于测试；因此保持 `ready-for-human`，不勾选验收项。
