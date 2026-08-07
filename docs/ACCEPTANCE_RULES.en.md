# YAML Acceptance-Rule Reference

[简体中文](./ACCEPTANCE_RULES.md) | [English](./ACCEPTANCE_RULES.en.md)

YAML is DiffLab's sole gating source. AI only explains findings that already exist; it cannot add, remove, or change the pass/fail verdict.

See [`acceptance.example.en.yaml`](../acceptance.example.en.yaml) for the complete default configuration with English comments. The same rule values are available at runtime from `GET /api/default-rules`.

## Complete structure

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

## Severities

Every `rules` value can be one of:

| Value | Meaning | Blocks acceptance |
| --- | --- | --- |
| `error` | Deterministic problem that must be fixed | Yes |
| `warning` | Recommended fix | No |
| `pending` | Requires human confirmation | No |
| `info` | Informational only | No |
| `ignore` | Do not run or report this rule | No |

When element-match confidence is below `high_confidence_min`, position, size, content, typography, color, and decoration findings originally configured as `error` are downgraded to `pending`; other severities remain unchanged. This protects against unreliable mappings. An exact `data-figma-id` match has confidence 1.

## Viewport

`viewport: auto` uses the design PNG dimensions. Figma rendering is fixed at scale 1; uploaded images use their original pixel dimensions.

To override it explicitly:

```yaml
viewport:
  width: 1440
  height: 900
```

Width is limited to 320–6000 px and height to 200–6000 px. When overridden, the design image and design-element coordinates are stretched independently along X and Y, so changing the aspect ratio may introduce extra differences.

## Thresholds

| Field | Default | Valid range | Purpose |
| --- | ---: | ---: | --- |
| `visual_similarity_min` | `0.95` | 0–1 | Minimum overall visual similarity |
| `pixel_threshold` | `0.10` | 0–1 | `pixelmatch` per-pixel difference threshold; lower is more sensitive |
| `position_tolerance_px` | `4` | 0–100 | Euclidean tolerance between element top-left positions |
| `size_tolerance_px` | `4` | 0–100 | Tolerance for the greater absolute width/height difference |
| `font_size_tolerance_px` | `1` | 0–20 | Absolute font-size tolerance |
| `color_delta_e` | `3` | 0–100 | Combined color and alpha difference tolerance |
| `match_confidence_min` | `0.72` | 0–1 | Minimum confidence for geometric heuristic matching |
| `high_confidence_min` | `0.86` | 0–1 | Minimum confidence for an element finding to retain `error` severity |

The parser clamps out-of-range numbers instead of failing. Values that cannot be parsed fall back to defaults. To catch silent configuration mistakes, inspect the effective `rules` field in the report JSON.

## Rules

| Rule | Default | Data source | Trigger |
| --- | --- | --- | --- |
| `visual_similarity` | `error` | Pixels | Overall similarity is below the minimum |
| `missing_element` | `error` | Figma + DOM | A design node has no reliable DOM match |
| `extra_element` | `warning` | Figma + DOM | A meaningful DOM element has no design-node match |
| `position` | `error` | Figma + DOM | Element position difference exceeds tolerance |
| `size` | `error` | Figma + DOM | Element width or height difference exceeds tolerance |
| `content` | `error` | Figma + DOM | Normalized text differs for a matched element |
| `typography` | `error` | Figma + DOM | Font size exceeds tolerance, weight differs by at least 100, or line height differs by more than 2 px |
| `color` | `warning` | Figma + DOM | Foreground or background color ΔE exceeds tolerance |
| `decoration` | `warning` | Figma + DOM | Radius differs by more than 2 px, border width by more than 1 px, or opacity by more than 0.05 |
| `broken_image` | `error` | H5 DOM | A completed image load has natural width 0 |
| `horizontal_overflow` | `error` | H5 DOM | Document width exceeds the viewport by more than 1 px |
| `clipped_text` | `warning` | H5 DOM | A text-bearing clipping container's scroll size exceeds its client size by more than 1 px |

Diff regions use the internal rule name `visual_region`. They are currently fixed to `warning`, are not affected by `rules`, and only help with localization; they cannot fail a report.

An image reference has no structured design elements, so `missing_element`, `extra_element`, and the six element-property rules cannot produce findings. `visual_similarity` and the three H5 static audits still run.

## Ignore dynamic regions

`ignore` accepts an array of CSS selectors. Matching elements are hidden in the screenshot and excluded from DOM extraction and static audits:

```yaml
ignore:
  - "[data-dynamic]"
  - ".clock"
  - "#rotating-banner"
```

Ignore only the smallest region that cannot be stabilized. An invalid selector does not fail the run; it appears in diagnostics. Ignoring a parent also excludes its descendants from analysis.

## Force critical nodes

By default, unmatched text and nodes named like button/CTA/logo/input use the configured `missing_element` severity, while ordinary visual nodes are downgraded to `pending`. Other nodes can be made critical by Figma node id:

```yaml
critical_figma_nodes:
  - "123:456"
  - "123:789"
```

Critical ids only affect severity when a node is unmatched. Adding an exact `data-figma-id` to the corresponding DOM element remains the best practice.

## Capture waits

| Field | Default | Valid range | Description |
| --- | ---: | ---: | --- |
| `timeout_ms` | `10000` | 1000–60000 | Independent timeout for navigation and `wait_for_selector` |
| `settle_ms` | `500` | 0–5000 | Delay between layout snapshots; at most five comparisons |
| `wait_for_selector` | None | Non-empty CSS selector | Wait for the element to become visible before capture |

For example, the business page can reveal a marker once data and fonts are ready:

```yaml
capture:
  timeout_ms: 20000
  settle_ms: 750
  wait_for_selector: "[data-page-ready]"
```

## Common tuning profiles

### First integration: reduce false positives

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

Higher matching-confidence thresholds reduce incorrect mappings but increase unmatched and pending findings. Calibration should evaluate both false positives and false negatives rather than optimize similarity alone.

### Block only on structural problems

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

`rules` may include only the fields you want to override; omitted fields retain their defaults. Unknown rule names are not included in the current configuration.
