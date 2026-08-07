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

rules:
  visual_similarity: error
  missing_element: error
  extra_element: warning
  position: error
  size: error
  content: error
  typography: error
  color: warning
  decoration: warning
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning

ignore: []
critical_figma_nodes: []

capture:
  timeout_ms: 10000
  settle_ms: 500
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

元素匹配置信度低于 `high_confidence_min` 时，位置、尺寸、内容、排版、颜色和装饰中原本配置为 `error` 的问题会自动降级为 `pending`，其他级别保持不变。这是对错误映射的保护；精确 `data-figma-id` 匹配的置信度为 1。

## 视口

`viewport: auto` 使用设计 PNG 的宽高。Figma 渲染固定为 scale 1；上传图片使用其原始像素尺寸。

可以显式覆盖：

```yaml
viewport:
  width: 1440
  height: 900
```

宽度会限制在 320–6000 px，高度会限制在 200–6000 px。覆盖后，设计图和设计元素坐标会分别按 X/Y 比例拉伸到新视口，因此宽高比变化可能引入额外差异。

## 阈值

| 字段 | 默认值 | 有效范围 | 作用 |
| --- | ---: | ---: | --- |
| `visual_similarity_min` | `0.95` | 0–1 | 整体视觉相似度下限 |
| `pixel_threshold` | `0.10` | 0–1 | `pixelmatch` 单像素差异阈值；越小越敏感 |
| `position_tolerance_px` | `4` | 0–100 | 元素左上角欧氏距离容差 |
| `size_tolerance_px` | `4` | 0–100 | 宽/高绝对差的最大值容差 |
| `font_size_tolerance_px` | `1` | 0–20 | 字号绝对差容差 |
| `color_delta_e` | `3` | 0–100 | 颜色与透明度综合差异容差 |
| `match_confidence_min` | `0.72` | 0–1 | 几何启发式匹配的最低置信度 |
| `high_confidence_min` | `0.86` | 0–1 | 元素问题保持配置严重级别的最低置信度 |

解析器会把越界数值钳制到有效范围，而不是报错。无法解析的值回退到默认值。为避免难以察觉的配置错误，建议在报告 JSON 的 `rules` 字段中确认实际生效值。

## 规则

| 规则 | 默认级别 | 数据来源 | 触发条件 |
| --- | --- | --- | --- |
| `visual_similarity` | `error` | 像素 | 整体相似度低于下限 |
| `missing_element` | `error` | Figma + DOM | 设计节点没有可靠 DOM 匹配 |
| `extra_element` | `warning` | Figma + DOM | 有意义的 DOM 没有设计节点匹配 |
| `position` | `error` | Figma + DOM | 元素位置差超出容差 |
| `size` | `error` | Figma + DOM | 元素宽或高差超出容差 |
| `content` | `error` | Figma + DOM | 匹配元素的规范化文本不同 |
| `typography` | `error` | Figma + DOM | 字号差超阈值、字重差至少 100，或行高差大于 2 px |
| `color` | `warning` | Figma + DOM | 前景色或背景色的 ΔE 超阈值 |
| `decoration` | `warning` | Figma + DOM | 圆角差大于 2 px、边框宽差大于 1 px，或透明度差大于 0.05 |
| `broken_image` | `error` | H5 DOM | 已完成加载的图片自然宽度为 0 |
| `horizontal_overflow` | `error` | H5 DOM | 文档宽度超出视口 1 px 以上 |
| `clipped_text` | `warning` | H5 DOM | 有文本的裁切容器 scroll 尺寸超出 client 尺寸 1 px 以上 |

差异区域使用内部规则名 `visual_region`，当前固定为 `warning`，不受 `rules` 配置影响。它只是帮助定位，不参与失败判定。

图片基准没有结构化设计元素，所以 `missing_element`、`extra_element` 和六类元素属性规则不会产生问题；`visual_similarity` 与三项 H5 静态审计仍会执行。

## 忽略动态区域

`ignore` 接受 CSS 选择器数组。匹配元素会在截图中隐藏，并从 DOM 提取和静态审计中排除：

```yaml
ignore:
  - "[data-dynamic]"
  - ".clock"
  - "#rotating-banner"
```

建议只忽略无法稳定控制的最小区域。选择器无效时任务不会失败，诊断信息会记录它。隐藏父元素也会让其后代不进入分析。

## 强制关键节点

默认情况下，未匹配的文本、button/CTA/logo/input 等语义节点会按 `missing_element` 级别报告，普通视觉节点降为 `pending`。可以用 Figma node id 明确声明其他关键节点：

```yaml
critical_figma_nodes:
  - "123:456"
  - "123:789"
```

关键节点只影响未匹配时的严重级别。最佳实践仍是在对应 DOM 上增加完全一致的 `data-figma-id`。

## 采集等待

| 字段 | 默认值 | 有效范围 | 说明 |
| --- | ---: | ---: | --- |
| `timeout_ms` | `10000` | 1000–60000 | 页面导航和 `wait_for_selector` 各自的超时 |
| `settle_ms` | `500` | 0–5000 | 两次布局快照之间的等待；最多比较 5 次 |
| `wait_for_selector` | 无 | 非空 CSS 选择器 | 在截图前等待元素可见 |

例如，业务页面可以在数据和字体都就绪后展示标记：

```yaml
capture:
  timeout_ms: 20000
  settle_ms: 750
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
  missing_element: error
  extra_element: warning
  position: error
  size: error
  content: error
  typography: warning
  color: warning
  decoration: ignore
  broken_image: error
  horizontal_overflow: error
  clipped_text: warning
```

`rules` 可以只写需要覆盖的字段，其他字段沿用默认级别。未知规则名不会进入当前配置。
