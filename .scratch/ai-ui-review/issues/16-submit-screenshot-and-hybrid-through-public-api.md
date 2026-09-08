# 通过公共 API 运行 Screenshot/Hybrid 走查

Status: ready-for-agent

Type: AFK

User stories: US-03, US-06

## What to build

让外部服务通过受控资产上传实际截图，并在公共接口中创建 Screenshot 或 Hybrid Review。上传资产、走查结果和生成制品按租户隔离，调用方通过短期签名地址上传和下载大文件。

## Acceptance criteria

- [ ] 外部服务可以创建截图资产并获得短期受控上传地址
- [ ] 上传完成后校验文件类型、大小、像素总量、哈希和图片可解码性
- [ ] 只有状态为 ready 且属于当前租户的资产可以用于 Review
- [ ] 公共请求支持 Screenshot 和 Hybrid ActualEvidence
- [ ] 任务结果明确记录实际证据模式及降级原因
- [ ] 生成制品以稳定 Artifact 标识引用，下载地址短期有效
- [ ] Figma、浏览器和存储凭据只通过密钥引用使用，不进入报告和日志
- [ ] 契约测试覆盖成功上传、损坏图片、越权资产和过期地址

## Blocked by

- [10 使用实际截图构建 ActualEvidence](./10-build-screenshot-actual-evidence.md)
- [11 运行 Hybrid 设备截图走查](./11-run-hybrid-device-screenshot-review.md)
- [15 通过安全异步 API 走查一个 Live PagePair](./15-submit-live-review-through-public-api.md)

## Comments
