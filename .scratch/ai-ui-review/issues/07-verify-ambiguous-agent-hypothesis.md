# 用受限 AgentHypothesis 处理歧义动态区域

Status: ready-for-agent

Type: AFK

User stories: US-02, US-07

## What to build

对确定性检测仍有歧义的动态区域调用一次 Agent，要求它输出结构化 AgentHypothesis。DeterministicVerifier 使用全部样本、Figma 绑定、几何和样式证据尝试推翻该假设；验证冲突时允许修正一次，仍不能确认则标记为待确认。

## Acceptance criteria

- [ ] Agent 只接收完成歧义判断所需的最小设计和实际证据
- [ ] Agent 输出符合固定 Schema，包含候选类型、绑定、策略和理由
- [ ] DeterministicVerifier 独立计算置信度，不采用模型自报分数
- [ ] 验证通过的归一化只能影响假设声明的区域和属性
- [ ] 验证冲突时最多允许一次修正调用
- [ ] Agent 不可用、超时或输出无效时仍产生确定性报告，并把相关区域标为 `pending`
- [ ] 自动化测试覆盖一次通过、修正通过、验证失败和 Agent 不可用

## Blocked by

- [06 归一化单个动态行情数值](./06-normalize-dynamic-market-value.md)

## Comments
