# DiffLab 视觉验收原型

简体中文 | [English](./README.en.md)

DiffLab 将 Figma Frame 或基准图片与 H5 页面放在同一视口下比对，并按照 YAML 规则生成可复现的通过/不通过结论、差异区域、DOM 定位和修改建议。

> **项目状态：可抛弃原型。** 当前目标是验证视觉比对结果是否可信，不包含账号、任务历史、数据库或生产级安全边界。原型结论与待验证问题见 [PROTOTYPE_NOTES.md](./PROTOTYPE_NOTES.md)。

## 能做什么

- 使用 Figma Frame 链接或 PNG/JPG/WebP 图片作为设计基准；
- 使用 Playwright 在固定视口、DPR 1、浅色模式下截取 H5；
- 使用设备 viewport 与 DPR 将一张开发长截图分片审查，并把问题回溯到长图绝对坐标；
- 比较可靠匹配元素的稳定区域像素相似度，并标记高密度差异区域；
- 对 Figma 节点与 DOM 执行位置、尺寸、内容、字体、文字对齐、颜色和装饰检查；
- 用至少 3 帧证据归一化单个动态行情数值，同时保留其布局、样式和溢出检查；
- 检查破损图片、横向溢出和可能被裁切的文本；
- 通过 YAML 配置阈值、严重级别、忽略区域和页面稳定条件；
- 可选调用兼容 OpenAI Responses API 的模型生成修复优先级；
- 导出独立 HTML、Markdown、JSON 和差异图 PNG。

通过/不通过只由确定性规则决定：任意 `error` 会使报告失败，`warning`、`pending` 和 AI 建议不会阻断验收。

## 快速开始

### 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`；
- npm；
- 本机 Google Chrome，或 Playwright Chromium。

```bash
npm ci
npm run dev
```

打开 <http://127.0.0.1:5173/prototype/visual-qa>。前端开发服务运行在 `5173`，API 服务运行在 `4318`。

如果没有可用的 Google Chrome，安装 Playwright Chromium：

```bash
npx playwright install chromium
```

### 先运行内置样本

在首页点击“运行内置差异样本”。样本故意制造了字号、位置、颜色、圆角和未匹配覆盖差异，正常结果应为“不通过”；未匹配项只进入覆盖率诊断。这条路径不需要 Figma Token 或真实 H5。

### 运行真实比对

准备以下输入：

1. 包含 `node-id` 的 Figma Frame 分享链接及 Figma Access Token；
2. 服务端浏览器能够访问的 HTTP/HTTPS H5 URL，或带设备 DPR/单屏高度的一张长截图；
3. 一份 YAML 验收规则，可直接使用 [acceptance.example.yaml](./acceptance.example.yaml)。

系统从 Figma Frame 构建包含渲染图、节点树、组件、Variant、Auto Layout 和样式证据的 DesignTruth。

H5 默认在同一浏览器页面会话中采集 3 帧 Live ActualEvidence。每帧保留截图、可见 DOM、computed styles、文字和几何信息，并汇总元素变化轨迹与像素方差图；可通过 `capture.samples`、`sample_interval_ms` 和 `timeout_ms` 调整，设为 1 帧时保持静态比对结果。

当至少 3 帧共同证明一个行情值只发生文字变化、元素身份/几何/样式保持稳定时，系统会对设计与实际字符像素做对称归一化。报告把稳定区域相似度、动态区域占比和采用策略分开展示；字体、字号、字重、颜色、位置、尺寸、文字对齐及裁切溢出仍参与验收。

## 提高元素匹配精度

元素匹配依次尝试：

1. `data-figma-id` 与 Figma node id 精确匹配；
2. 相同可见文本结合位置和尺寸匹配；
3. 类型、位置和尺寸启发式匹配。

建议在关键 H5 元素上写入 Figma node id：

```html
<button data-figma-id="123:456">提交</button>
```

连字符形式的 id 也会在匹配时归一化。稳定文本和结构几何候选只有达到 `match_confidence_min` 才进入交集比对；匹配低于 `high_confidence_min` 时，元素属性问题统一降级为 `pending`。像素门禁相似度只统计可靠匹配元素覆盖区域；未匹配的设计节点与开发元素只保留覆盖率统计、全屏差异线索和诊断，不生成阻断问题。

