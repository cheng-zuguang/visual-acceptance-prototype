# 管理端 HTTP 对接协议审阅

审阅日期：2026-09-16。对象为《UIAudit-AI × DiffLab 接口对接说明》，报文版本 2.0（待双方确认并实施），共 221 行。Markdown 提取完整。本报告只审阅，不修改原说明或接口实现。

原文：[DiffLab接口对接说明.md](/Users/cc/Library/Containers/com.tencent.WeWorkMac/Data/Documents/Profiles/E6BF15B8C0FF8ED3B7A8CAAEF06B253C/Caches/Files/2026-09/60db49803473a7c0c1ca052b7a241cef/DiffLab接口对接说明.md)。下文“原文行号”均指该文件。

## 结论

管理端管理业务任务、人工复核与问题生命周期，DiffLab提供页面审查和指定问题核验，这个职责划分合理。重新提交设计与实际来源、每个 issueId 恰好返回一次、定位失败不判通过、通过也返回当前证据，均应保留。

但这是一份目标协议，不是现有 HTTP API 的可调用说明。`/v1/judge`、`/v1/issue-rechecks` 当前尚未实现；现有公共入口是异步 `/v1/reviews`、JSON 创建请求、截图资产上传及签名制品下载。接口数量、同步 HTTP 200、multipart 本身不是错误；需要明确新增适配与引擎能力的范围，不能当作改字段即可完成。

依据：[公共接口实现](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:1033)、[公共 HTTP 契约](/Users/cc/Documents/visual-acceptance-prototype/docs/PUBLIC_HTTP_API.md)、[Review 输入模型](/Users/cc/Documents/visual-acceptance-prototype/server/review.ts:50)。

## 必须先确认的缺口

### 1. 执行成功、证据不足与验收不通过没有完整映射

原文第二节、第四节、第五节（102、201–202、216–219 行）定义了技术失败和差异，但没有明确走查中的 pending 覆盖、动态内容、无法确认对应关系，以及部分采集不足的发布方式。`issues=[]` 不能单独证明整页通过；“未定位”也不等同于“确认不存在”。

现有确定性门禁会在无阻断错误但有 pending、未核验设计项／属性、实际侧未对应项或空覆盖清单时返回 `needs_review`。原文的 `ERROR=无法有效判断` 可以承载不确定性，但若统一映射成执行 FAILED，会混淆有效执行与无有效判定；`severity` 也没有 pending 映射。

建议：明确 `executionStatus`、页面／目标验收结论和 `verificationStatus` 的转换表；可新增 `NEEDS_REVIEW`，也可保留 ERROR 并用结构化原因区别证据不足与技术故障。返回覆盖摘要、未核验项及采集限制。只有覆盖核验完成才能发布 PASSED；保留已经验证的部分结果，而非所有不完整情形都清空 issues。

依据：[统一验收规则](/Users/cc/Documents/visual-acceptance-prototype/src/review-verdict.ts:4)、[ADR 0002](/Users/cc/Documents/visual-acceptance-prototype/docs/adr/0002-design-driven-coverage.md)。

### 2. 复查缺少稳定的“核验对象＋核验规则”

原文第三节（129–147 行）的 targets 主要包含 issueId、文字描述、历史坐标与图片，没有回传首次结果已有的 fingerprint、ruleId、nodeId、selector。既然 DiffLab 不记上一轮，issueId 只是管理端关联键，不能独立定位按钮或确定检查哪条规则；坐标还会随页面修复移动。

建议：每个 target 增加稳定 `fingerprint`、`ruleId`、真实设计节点身份，以及可选 selector／区域身份。支持人工创建问题时，定义结构化断言（属性、设计值、单位、容差）或明确标为人工核验请求。历史文本、devNote 和 bbox 只能辅助定位，不能作为本轮通过依据。先验证对象对应，再执行同一规则；找不到、歧义、多候选、规则不支持、设计态变化分别给受控原因。缺失模块核验必须验证模块已可靠出现，不能仅因本轮没有相同 finding 就判修复。

