# YAML 验收规则参考

[简体中文](./ACCEPTANCE_RULES.md) | [English](./ACCEPTANCE_RULES.en.md)

YAML 是 DiffLab 的唯一门禁来源。AI 只解释已产生的问题，不会新增、删除或改变通过/不通过结论。

完整默认配置见 [`acceptance.example.yaml`](../acceptance.example.yaml)，运行时也可通过 `GET /api/default-rules` 获取。

## 完整结构

```yaml
viewport: auto

thresholds:
  visual_similarity_min: 0.95
  pixel_threshold: 0.10
  position_tolerance_px: 4
  size_tolerance_px: 4
  font_size_tolerance_px: 1
  color_delta_e: 3
  match_confidence_min: 0.72
  high_confidence_min: 0.86

page_alignment:
  missing_module:
    minimum_horizontal_overlap_ratio: 0.50
    maximum_residual_ratio: 0.15
  confidence:
    weights:
      stability_coverage: 0.25
      anchor_sufficiency: 0.20
      inlier_ratio: 0.30
      residual_quality: 0.15
      dynamic_cleanliness: 0.05
      structural_support: 0.05
    levels:
      high_min: 0.86
      medium_min: 0.72
      low_min: 0

rules:
  visual_similarity: error
  position: error
  size: error
  content: error
  typography: error
  alignment: error
  color: warning
  decoration: warning
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning

ignore: []

capture:
  timeout_ms: 30000
  settle_ms: 500
  samples: 3
  sample_interval_ms: 750
  # wait_for_selector: "[data-page-ready]"
```

## 严重级别

每个 `rules` 值可设为：

| 值 | 含义 | 阻断验收 |
| --- | --- | --- |
| `error` | 必须修复的确定性问题 | 是 |
| `warning` | 建议修复的问题 | 否 |
| `pending` | 需要人工确认 | 否 |
| `info` | 仅记录信息 | 否 |
| `ignore` | 不执行或不报告此规则 | 否 |

每个匹配和问题都输出结构化 `EvidenceConfidence`，包含 `score`、`level`、`basis` 和 `reasons`。稳定文本与结构几何候选只有达到 `match_confidence_min` 才进入参数比对；低于 `high_confidence_min` 时，配置为 `error` 或 `warning` 的元素问题统一降级为 `pending`，`info` 不会被反向升级。精确 `data-figma-id` 匹配得分为 `0.99`。

## 视口

`viewport: auto` 使用 scale 1 的 Figma Frame 渲染尺寸。

可以显式覆盖：

```yaml
viewport:
  width: 1440
  height: 900
```

宽度会限制在 320–6000 px，高度会限制在 200–6000 px。覆盖后，渲染视口和 DesignTruth 节点树的相对坐标会分别按 X/Y 比例拉伸，因此宽高比变化可能引入额外差异。

## 阈值

| 字段 | 默认值 | 有效范围 | 作用 |
| --- | ---: | ---: | --- |
| `visual_similarity_min` | `0.95` | 0–1 | 可靠匹配元素稳定区域的视觉相似度下限 |
| `pixel_threshold` | `0.10` | 0–1 | `pixelmatch` 单像素差异阈值；越小越敏感 |
| `position_tolerance_px` | `4` | 0–100 | 元素左上角欧氏距离容差 |
| `size_tolerance_px` | `4` | 0–100 | 宽/高绝对差的最大值容差 |
| `font_size_tolerance_px` | `1` | 0–20 | 字号绝对差容差 |
| `color_delta_e` | `3` | 0–100 | 颜色与透明度综合差异容差 |
| `match_confidence_min` | `0.72` | 0–1 | 稳定文本或结构几何候选进入交集的最低置信度 |
| `high_confidence_min` | `0.86` | 0–1 | 元素问题保持配置的 `error`/`warning` 级别的最低置信度 |

解析器会把越界数值钳制到有效范围，而不是报错。无法解析的值回退到默认值。为避免难以察觉的配置错误，建议在报告 JSON 的 `rules` 字段中确认实际生效值。

## 页面对齐置信度

`page_alignment.confidence` 只控制 `PageAlignmentRegionDecision` 的证据评分和 `high / medium / low` 分级，不替代全局元素匹配使用的 `match_confidence_min` 与 `high_confidence_min`。六项非负权重会在解析时归一化为总和 `1`；全部为 `0` 时回退默认权重。等级阈值限制在 0–1，并保持 `low_min ≤ medium_min ≤ high_min`。

评分分量如下：