## 配置凭据与 AI

页面中的 Figma Token、AI API Key、API 地址、模型及 AI 开关会以明文缓存在当前浏览器的 `localStorage`，刷新后恢复，可通过“清除本地缓存”删除。它们只应在个人可信设备上使用，不会写入报告或服务端文件。

也可以在启动服务前设置：

| 环境变量 | 用途 | 默认值 |
| --- | --- | --- |
| `PORT` | API 服务端口 | `4318` |
| `FIGMA_TOKEN` | 服务端默认 Figma Access Token | 无 |
| `OPENAI_API_KEY` | 服务端默认 AI API Key | 无 |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 基础地址、`/responses` 或 `/models` 地址 | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 默认 AI 模型 id | `gpt-5.6-terra` |
| `DIFFLAB_AI_BINDING_TIMEOUT_MS` | 页面语义绑定超时，单位毫秒；大页面自动收紧输出条数 | `60000` |
| `DIFFLAB_AI_ENABLED` | MCP 与公共 Review 是否默认启用 AI | 根据 Key/API 地址自动判断 |
| `DIFFLAB_API_BASE_URL` | MCP 工具转发到公共 `/v1` API 的地址 | `http://127.0.0.1:4318` |
| `DIFFLAB_SERVICE_TOKEN` | 公共 API 与 MCP 共用的 Bearer 服务身份 | 无 |
| `DIFFLAB_AI_ALERT_MIN_ATTEMPTS` | 评估 AI 告警前的最小建议尝试数 | `20` |
| `DIFFLAB_AI_TIMEOUT_ALERT_RATIO` | AI 建议超时率告警阈值 | `0.2` |
| `DIFFLAB_AI_EVIDENCE_DANGLING_ALERT_RATIO` | AI 建议证据断链率告警阈值 | `0.1` |
| `DIFFLAB_MCP_ALLOWED_HOSTS` | Streamable HTTP MCP 允许的 Host 主机名，逗号分隔 | 仅本机主机名 |
| `DIFFLAB_MCP_ALLOWED_ORIGINS` | 浏览器访问 MCP 时允许的 Origin 主机名，逗号分隔 | 与 allowed hosts 相同 |
| `DIFFLAB_ALLOWED_CLIENT_IPS` | 允许访问服务的公网客户端 IP/CIDR，逗号分隔；`/api/health` 不受限 | 不限制 |
| `NODE_ENV` | 设为 `production` 时由 API 服务托管已有的 `dist/` | 未设置 |

```bash
FIGMA_TOKEN=... \
OPENAI_API_KEY=... \
OPENAI_BASE_URL=https://api.example.com/v1 \
OPENAI_MODEL=your-model \
npm run dev
```

页面输入优先于环境变量。自定义服务可以不使用 API Key，但需支持 Responses 风格的结构化输出；模型列表端点需返回 `{ "data": [{ "id": "model-id" }] }` 或顶层 `models` 数组。所选模型应同时支持图像输入、Responses API 和 JSON Schema 结构化输出。AI 未配置或调用失败时，确定性报告仍会生成。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 同时启动 Vite 前端和可热更新的 API 服务 |
| `npm run dev:client` | 只启动前端，`/api` 与 `/demo` 代理到 `4318` |
| `npm run dev:server` | 启动 API 服务及同端口的 `/mcp` Streamable HTTP 入口 |
| `npm run mcp` | 启动连接公共 `/v1` API 的 stdio MCP Server |
| `npm run validate:financial-gold-set -- --manifest <file>` | 校验金融 H5 人工金标的证据覆盖、审批和复用门禁，并可导出页面对齐校准标签 |
| `npm run calibrate:alignment -- --labels <file>` | 用人工标注 Review JSON 校准页面对齐参数，通过跨折稳定性与 OOF 效果门禁后生成候选 YAML |
| `npm run typecheck` | 执行 TypeScript 类型检查 |
| `npm run build` | 类型检查并构建前端到 `dist/` |
| `npm start` | 以生产模式启动 API，并在 `dist/` 存在时托管前端 |