原文示例中页面 Figma nodeId 与问题 nodeId 都是 `1:23`，应明确是 Frame 还是具体按钮节点，避免接入方把页面身份当元素身份。

依据：[设计输入](/Users/cc/Documents/visual-acceptance-prototype/server/review.ts:50)、[匹配与覆盖类型](/Users/cc/Documents/visual-acceptance-prototype/src/types.ts:526)。

### 3. 附件优先的设计基准改变了现有能力边界

原文第二节（46–49 行）允许设计图片优先于 Figma、甚至只用图片。当前公共设计输入仅支持带凭据引用的 Figma Frame，图片不能直接替代节点层级、组件 Variant、精确样式和动态语义。当前也没有该设计图片上传协议。

这不是图片模式不可实现，而是必须作为新能力明确证据等级：仅图片无法当然地生成和结构化 Figma／DOM 证据同等级的“圆角精确 8px”“字体精确值”或完整动态／结构结论。原文结尾“AI 只负责判断及证据”还应澄清：AI 提案／解释，确定性代码核验与门禁，不能凭模型自报 confidence 决定通过。

建议：区分 `structured_figma` 和 `image_only` 能力；混合来源定义附件与 Figma 渲染、节点版本如何关联，冲突时拒绝或降级，不能悄悄用不一致来源拼接参数。返回有效基准类型、图像哈希、Figma 文件／Frame 身份及可核验能力；图片估计值须显式标明方法和误差／不确定性。

### 4. 同步 90 秒缺少总时限、重试与背压契约

原文第一节（14–16 行）要求同步返回且不返回 jobId；90 秒仅是对方当前读超时，没有服务端执行上限、排队时间、上传／导航／AI／制品耗时预算及断连后策略。现有公共 Review 默认总运行时限 120 秒，单独 AI 汇总共享 60 秒请求预算，不保证端到端在 90 秒内结束。

建议：优先让管理端后端调用现有异步 Review，对前端保留自己的业务任务接口；若双方坚持同步，规定小于链路最短超时的总预算、容量不足快速拒绝、客户端断连后取消或继续策略。新增幂等键语义：同租户、同键、相同 payload 与文件哈希返回同一执行；内容不同返回冲突。requestId 只用于链路关联，除非显式约定，否则不等于幂等。定义 429／503、Retry-After、可重试错误和最大重试次数，不能绕过现有 Review／PagePair 并发预算。

依据：[默认执行时限](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:811)、[幂等与容量拒绝](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:1033)、[AI 共享预算](/Users/cc/Documents/visual-acceptance-prototype/server/ai.ts:475)。

## 联调前应补齐的规则

### 5. 坐标输出清楚，但输入归一化不够

原文第四节（204–205 行）明确两侧 bbox 是各自整图像素坐标，这是优点；但上传图片时可省略 captureOptions（48 行），未定义 DPR、CSS viewport、裁剪、设备／浏览器栏、设计图导出倍率、方向和长图分片。375px 设计图与 1125px 实际图不是同一量纲，直接比较会产生错误尺寸／位移。

建议：上传图增加 device／viewport／DPR、可选 crop、长图单屏高度；证据图记录输出缩放与坐标空间。所有 bbox 必须指向返回的那一张不可变证据图；转换应分别处理设计／实际侧的倍率和裁剪偏移，不能简单共用同一倍率。长图保留绝对坐标、scrollY、tileIndex 与吸顶副本策略。当前二选一的 actualSource 还未覆盖“真实设备图＋H5 DOM”的 Hybrid，应明确是否一期排除。

