# 页面模块对齐置信度离线校准

[简体中文](./PAGE_ALIGNMENT_CALIBRATION.md) | [English](./PAGE_ALIGNMENT_CALIBRATION.en.md)

离线校准工具读取已经生成的 Review JSON 和设计人员标注的模块映射结果，搜索
`page_alignment.confidence` 的六项权重以及 High/Medium 分级边界。工具只输出候选配置和评估指标，不读取、修改或覆盖生产验收规则。

真实金融 H5 样本应先按[金融 H5 人工金标集](../calibration/financial-h5/README.md)完成证据、动态豁免、人工问题和模块映射标注，再导出本工具使用的标签清单。草稿样本不会进入导出结果。

## 标签清单

创建一个 JSON 清单。每个 `review` 路径相对于清单文件解析，可指向：

- 单页 `CompareReport` JSON；
- 包含 `pages[].report` 的内部批量 Review JSON；
- `GET /v1/reviews/{reviewId}/result` 返回的 `pageResults[]` JSON。

```json
{
  "version": 1,
  "reviews": [
    {
      "review": "./reviews/fed-review.json",
      "labels": [
        {
          "clientPageId": "fed-home",
          "frameId": "0:72",
          "designParentFigmaNodeId": "0:72",
          "label": "correct"
        },
        {
          "clientPageId": "fed-home",
          "frameId": "0:72",
          "designParentFigmaNodeId": "12:340",
          "regionIndex": 6,
          "label": "false_positive"
        }
      ]
    }
  ]
}
```

标签语义：

- `correct`：该 `PageAlignmentRegionDecision` 的模块映射正确，可以作为可信自动映射；
- `false_positive`：该模块映射错误，例如把“利率观察”映射到“最新货币政策”；
- `clientPageId`：Review 包含多个 PagePair 时必填；
- `frameId`：建议填写，用于确保同一个 Figma Frame 的样本不会跨训练集、验证集或交叉验证折；
- `regionIndex`：同一页内有多个相同 `designParentFigmaNodeId` 时必填，例如长截图分片产生重复模块。索引对应 `matching.pageAlignment.regions`。

数据集必须同时包含至少一个 `correct` 和一个 `false_positive`。每条区域还必须包含完整的 `scoreBreakdown`；旧报告需要重新走查后才能用于校准。

## 执行

只在终端输出评估结果；仅当稳定性门禁通过时追加候选 YAML，不创建文件：

```bash
npm run calibrate:alignment -- --labels ./calibration/labels.json
```

显式指定输出目录：

```bash
npm run calibrate:alignment -- \
  --labels ./calibration/labels.json \
  --output ./outputs/page-alignment-calibration \
  --weight-step 0.1 \
  --threshold-step 0.05 \
  --validation-ratio 0.2 \
  --cross-validation-folds 5 \
  --minimum-stability-folds 3 \
  --max-weight-stddev 0.15 \
  --max-threshold-stddev 0.10 \
  --min-oof-balanced-accuracy-delta 0 \
  --max-oof-false-positive-rate-increase 0 \
  --seed difflab-2026
```

输出目录包含：

- `page-alignment-metrics.json`：始终生成，包含候选配置、准确率、混淆矩阵、跨折参数统计、推荐结论、搜索参数和逐样本预测；
- `page-alignment-candidate.yaml`：仅在候选参数稳定性通过时生成，作为可人工审阅、合并的候选 YAML 片段。

若稳定性不足，工具会删除同一输出目录中可能遗留的旧 `page-alignment-candidate.yaml`，防止误用。工具不会自动更新 `acceptance.example.yaml`、调用方规则或任何线上配置。

## Page/Frame 分组验证

每条样本会得到一个稳定的 `groupId`。分组身份按以下顺序确定：

1. 标签中显式提供的 `frameId`；
2. 单页 Review 的 `source.design`；
3. `clientPageId`；
4. Review id。

同一组中的所有模块只能整体进入训练集或验证集，不能按元素随机拆分。默认使用固定种子和 20% 分组留出集；最终候选权重和阈值只在训练组上搜索，然后分别输出训练集与验证集指标。如果可用组太少，或拆分后训练集无法同时包含 `correct` 与 `false_positive`，工具会保留全部样本用于训练并明确输出空验证集，不制造有泄漏的验证结果。

默认还执行 5 折 group k-fold，实际折数不超过组数。每一折都：

1. 完整留出若干 Page/Frame 组；
2. 只在其余组上重新搜索候选；
3. 在未见过的组上计算指标。

`crossValidation.candidateMetrics` 合并每个组恰好一次的 out-of-fold 预测，更适合判断调参流程能否泛化。单次留出集用于检验最终导出的候选配置；两者用途不同。

可通过相同 `--seed` 复现分组。生产校准时应把属于同一页面族、同一 Frame 或同一次长截图的样本标为同一个 `frameId`，避免视觉结构近乎相同的样本泄漏到两侧。

## 候选参数稳定性门禁

