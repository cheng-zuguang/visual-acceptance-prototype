# 用受限 AgentHypothesis 处理歧义动态区域

Status: ready-for-human

Type: AFK

User stories: US-02, US-07

## What to build

对确定性检测仍有歧义的动态区域调用一次 Agent，要求它输出结构化 AgentHypothesis。DeterministicVerifier 使用全部样本、Figma 绑定、几何和样式证据尝试推翻该假设；验证冲突时允许修正一次，仍不能确认则标记为待确认。

## Acceptance criteria

- [x] Agent 只接收完成歧义判断所需的最小设计和实际证据
- [x] Agent 输出符合固定 Schema，包含候选类型、绑定、策略和理由
- [x] DeterministicVerifier 独立计算置信度，不采用模型自报分数
- [x] 验证通过的归一化只能影响假设声明的区域和属性
- [x] 验证冲突时最多允许一次修正调用
- [x] Agent 不可用、超时或输出无效时仍产生确定性报告，并把相关区域标为 `pending`
- [x] 自动化测试覆盖一次通过、修正通过、验证失败和 Agent 不可用

## Blocked by

- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments

- 2026-09-08：`compareDesignToPage` 接受可注入的 `dynamicHypothesisAgent`；请求只包含单个设计/实际绑定、观测文本、几何和变化摘要，不发送整页图片或无关节点。
- 2026-09-08：Responses API 使用严格 JSON Schema 和 `store: false`。运行时再次校验候选类型、绑定、策略、仅 `text` 属性及理由。
- 2026-09-08：确定性验证器独立检查至少 3 帧、身份、几何、样式和绑定；验证冲突最多修正一次。模型不提供也不控制置信度。
- 2026-09-08：一次通过、修正通过、二次冲突、超时、非法 Schema 和 ReviewService 真实接线均有测试；53/53 测试和类型检查通过。