| 分量 | 默认权重 | 计算含义 |
| --- | ---: | --- |
| `stability_coverage` | `0.25` | 稳定锚点数 / 非动态候选数 |
| `anchor_sufficiency` | `0.20` | 可用锚点数相对 3 个锚点的充足程度，上限 1 |
| `inlier_ratio` | `0.30` | RANSAC 内点数 / 可用锚点数 |
| `residual_quality` | `0.15` | 严格多数成立后，残差相对 `position_tolerance_px` 的质量；无多数时为 0 |
| `dynamic_cleanliness` | `0.05` | `1 - 动态排除数 / 候选数` |
| `structural_support` | `0.05` | 标题、表头、容器等结构锚点相对 2 个锚点的支持程度，上限 1 |

最终分数为“各分量贡献之和”与原始匹配置信度上限中的较小值。每个区域在 `scoreBreakdown` 中保存分量原值、实际权重、贡献值、加权分、基础上限、最终分和本次阈值；Markdown/HTML 报告也会展示，便于导出真实样本后离线重算。

使用人工“正确/误报”标签搜索候选权重与等级边界时，参见[页面模块对齐置信度离线校准](./PAGE_ALIGNMENT_CALIBRATION.md)。校准工具只生成候选片段，不自动覆盖本文件或生产配置。

`page_alignment.missing_module` 控制结构缺失的几何复核：前后稳定锚点（或页顶边界与后续锚点）和候选模块的水平重叠率必须达到 `minimum_horizontal_overlap_ratio`；设计流缺口与位移阶跃的残差不得超过 `position_tolerance_px × 2` 和 `设计流缺口 × maximum_residual_ratio` 中的较大值。尾部候选没有普通后置模块位移时，可从最近后续同级模块回退选取至少 2 个跨帧稳定的标题、表头或容器锚点；倒计时、轮播和实时行情值先按 temporal-consistency 排除，再通过严格多数共识重算后置位移。回退区域必须达到中置信度。每个已评估候选都会写入 Review JSON 的 `matching.missingModules.candidates`，包括残差、重叠率、发布状态、拒绝原因，以及可选的 `followingAnchorSource` / `followingAnchorStats`，供人工标注与离线校准。

## 规则

| 规则 | 默认级别 | 数据来源 | 触发条件 |
| --- | --- | --- | --- |
| `visual_similarity` | `error` | 像素 + 交集匹配 | 可靠匹配元素稳定区域的相似度低于下限 |
| `position` | `error` | Figma + DOM | 元素位置差超出容差 |
| `size` | `error` | Figma + DOM | 元素宽或高差超出容差 |
| `content` | `error` | Figma + DOM | 匹配元素的规范化文本不同 |
| `typography` | `error` | Figma + DOM | 字体族不同、字号差超阈值、字重差至少 100，或行高差大于 2 px |
| `alignment` | `error` | Figma + DOM | 文字水平对齐方式不同 |
| `color` | `warning` | Figma + DOM | 前景色或背景色的 ΔE 超阈值 |
| `decoration` | `warning` | Figma + DOM | 圆角差大于 2 px、边框宽差大于 1 px，或透明度差大于 0.05 |
| `broken_image` | `error` | H5 DOM | 已完成加载的图片自然宽度为 0 |
| `horizontal_overflow` | `error` | H5 DOM | 文档宽度超出视口 1 px 以上 |
| `clipped_text` | `warning` | H5 DOM | 有文本的裁切容器 scroll 尺寸超出 client 尺寸 1 px 以上 |

差异热图仍覆盖全屏。差异区域使用内部规则名 `visual_region`，当前固定为 `pending`，不受 `rules` 配置影响。它只有单帧像素证据，`EvidenceConfidence` 上限为 `0.70`，只帮助定位，不参与失败判定。已验证动态区域会从像素分子和分母同时排除，因此报告中的分数是稳定区域相似度；没有可靠匹配的稳定像素时按 `1` 处理。

## 动态内容归一化

Live 或具有 H5 证据的 Hybrid/Long Screenshot 模式至少采集 3 个样本后，系统会发现可靠绑定且几何、样式稳定的 DynamicRegion 候选。跨帧变化的行情值和倒计时可进入候选；即使采样期间保持不变，设计值与实际值属于同一日期时间或概率格式时也可进入候选。普通静态文案差异不会调用动态 Agent。

AgentHypothesis 只能提出 `market-value`、`date-time`、`countdown` 或 `probability` 及对应的文本 NormalizationStrategy。DeterministicVerifier 随后验证绑定、语义值族、至少三帧的几何/样式稳定性和精确文字节点范围；验证失败时保留原始 `content` 问题，并额外产生 `pending`，Agent 不能直接改变门禁。

