# 生产部署

本文说明如何在不使用 Docker Compose 的情况下，以单个 Docker 容器部署 DiffLab，并通过环境变量文件加载生产配置。文末也提供直接运行 Node.js 进程的替代方案。

## 推荐拓扑

```text
访问者
  ↓ HTTPS
Cloudflare
  ↓ Tunnel
127.0.0.1:14318
  ↓ Docker 端口映射
DiffLab 容器 0.0.0.0:4318
```

宿主机端口必须绑定到 `127.0.0.1`。这样只有本机和本机运行的 cloudflared 可以访问源站，外部请求不能绕过 Cloudflare 并伪造 `CF-Connecting-IP`。

## 前置条件

- Docker 已安装并正在运行；
- 当前目录是 DiffLab 仓库根目录；
- 如需公网访问，cloudflared 已将域名指向 `http://127.0.0.1:14318`；
- 生产服务器可以访问 Figma、目标 H5 和配置的 AI API。

## 1. 准备生产环境变量

从示例创建独立的生产配置：

```bash
cp .env.example .env.production
chmod 600 .env.production
```

建议至少检查以下配置：

```dotenv
# 容器内监听配置
NODE_ENV=production
HOST=0.0.0.0
PORT=4318

# 可选：仅允许这些公网客户端 IP/CIDR 通过 Cloudflare 访问
# 留空表示不限制；/api/health 始终公开
DIFFLAB_ALLOWED_CLIENT_IPS=101.95.111.30

# Figma
FIGMA_TOKEN=

# AI，可留空关闭 AI 建议
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-5.6-terra
```

`docker run --env-file` 会把文件中的变量直接注入容器，但不会执行 Shell 插值。不要给值添加不必要的引号，也不要在等号后使用 `$OTHER_VARIABLE` 期待自动展开。

### Public HTTP API 与 MCP

如需启用 `/v1` Public HTTP API，继续配置：

```dotenv
DIFFLAB_SERVICE_TOKEN=<使用 openssl rand -hex 32 生成>
DIFFLAB_TENANT_ID=default
DIFFLAB_SIGNING_SECRET=<使用 openssl rand -hex 32 生成>

# 请求体中允许引用的 Figma 凭据名称
DIFFLAB_FIGMA_CREDENTIAL_REF=figma-default
FIGMA_TOKEN=<Figma Access Token>

# Live/Hybrid Review 允许访问的目标 H5 精确主机名，逗号分隔
DIFFLAB_ALLOWED_H5_HOSTS=h5.example.com
```

分别生成两个独立随机值，不要在终端历史、日志或代码仓库中保存明文密钥：

```bash
openssl rand -hex 32
openssl rand -hex 32
```

如需通过 `https://difflab.codeshell.online/mcp` 使用 Streamable HTTP MCP，还应配置：

```dotenv
DIFFLAB_API_BASE_URL=http://127.0.0.1:4318
DIFFLAB_MCP_ALLOWED_HOSTS=difflab.codeshell.online
DIFFLAB_MCP_ALLOWED_ORIGINS=difflab.codeshell.online
```

Public API 的 Bearer Token 与 IP 白名单是两层独立保护，建议同时启用。IP 白名单不能替代 `DIFFLAB_SERVICE_TOKEN`。

## 2. 构建生产镜像

使用不可变版本标签便于回滚：

```bash
docker build -t difflab:2026-09-17 .
```

镜像构建阶段会执行 TypeScript 类型检查和 Vite 前端构建；运行镜像包含 Playwright Chromium、中文字体和健康检查。

## 3. 启动单个生产容器

```bash
docker run -d \
  --name difflab \
  --restart unless-stopped \
  --env-file .env.production \
  --shm-size=1gb \
  -p 127.0.0.1:14318:4318 \
  difflab:2026-09-17
```

说明：

- `--env-file .env.production`：加载生产环境变量；
- `--restart unless-stopped`：Docker 或主机重启后自动恢复；
- `--shm-size=1gb`：为 Chromium 页面渲染提供足够的共享内存；
- `127.0.0.1:14318:4318`：只允许本机访问宿主机端口；
- `.env.example` 中的 `HOST_PORT` 仅供 Compose 插值使用，单独 `docker run` 时由 `-p` 决定宿主机端口。

## 4. 验证部署

检查容器与内置健康检查：

```bash
docker ps --filter name=difflab
docker inspect difflab --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}'
```

验证本地源站：

```bash
curl -fsS http://127.0.0.1:14318/api/health
```

预期响应：

```json
{"ok":true,"prototype":true}
```