依据：[截图归一化](/Users/cc/Documents/visual-acceptance-prototype/server/screenshot.ts:112)、[长图 HTTP 契约](/Users/cc/Documents/visual-acceptance-prototype/docs/PUBLIC_HTTP_API.md#94-长截图结果)。

### 6. 鉴权、登录态与文件安全不能只写“联调确认”

原文第一、四节（16、207 行）将鉴权和下载域名留待确认，设计／实际来源也没有凭据引用。需要登录的 H5、私有 Figma 无法仅凭 URL 使用；误抓登录页还可能被当作 UI 真值。

建议：固定服务 Bearer 身份及租户 Scope；Figma／浏览器凭据使用服务端 credentialRef，不把原始 Cookie、Token、AI Key 放到公共结果。明确 URL 主机／DNS／重定向／子资源访问策略，以及预期登录／目标页面状态。规定 multipart 的唯一 payload、文件名引用唯一性、缺失／重复文件行为、数量／字节／像素上限、真实图片解码与哈希校验。若内网 H5 是必要需求，单独约定受控部署网络策略；不能直接放开 SSRF 防护。

依据：[公共网络边界](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:389)、[凭据引用与模式验证](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:552)。

### 7. “不记历史”不代表没有证据与幂等存储

原文第一、四节（5、206–207 行）要求不记上一轮，同时要求当前整图、不可覆盖的 HTTPS 图片地址、建议至少 24 小时可下载。这在业务层不矛盾，但 DiffLab 或管理端适配层仍必须保存不可变制品和幂等执行记录。

当前 `/v1` 仅暴露 Excel 制品，状态／资产／制品在进程内；签名下载 URL 默认有效 10 分钟。仅把 TTL 改成 24 小时并不能保证重启后可下载，更不能新增整图／crop 资源。

建议：明确哪一方提供受控对象存储、何时管理端下载归档、URL expiresAt、资源 hash／sizeBytes、租户隔离、到期和重试行为。URL 授权有效期与文件保存期分别定义；存储上传失败时不得声称 pageEvidence 已就绪。24 小时不是一定不合理，但需同时覆盖持久化、权限与数据保留成本。

依据：[进程内记录及 URL 默认 TTL](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:782)、[当前制品仅 Excel](/Users/cc/Documents/visual-acceptance-prototype/server/public-api.ts:1285)。

### 8. 指纹、规则版本和证据结构不足以稳定复现

原文第四节（199、210 行）要求稳定 fingerprint，却没有生成键、命名空间、碰撞和规则版本变化策略；请求只给 ruleProfile（31、117 行），虽然响应回传 ruleVersion，却不能锁定复查的旧规则。首次返回 ruleId、文字说明和 confidence，但没有结构化 expected／actual／tolerance／measurementMethod／evidenceRefs。

建议：稳定键至少由项目／设计文件／Frame、元素或模块身份、规则及属性身份构成，不用随机数、问题标题、瞬时 bbox 或实际差值。请求支持固定规则版本或规则摘要哈希，设计基准也做版本／哈希关联。复查基准改变时明确是“原问题修复”还是“要求变化后已不适用”，不能混为一谈。相似度注明算法／版本和可审查范围，只用于描述，不直接作为页面通过阈值；confidence 使用可复现证据置信度而非模型自报。

## 小型职责映射

| 对象 | 管理端 | DiffLab／适配层 |
| --- | --- | --- |
| 用户、业务任务、人工复核、问题关闭 | 持有并流转 | 不负责 |
| 页面审查执行、资源预算、取消／超时 | 关联业务页面与执行 | 保留必要执行状态与并发控制 |
| 复查目标 | 提交原问题身份及新证据 | 核验对应关系并重跑指定规则 |
| 证据归档 | 下载后保存与展示 | 提供当轮不可变、受控下载制品 |

## 建议实施顺序

先冻结判定状态映射、复查目标身份、设计基准能力和同步／异步选择，再补齐安全、坐标、制品与幂等细节。随后用整页通过、确定性差异、待核验、登录失效、目标移动／歧义／消失、设计变更、DPR 不同、长图、超时重试、部分复查失败和制品过期等场景验证契约。

只需要两个业务入口不意味着只需要两个 HTTP 资源，也不意味着需要 DiffLab 管理业务工作流。若新增接口，应保持 HTTP 层为薄适配，比较与复查核验复用 ReviewService；不另起一套 AI 判定链。

## 证据状态与范围

原文约定及代码行为属于直接证据；风险后果、建议字段与实施顺序属于据此推导的设计建议。没有访问示例域名、调用外部系统或修改接口，没有用合成报文证明真实准确率。正文采用 doc-analyzer 的轻量审阅模式，省略无必要的术语表与大图。