通过验证后，NormalizationPlan 会对称排除设计区域和实际区域的字符像素，并停止比较该节点的具体文案。位置、尺寸、字体族、字号、字重、行高、颜色、文字对齐、裁切溢出和结构仍会审查；相邻静态文字不会被连带忽略。支持的策略为 `normalize-market-value-text`、`normalize-date-time-text`、`normalize-countdown-text` 和 `normalize-probability-text`。

报告分别提供 `summary.stableSimilarity`、`summary.dynamicRegionAreaRatio` 和 `dynamicNormalization`。其中后者包含策略、动态区域、样本数、设计/实际框以及结构化 `EvidenceConfidence`；兼容字段 `summary.similarity` 当前与稳定区域相似度相同。

## 忽略动态区域

`ignore` 接受 CSS 选择器数组。匹配元素会在截图中隐藏，并从 DOM 提取和静态审计中排除：

```yaml
ignore:
  - "[data-dynamic]"
  - ".clock"
  - "#rotating-banner"
```

建议只忽略无法稳定控制的最小区域。选择器无效时任务不会失败，诊断信息会记录它。隐藏父元素也会让其后代不进入分析。

## 交集覆盖率

参数比对仍要求可靠对应关系，但设计侧未匹配项不再忽略。当前默认采用设计驱动覆盖：静态缺失可由完整多帧实际证据独立发布，不依赖 Agent 或位移 residual；证据不足则输出 grouped pending 问题。旧位移验证路径继续保留为额外证据。详见 [设计覆盖清单与判定边界](DESIGN_COVERAGE.md)。

Agent 被调用不等于产生了有效绑定。若 Agent 成功响应但接受绑定数为 0，确定性回退只允许处理设计语义明确支持的动态字段，并要求至少 3 帧文本发生变化、每帧均存在且几何和样式稳定；静态数值冲突、普通异文案和跨模块候选仍不匹配。已接受绑定只收紧根 Frame 下所属顶层业务模块及对应开发父容器，不影响兄弟模块。

最终 Review JSON 在 `matching.semanticAgent.modules[]` 中记录模块 ID、有效绑定数和动态回退统计；每个候选决策包含 `result`、稳定 `reasonCode`、Figma 节点、开发选择器及是否形成最终匹配。该结构只解释匹配过程，不参与验收门禁。

字体族比较会规范化主字体名称中的空格、连字符和下划线，因此 `PingFangSC` 与 `PingFang SC` 视为同一字体。当前金融 H5 按 LTR 页面审查，CSS 逻辑值 `start/end` 分别与 `left/right` 等价；真实字体或左右对齐差异仍保留。

## 采集等待

| 字段 | 默认值 | 有效范围 | 说明 |
| --- | ---: | ---: | --- |
| `timeout_ms` | `30000` | 1000–60000 | Live 会话初始化、全部采样与帧间等待的总预算；导航和选择器等待也受此上限约束 |
| `settle_ms` | `500` | 0–5000 | 两次布局快照之间的等待；最多比较 5 次 |
| `samples` | `3` | 1–5 | 在同一个浏览器页面会话中采集的样本数；`1` 保留静态单帧模式 |
| `sample_interval_ms` | `750` | 0–5000 | 相邻样本之间的等待时间 |
| `wait_for_selector` | 无 | 非空 CSS 选择器 | 在截图前等待元素可见 |

例如，业务页面可以在数据和字体都就绪后展示标记：

```yaml
capture:
  timeout_ms: 20000
  settle_ms: 750
  samples: 5
  sample_interval_ms: 750
  wait_for_selector: "[data-page-ready]"
```

## 常见调参方式

### 首次接入：降低误报

```yaml
thresholds:
  visual_similarity_min: 0.92
  pixel_threshold: 0.15
  position_tolerance_px: 6
  size_tolerance_px: 6
  font_size_tolerance_px: 2
  color_delta_e: 5
  match_confidence_min: 0.78
  high_confidence_min: 0.90
```

提高匹配置信度门槛会减少错误映射，但会增加未匹配与待确认项。业务校准时应同时观察误报和漏报，而不是只追求更高相似度。

### 只让结构问题阻断

```yaml
rules:
  visual_similarity: warning
  position: error
  size: error
  content: error
  typography: warning
  alignment: error
  color: warning
  decoration: ignore
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning
```

`rules` 可以只写需要覆盖的字段，其他字段沿用默认级别。未知规则名不会进入当前配置。