每个有效交叉验证折都会独立搜索一套候选参数。`crossValidation.parameterStability` 汇总六项权重以及 `highMin`、`mediumMin`，每个参数包含：

- 均值、样本方差、样本标准差、最小值和最大值；
- 基于 `mean ± 1.96 × standardDeviation / √foldCount`、并限制在 0–1 范围内的近似 95% 置信区间。

默认至少需要 3 个有效折；任一权重的跨折标准差不得超过 `0.15`，任一阈值的跨折标准差不得超过 `0.10`。可分别通过 `--minimum-stability-folds`、`--max-weight-stddev` 和 `--max-threshold-stddev` 调整。

稳定性评估有三种结果：

| `assessment` | 含义 | `recommendation.status` |
| --- | --- | --- |
| `stable` | 有效折数充足，且所有参数波动都在上限内 | 继续检查 OOF 效果门禁 |
| `unstable` | 至少一个权重或阈值的标准差超限 | `rejected` |
| `insufficient-folds` | 有效折数少于最低要求 | `rejected` |

`unstableParameters` 会逐项记录参数名、类别、实际标准差和配置上限。被拒绝不代表搜索程序失败：诊断候选和全部指标仍保留在 metrics JSON 中，但不会发布候选 YAML。

## OOF 效果门禁

参数稳定并不代表候选效果优于当前规则。推荐候选还必须同时通过两项基于 out-of-fold 预测的效果门禁：

1. `candidate balanced accuracy - current balanced accuracy ≥ minimum delta`，默认最小差值为 `0`，即不允许平衡准确率退化；
2. `candidate false-positive rate - current false-positive rate ≤ maximum increase`，默认最大增量为 `0`，即不允许误映射进入 High 的比例增加。

假阳性率按 `FP / (FP + TN)` 计算。可通过 `--min-oof-balanced-accuracy-delta` 要求候选至少提升一定幅度，通过 `--max-oof-false-positive-rate-increase` 容许明确、有限的假阳性率变化。前者范围为 -1 到 1，后者范围为 0 到 1。

`recommendation.gates` 对三项门禁分别输出：

- `parameterStability`：跨折参数是否稳定；
- `oofBalancedAccuracy`：是否已评估、当前值、候选值、差值和最低差值；
- `oofFalsePositiveRate`：是否已评估、当前值、候选值、差值和最大允许增量。

只有参数稳定性、OOF 平衡准确率和 OOF 假阳性率三项全部通过，`recommendation.status` 才是 `recommended`。任一项失败都会返回 `rejected`，并在 `reasons` 中列出所有已评估的失败原因。

## 搜索与指标

六项非负权重在总和为 1 的单纯形网格上搜索，默认步长为 `0.1`。High/Medium 边界默认按 `0.05` 搜索，并保持 `high_min > medium_min`。候选分数使用与线上相同的计算：

```text
candidateScore = round(min(baseScoreCap, Σ(componentValue × candidateWeight)), 2)
```

优化排序依次使用：

1. 平衡准确率；
2. 普通准确率；
3. `correct → high` 与 `false_positive → low` 的分层分离率；
4. 更少的假阳性；
5. 更宽的 High/Medium 人工复核区间。

二分类指标把 `correct` 视为正类，把候选等级 `high` 视为自动接受；`medium` 和 `low` 都表示暂不自动接受：

| 指标 | 含义 |
| --- | --- |
| TP | 正确映射被判为 High |
| TN | 误映射被保留为 Medium/Low |
| FP | 误映射被判为 High |
| FN | 正确映射被保留为 Medium/Low |

`levelConfusionMatrix` 额外保留两种人工标签在 High/Medium/Low 中的分布。

`evaluation.training`、`evaluation.validation` 和 `evaluation.crossValidation` 都同时输出：

- `current`：按每条 Review 的 `scoreBreakdown` 中实际权重和阈值重算；
- `candidate`：候选配置的指标；
- `delta`：候选减当前，包括 Accuracy、Balanced Accuracy、Precision、Recall、Specificity 和混淆矩阵变化。

因此混合了不同历史规则版本的样本仍可比较，但建议同一轮发布校准使用同一规则版本，避免基线含义不一致。

当前人工标签只有“正确/误报”二类，因此只能监督学习 High 自动接受边界和 Medium 人工复核边界。`low_min` 在现有三等级实现中是分数域下界，候选固定为 `0`；若未来需要独立学习 Low 与“证据不足”的边界，应先增加第三种人工标签和第四种运行时状态，不能从二类标签中伪造该信号。

## 使用建议

- 标签应来自不同页面、模块、动态状态和采集日期，避免只拟合一个页面；
- 同一页面的高度相关分片不要随机拆散到训练集和验证集；
- 重点观察 FP，而不是只看准确率；错误模块映射进入 High 的代价通常高于正确映射停留在 Medium；
- 候选 YAML 必须在独立保留样本上复跑，并由设计人员确认后再人工合并；
- 保存标签清单、Review JSON、候选 YAML 和指标 JSON，以便规则版本可追溯。