如已配置 Cloudflare Tunnel，再验证公网入口：

```bash
curl -i https://difflab.codeshell.online/api/health
curl -I https://difflab.codeshell.online/prototype/visual-qa
```

确认关键环境变量已进入容器：

```bash
docker exec difflab printenv DIFFLAB_ALLOWED_CLIENT_IPS
docker exec difflab printenv DIFFLAB_MCP_ALLOWED_HOSTS
```

不要用 `docker inspect` 输出全部环境变量，因为输出中可能包含 Figma Token、AI Key 和服务 Token。

## 5. IP 白名单验证

启用 `DIFFLAB_ALLOWED_CLIENT_IPS` 后：

- 白名单 IP 访问网页、`/api`、`/v1` 和 `/mcp` 时继续进入对应路由；
- 非白名单 IP 或缺少合法 `CF-Connecting-IP` 的请求返回 `403`；
- `/api/health` 始终返回健康状态，便于 Docker 和外部监控探测；
- IPv4、IPv6 和 CIDR 均受支持，多个值使用英文逗号分隔。

双栈网络可能通过 IPv4 或 IPv6 访问，应根据实际出口同时配置两类地址。修改 `.env.production` 后必须重建容器；仅重启旧容器不会重新读取环境变量文件。

## 6. 更新部署

先构建新版本，不覆盖当前版本标签：

```bash
docker build -t difflab:2026-09-18 .
```

保留旧容器作为回滚点，再启动新版本：

```bash
docker stop difflab
docker rename difflab difflab-previous

docker run -d \
  --name difflab \
  --restart unless-stopped \
  --env-file .env.production \
  --shm-size=1gb \
  -p 127.0.0.1:14318:4318 \
  difflab:2026-09-18
```

完成健康检查和业务冒烟验证后，可删除旧容器：

```bash
docker rm difflab-previous
```

## 7. 回滚

如果新版本未通过验证：

```bash
docker rm -f difflab
docker rename difflab-previous difflab
docker start difflab
curl -fsS http://127.0.0.1:14318/api/health
```

## 8. 日志与故障排查

查看实时日志：

```bash
docker logs --tail 200 -f difflab
```

常见现象：

| 现象 | 检查项 |
| --- | --- |
| 容器启动后立即退出 | `docker logs difflab`，以及 `.env.production` 中 URL、布尔值和数值格式 |
| 本地健康检查连接失败 | 容器状态、`-p 127.0.0.1:14318:4318` 和宿主机端口占用 |
| 公网返回 `502` | 本地源站未监听、端口不一致或 cloudflared 无法连接 `127.0.0.1:14318` |
| 网页/API 返回 `403` | 当前公网出口 IP 是否在 `DIFFLAB_ALLOWED_CLIENT_IPS`，以及请求是否经过 Cloudflare |
| MCP 拒绝 Host/Origin | `DIFFLAB_MCP_ALLOWED_HOSTS` 与 `DIFFLAB_MCP_ALLOWED_ORIGINS` 是否包含公网域名 |
| Public API 返回 `401` | 是否设置 `DIFFLAB_SERVICE_TOKEN` 并发送 `Authorization: Bearer <token>` |
| Live Review 拒绝目标地址 | `DIFFLAB_ALLOWED_H5_HOSTS` 是否包含目标精确主机名 |

## 9. 不使用 Docker 的替代方式

直接部署 Node.js 时需要 Node.js `^20.19.0` 或 `>=22.12.0`。服务端源码通过 `tsx` 运行，因此不能只安装 production dependencies：

```bash
npm ci
npm run build
node --env-file=.env.production --import tsx server/index.ts
```

非 Docker 模式应在 `.env.production` 中使用：

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=14318
```

这里直接监听宿主机 `14318`，因此不需要 Docker 端口映射。长期运行时应交由 systemd、launchd 或其他进程管理器托管，不建议只依赖终端会话或 `nohup`。

## 安全检查清单

- `.env.production` 权限为 `600`，且未提交到 Git；
- 宿主机端口只绑定 `127.0.0.1`；
- IP 白名单为空是否符合预期；
- Public API 已设置强随机 `DIFFLAB_SERVICE_TOKEN` 和 `DIFFLAB_SIGNING_SECRET`；
- Figma、AI、浏览器登录态和 Webhook 密钥未出现在日志及公共响应中；
- `DIFFLAB_ALLOWED_H5_HOSTS` 与 Webhook 主机白名单只包含必要目标；
- 更新前保留可回滚的镜像标签和旧容器；
- 本地与公网健康检查均通过。
