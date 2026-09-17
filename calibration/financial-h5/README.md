# 金融 H5 人工金标集

该目录保存用于 DiffLab 离线评估与参数校准的真实或脱敏样本。`manifest.json` 是唯一清单入口；设计师没有确认前，样本必须保持 `draft`，且不得设置为可复用。

## 当前状态

- `fed-observer-live-draft`：已收录 2026-09-11 启用时序稳定后置锚点后的 375×2370 Review JSON。候选 `0:286`（投票模块）暂标为 `correct`，已形成 `340px` 设计流缺口、`273px` 位移阶跃、`67px` 残差和 `0.1971` 残差比；候选 `0:210`（原生导航栏）暂标为 `false_positive`。当前已具备正负标签，但仍只有 1 个 Page/Frame 分组，且缺设计师批准与测试复用授权，因此不能导出做阈值校准。
- 机构小程序 Frame `52:597`：仅有设计来源，等待对应 H5、设备截图或长截图，因此只记录在 `SOURCES.md`，尚不是样本。
- Screenshot、Hybrid、下跌和平盘 Variant 尚未覆盖；当前清单预期返回 `needs-human-review`。

## 样本组成

每个样本必须包含：

- `design`：可访问的 Figma URL 和精确 Frame id；
- `actual`：Live、Screenshot 或 Hybrid 证据及固定 viewport；
- `reviewJson`：使用当前 Review 链路生成的原始 JSON，不手工拼造；
- `expectedIssues`：设计师确认的问题位置、类别、设计值、实际值和优先级；
- `allowedDynamics`：明确“不应因内容值变化而报告”的倒计时、行情和异步列表；
- `pageAlignmentLabels`：模块映射的 `correct` / `false_positive` 真值；
- `missingModuleLabels`：结构缺失候选的 `correct` / `false_positive` 人工真值及判断理由；
- `approval` 与 `dataPolicy`：设计师批准和测试复用授权。

`allowedDynamics` 只豁免动态内容值，不豁免布局、字号、字重、颜色、图标、溢出、抖动或涨跌 Variant 错误。

## 人工标注步骤

1. 以清单中的 viewport 运行 Review，保存完整 JSON 到本目录下的 `reviews/`。
2. 设计师逐条核对报告，将真实问题写入 `expectedIssues`；删除或更正模型推断不能代替人工标签。
3. 检查 `matching.pageAlignment.regions`，按 `designParentFigmaNodeId` 标记正确映射和误映射；重复节点同时填写 `regionIndex`。
4. 检查 `matching.missingModules.candidates`，逐条填写 `missingModuleLabels`。标签必须同时引用 `designParentFigmaNodeId` 和 `regionIndex`，并说明为何属于正确缺失或误报。
5. 检查页面内所有合法动态内容是否已进入 `allowedDynamics`。
6. 确认截图与 Review JSON 不含账号、Token、Cookie、客户身份或未授权数据后，设置 `reusableInTests: true`。
7. 由设计师填写 `reviewer`、ISO 8601 格式的 `reviewedAt`，最后将 `approval.status` 改为 `approved`。

## 校验与校准

校验覆盖度和审批门禁：

```bash
npm run validate:financial-gold-set -- \
  --manifest ./calibration/financial-h5/manifest.json \
  --report ./outputs/financial-h5-gold-set-validation.json
```

退出码：`0` 表示可校准，`2` 表示数据有效但仍需人工补标，`1` 表示清单无效或命令失败。

生成现有页面对齐校准器可直接读取的标签清单：

```bash
npm run validate:financial-gold-set -- \
  --manifest ./calibration/financial-h5/manifest.json \
  --calibration-output ./outputs/financial-h5-alignment-labels.json

npm run calibrate:alignment -- \
  --labels ./outputs/financial-h5-alignment-labels.json \
  --output ./outputs/page-alignment-calibration
```

生成结构缺失阈值校准清单并搜索候选参数：

```bash
npm run validate:financial-gold-set -- \
  --manifest ./calibration/financial-h5/manifest.json \
  --missing-module-calibration-output ./outputs/financial-h5-missing-module-labels.json

npm run calibrate:missing-modules -- \
  --labels ./outputs/financial-h5-missing-module-labels.json \
  --output ./outputs/missing-module-calibration
```

校准器会比较当前配置与候选配置的准确率、平衡准确率和混淆矩阵。缺少 residual 的非阈值结构拒绝（例如 `unsupported` 或 `missing-preceding-anchor`）仍可作为硬负样本；真正参与残差/重叠阈值判断的候选必须具备完整几何。少于 3 个 Page/Frame 分组时仍输出指标和候选片段供分析，但 `recommendation.accepted` 必须为 `false`，避免单页过拟合。

导出只包含“设计师已批准 + 允许测试复用 + 有 Review JSON + 有对应人工标签”的样本；不会覆盖生产规则。
