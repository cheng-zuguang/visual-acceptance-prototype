# Jev 建议排序实验

第一版仅替换 ReviewIssue 的 AI 建议排序。Jev 接收已发布问题或已验证位移的模块摘要，以一条证据一个 Noul 问题批量判断处理紧迫性；代码按概率稳定排序。概率不写入 EvidenceConfidence，不改问题严重级别或验收结论。

## 架构

HTTP、MCP、批量和本地调用 → `ReviewService` → 选择 OpenAI 或 Jev 建议提供方 → 共享证据边界与建议组装 → `createReport` 再次验证引用。

- `server/ai-advice.ts`：共享证据清单、强制缺失/待核验模块覆盖、确定性文案组装。
- `server/ai.ts`：现有 OpenAI Responses 调用；保留视觉绑定和动态假设。
- `server/jev.ts`：固定 TypeSafe HTTPS 接口，文本摘要批量评分。每批最多 48 个问题，状态按约 24 KB UTF-8 分批；每个 PagePair 最多 2 个同时在途请求，共享 60 秒总时限。所有证据都会评分，最后取前 5 项，并额外补齐所有强制覆盖问题。
- `server/ai-review-config.ts`：服务端提供方选择和共享启用默认值。Jev Key 可通过本地原型的临时 overrides 传递，不持久化或返回。
- `server/review.ts`：统一编排和计时；MCP、HTTP 不增加专用比较逻辑。

Jev 不接收图片。最终建议使用原始证据中的文案，待核验模块保持条件性措辞。失败批次会取消其余在途请求；超时、429、无效答案会产生既有 `aiAdviceRejection`，保留确定性报告。本实验不自动重试或回退到 OpenAI，避免隐藏失败和额外等待；恢复原提供方只需改配置。

## 界面配置

在第一步展开「凭据与 AI 配置」，进入「建议排序」：可跟随服务端配置、使用 OpenAI 兼容模型或选择 Jev。选择 Jev 后可以填写 TypeSafe API Key 和模型；留空沿用服务端值。配置仅当前页面有效，刷新或清除凭据会重置；Jev 密钥不写入浏览器缓存。

网页普通走查和内置样本都支持此次调用的覆盖值，仅 `/api` 本地原型入口接受，公共 `/v1` 和 MCP 仍使用服务端配置。AI 关闭时不会提交 Jev 配置。Jev 不使用上方 OpenAI 的密钥、地址或模型。

## 启用

在本机 `.env` 填写（不要提交真实 Key）：

```dotenv
DIFFLAB_AI_ADVICE_PROVIDER=jev
TYPESAFE_API_KEY=你的真实密钥
TYPESAFE_MODEL=jev-1.13.0
DIFFLAB_AI_ENABLED=true
```

Docker 使用 `docker compose up -d --build` 重新加载。直接运行服务端时，Node 22 可显式加载环境文件：

```bash
node --env-file=.env --import tsx server/index.ts
```

需要前端开发服务器时另开终端运行 `npm run dev:client`。已有 shell 环境变量优先于 `--env-file`；切换实验配置时确认旧环境没有覆盖它。`npm run dev` 本身不会自动读取 `.env` 到服务端进程。

网页提交时勾选 AI 审查；公共 API/MCP 使用共享默认值。保留 `OPENAI_*` 配置可继续运行原有视觉绑定和动态假设。只配置 Jev Key 时，确定性审查和 Jev 排序可运行，但 OpenAI 语义能力不会因此启用。

恢复基线：将 `DIFFLAB_AI_ADVICE_PROVIDER` 改为 `openai` 并重启，使用原有 OpenAI 配置。网页未覆盖提供方时跟随此服务端选择。

## 对照实验

使用同一批 PagePair、相同采样和验收规则，固定两侧模型版本，在 OpenAI/Jev 两种配置下分别多次运行。不要在两组间改变视觉绑定配置，否则无法归因。

报告 JSON 新增可选 `phaseTimings`（毫秒）：

| 字段 | 范围 |
| --- | --- |
| `preparationMs` | 规则解析、DesignTruth 和 ActualEvidence 准备；暂不拆分 Figma 与采集 |
| `comparisonMs` | 匹配、动态验证、确定性比较和问题归并；长图还包含逐片证据构建与汇总 |
| `adviceMs` | 最终建议排序，包括失败等待；跳过时仅包含跳过判断 |

这些字段不包含最终 HTML/Markdown 序列化和批量 XLSX 导出的耗时，也不包含排队时间。语义绑定已有 `matching.semanticAgent.execution.attempts[].durationMs`，可以辅助定位比对阶段的耗时。

比较 `adviceMs` 和总 `durationMs` 的中位数/P95，同时记录失败率、强制问题覆盖、排序是否符合设计师判断。动态网页变化可能改变输入证据，需要结合问题集合检查可比性。不能用模拟接口测试耗时宣称真实模型加速。

## 验证与限制

自动化测试覆盖批量并发上限、全部证据被评分、强制覆盖、非法/缺失答案拒绝、429 不重试、凭据隔离、提供方路由和验收结论不变。真实网络延迟与中文排序质量需配置 Key 后评估。

官方接口依据（核对于 2026-09-20）：[API](https://docs.typesafe.ai/api)、[模型限制](https://docs.typesafe.ai/models)。当前模型仅支持文本；中文效果需使用本项目样本评估。摘要采用有界截取，长文本可能损失排序上下文，但完整证据及强制覆盖均保留在本地报告中。
