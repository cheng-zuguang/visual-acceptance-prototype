# 开发、验证与故障排查

[简体中文](./DEVELOPMENT.md) | [English](./DEVELOPMENT.en.md)

## 技术栈

- React + Vite：配置与报告界面；
- Express + Multer：API 与内存文件上传；
- Playwright：H5 页面加载、DOM 分析和截图；
- Sharp + pixelmatch：图片规范化与像素差异；
- js-yaml：规则解析；
- TypeScript + tsx：共享类型和服务端运行时。

依赖当前使用 `latest` 版本范围，`package-lock.json` 是可复现安装的主要依据。Vite 8 要求 Node.js `^20.19.0` 或 `>=22.12.0`。

## 目录结构

```text
.
├── src/                    # DiffLab React 前端与共享类型
├── server/                 # API、采集、规则、比对、AI、报告
├── example/                # 开发时可访问的独立 Doc Store H5 样例
├── docs/                   # 项目文档
├── acceptance.example.yaml # 可复制的规则样例
├── PROTOTYPE_NOTES.md      # 产品/算法验证记录
├── vite.config.ts          # 前端端口及 API 代理
└── package.json            # 脚本和依赖
```

开发服务启动后，独立 H5 样例可通过 <http://127.0.0.1:5173/example/index.html> 打开。它不属于默认生产构建入口；稳定的端到端验证请优先使用页面中的内置差异样本。

## 本地开发

```bash
npm ci
npm run dev
```

也可以分别运行：

```bash
npm run dev:server
npm run dev:client
```

Vite 固定监听 `127.0.0.1:5173`，并把 `/api` 与 `/demo` 代理到 `127.0.0.1:4318`。修改 `PORT` 只会改变 API 监听端口，不会同步修改 Vite 代理；需要一起修改 `vite.config.ts`。

## 提交前验证

当前仓库没有自动化测试套件，最低验证集是：

```bash
npm run typecheck
npm run build
```

涉及采集或比对算法的修改还应执行以下手工回归：

1. 打开 DiffLab 并运行内置差异样本；
2. 确认结果为不通过，且包含位置、尺寸/排版、颜色/装饰和缺失元素类问题；
3. 切换左右对照、透明叠加和差异热图；
4. 导出 HTML、Markdown、JSON 和 PNG，并确认文件可打开；
5. 如修改 Figma 路径，使用一个真实且有权限的 Frame 链接验证；
6. 如修改 AI 路径，分别验证成功、未配置和上游失败三种情况，确保失败不改变确定性结论。

## 生产模式

```bash
npm run build
npm start
```

`npm start` 会设置 `NODE_ENV=production`，API 服务检测到 `dist/` 后会托管其中的前端资源，并把其他路径回退到 `index.html`。默认地址为 <http://127.0.0.1:4318>。

这只是便于本机演示的单进程模式：服务仍然只监听回环地址，也没有生产级认证、限流、日志、持久化、健康管理或浏览器隔离。

## 修改或新增规则

一条规则通常需要同步检查以下位置：

1. `src/types.ts`：必要时扩展数据结构；
2. `server/default-rules.ts`：默认 YAML、默认配置、解析和严重级别；
3. `server/capture.ts`：如果需要新的 H5 采集或静态审计数据；
4. `server/compare.ts`：触发条件、问题内容与门禁级别；
5. `acceptance.example.yaml`、`docs/ACCEPTANCE_RULES.md` 与对应英文文档：用户可见配置；
6. `server/demo.ts`：为能稳定复现的规则补充内置差异；
7. 中英文 `PROTOTYPE_NOTES`：记录样本结论和仍未回答的问题。

保持规则引擎与 AI 解耦。AI 输入可以引用规则问题，但 AI 输出不应更改 `issues`、严重级别或 `status`。

## 调试提示

### 前端提示“无法读取默认验收规则”

确认 API 服务正在 `4318` 端口运行：

```bash
curl http://127.0.0.1:4318/api/health
```

如果通过 `PORT` 改了端口，需要同步更新 `vite.config.ts` 中的代理目标。

### 浏览器无法启动

采集器先尝试本机 Google Chrome，再尝试 Playwright Chromium。安装后者：

```bash
npx playwright install chromium
```

Linux CI 环境可能还需要系统依赖，可使用 Playwright 官方安装命令提供的依赖选项。

### 页面超时或截图太早

- 提高 `capture.timeout_ms`；
- 给业务页面增加稳定的就绪标记，并配置 `wait_for_selector`；
- 提高 `settle_ms`；
- 确认目标地址是服务端浏览器能访问的地址，不要把另一个容器中的 `localhost` 当成当前主机；
- 对无法控制的时间、轮播、广告等最小动态区域使用 `ignore`。

### 字体或图片造成大面积差异

- 确认目标页面的字体和资源对无登录的全新浏览器上下文可访问；
- 避免依赖本机缓存、Cookie 或浏览器扩展；
- 检查 Figma Frame 与 H5 是否使用相同宽高；
- 用差异热图先判断是全局渲染环境问题，还是局部 CSS 问题；
- 校准 `pixel_threshold` 与 `visual_similarity_min`，但不要用过宽阈值掩盖真实结构差异。

### 元素匹配误报

优先在关键 DOM 上添加 `data-figma-id`。其次可以：

- 提高 `match_confidence_min`，拒绝更多不可靠几何匹配；
- 提高 `high_confidence_min`，让更多自动匹配问题降级为 `pending`；
- 用 `critical_figma_nodes` 明确必须出现的节点；
- 检查重复文案是否导致文本匹配选中了错误元素。

### Figma 请求失败

- 链接必须使用 `/design/`、`/file/` 或 `/proto/` 路径，并包含具体 `node-id`；
- Token 必须能读取目标文件；
- 服务端必须能访问 `api.figma.com` 及 Figma 返回的图片地址；
- Frame 渲染或尺寸超过当前原型边界时，尝试导出 PNG 走图片模式定位问题。

### AI 模型列表或建议失败

- 基础 URL 可写到 `/v1`，也可以直接写 `/responses` 或 `/models`；
- `/models` 响应必须提供可识别的模型 id；
- 建议接口要求模型支持两张图像输入、Responses API 和严格 JSON Schema 输出；
- 上游重定向会被拒绝；模型列表超时为 30 秒，建议生成超时为 60 秒；
- 本地兼容服务可以不需要 Key，但必须填写 URL；
- 查看报告的“运行诊断信息”，AI 失败应只出现在诊断中。

## 安全开发清单

在把原型扩展为共享服务前，至少应补齐：

- 目标 H5 与 AI Base URL 的域名/网段允许列表，阻止 SSRF 和内网探测；
- 用户认证、授权、CSRF 防护、限流和上传内容校验；
- 密钥托管和脱敏日志，移除浏览器明文长期缓存；
- 每次采集的浏览器/网络隔离、资源和并发限制；
- 明确的上游错误码、超时、重试和可观测性；
- 报告持久化、保留期限和敏感截图访问控制；
- 锁定依赖版本、自动化测试、阈值版本化和真实样本回归集。