生产模式的最小本机启动方式：

```bash
npm run build
npm start
```

随后访问 <http://127.0.0.1:4318/prototype/visual-qa>。

### 使用 Docker 运行

DiffLab 提供了内置 Playwright Chromium 和中文字体支持的 Docker 镜像配置，推荐使用 Docker Compose 一键启动：

```bash
# 1. 复制并按需配置环境变量（可选）
cp .env.example .env

# 2. 构建并启动容器
docker compose up -d --build
```

容器启动后访问 <http://127.0.0.1:14318/prototype/visual-qa>。Compose 默认只将端口绑定到宿主机回环地址，供本机浏览器或 Cloudflare Tunnel 访问，避免绕过 Tunnel 直接访问服务。

通过 Cloudflare Tunnel 发布时，可在 `.env` 中设置客户端 IP 白名单：

```dotenv
DIFFLAB_ALLOWED_CLIENT_IPS=203.0.113.10,198.51.100.0/24,2001:db8:abcd::/48
```

启用后，服务只信任 Cloudflare 写入的 `CF-Connecting-IP`；未携带该请求头或来源不在白名单内的请求返回 `403`。`/api/health` 始终公开。不要将容器端口重新暴露到非回环地址，否则外部调用方可能绕过 Tunnel 并伪造该请求头。

也可以直接使用 Docker CLI：

```bash
docker build -t difflab:latest .
docker run -d --name difflab --shm-size=1gb -p 127.0.0.1:14318:4318 difflab:latest
```

## 文档导航

- [Jev 建议排序实验与耗时对照](./docs/JEV_EXPERIMENT.md)
- [架构与比对流程](./docs/ARCHITECTURE.md)
- [AI UI 视觉走查需求与技术蓝图](./docs/AI_UI_REVIEW_BLUEPRINT.md)
- [YAML 验收规则参考](./docs/ACCEPTANCE_RULES.md)
- [页面模块对齐置信度离线校准](./docs/PAGE_ALIGNMENT_CALIBRATION.md)
- [HTTP API 参考](./docs/API.md)
- [公共 HTTP API 详细文档](./docs/PUBLIC_HTTP_API.md)
- [MCP 走查接口](./docs/MCP.md)
- [公共服务 API 设计与实现边界](./docs/PUBLIC_API_DESIGN.md)
- [生产部署（单容器与环境变量）](./docs/PRODUCTION_DEPLOYMENT.md)
- [开发、验证与故障排查](./docs/DEVELOPMENT.md)
- [原型验证记录](./PROTOTYPE_NOTES.md)
- [MIT License](./LICENSE)（[中文参考译本](./LICENSE.zh-CN.md)）

## 安全与范围提醒

- 旧 `/api` 路由没有认证、授权或网络隔离，只适合本机原型；
- 新 `/v1` 路由已支持租户隔离资产、Live/Screenshot/Hybrid 批量走查、幂等提交、受限并发、短期签名上传/下载和签名 Webhook；H5 与回调目标都受域名/DNS 防护；
- `/v1` 仍使用进程内任务、资产、幂等和投递记录；单实例已具备有界队列、租户限流和并发背压，但尚无对象存储、持久化队列、跨实例协调和生产密钥托管；
- `/api/compare` 会让浏览器访问请求中的任意 HTTP/HTTPS 地址，也会把凭据转发到 Figma 或配置的 AI 地址；不要把该旧路由直接暴露到不可信网络；
- H5 默认应处于目标状态；公共 Live/Hybrid 可通过服务端浏览器凭据引用注入 Headers/Cookies，但不执行交互式登录或业务状态导航；每个 PagePair 仍只对应一个 Frame、页面状态和视口；
- 字体、未识别的动态内容、异步数据、环境差异和复杂 Figma Auto Layout 都可能产生噪声，正式门禁前应使用真实业务样本校准阈值。

## 许可证

本项目采用 [MIT License](./LICENSE)。[中文译本](./LICENSE.zh-CN.md)仅供理解参考，法律效力以英文原文为准。
