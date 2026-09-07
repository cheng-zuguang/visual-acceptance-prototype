# DiffLab 视觉验收原型

简体中文 | [English](./README.en.md)

DiffLab 将 Figma Frame 或基准图片与 H5 页面放在同一视口下比对，并按照 YAML 规则生成可复现的通过/不通过结论、差异区域、DOM 定位和修改建议。

> **项目状态：可抛弃原型。** 当前目标是验证视觉比对结果是否可信，不包含账号、任务历史、数据库或生产级安全边界。原型结论与待验证问题见 [PROTOTYPE_NOTES.md](./PROTOTYPE_NOTES.md)。

## 能做什么

- 使用 Figma Frame 链接或 PNG/JPG/WebP 图片作为设计基准；
- 使用 Playwright 在固定视口、DPR 1、浅色模式下截取 H5；
- 比较整体像素相似度，并标记高密度差异区域；
- 对 Figma 节点与 DOM 执行位置、尺寸、内容、排版、颜色和装饰检查；
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

在首页点击“运行内置差异样本”。样本故意制造了字号、位置、颜色、圆角和缺失元素差异，正常结果应为“不通过”。这条路径不需要 Figma Token 或真实 H5。

### 运行真实比对

准备以下输入：

1. 包含 `node-id` 的 Figma Frame 分享链接及 Figma Access Token，或一张不超过 25 MB、宽高不超过 6000 px 的基准图；
2. 服务端浏览器能够访问的 HTTP/HTTPS H5 URL；
3. 一份 YAML 验收规则，可直接使用 [acceptance.example.yaml](./acceptance.example.yaml)。

图片基准没有节点、文本和样式元数据，因此只执行像素比对和 H5 静态审计；需要元素级定位和属性比较时应使用 Figma Frame。

## 提高元素匹配精度

元素匹配依次尝试：

1. `data-figma-id` 与 Figma node id 精确匹配；
2. 相同可见文本结合位置和尺寸匹配；
3. 类型、位置和尺寸启发式匹配。

建议在关键 H5 元素上写入 Figma node id：

```html
<button data-figma-id="123:456">提交</button>
```

连字符形式的 id 也会在匹配时归一化。自动匹配低于 `high_confidence_min` 时，原本配置为 `error` 的元素属性问题会降级为 `pending`，避免低置信度误报直接阻断；其他严重级别保持不变。

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
| `npm run dev:server` | 只启动 API 服务 |
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

容器启动后访问 <http://127.0.0.1:14318/prototype/visual-qa>（宿主机暴露端口已配置为 `14318`，避免端口冲突）。

也可以直接使用 Docker CLI：

```bash
docker build -t difflab:latest .
docker run -d --name difflab --shm-size=1gb -p 14318:4318 difflab:latest
```

## 文档导航

- [架构与比对流程](./docs/ARCHITECTURE.md)
- [YAML 验收规则参考](./docs/ACCEPTANCE_RULES.md)
- [HTTP API 参考](./docs/API.md)
- [开发、验证与故障排查](./docs/DEVELOPMENT.md)
- [原型验证记录](./PROTOTYPE_NOTES.md)
- [MIT License](./LICENSE)（[中文参考译本](./LICENSE.zh-CN.md)）

## 安全与范围提醒

- 服务只监听 `127.0.0.1`，没有认证、授权、限流或租户隔离；
- `/api/compare` 会让浏览器访问请求中的任意 HTTP/HTTPS 地址，也会把凭据转发到 Figma 或配置的 AI 地址；不要把本原型直接暴露到不可信网络；
- H5 必须在无需交互登录的默认静态状态下可访问；当前一次只验收一个 Frame 和一个视口；
- 字体、动态图、异步数据、环境差异和复杂 Figma Auto Layout 都可能产生噪声，正式门禁前应使用真实业务样本校准阈值。

## 许可证

本项目采用 [MIT License](./LICENSE)。[中文译本](./LICENSE.zh-CN.md)仅供理解参考，法律效力以英文原文为准。
