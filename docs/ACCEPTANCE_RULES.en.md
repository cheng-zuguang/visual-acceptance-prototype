# YAML Acceptance-Rule Reference

[简体中文](./ACCEPTANCE_RULES.md) | [English](./ACCEPTANCE_RULES.en.md)

YAML is DiffLab's sole gating source. AI only explains findings that already exist; it cannot add, remove, or change the pass/fail verdict.

See [`acceptance.example.yaml`](../acceptance.example.yaml) for the complete default configuration. The same rule values are available at runtime from `GET /api/default-rules`.

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

## Severities

Every `rules` value can be one of:

| Value | Meaning | Blocks acceptance |
| --- | --- | --- |
| `error` | Deterministic problem that must be fixed | Yes |
| `warning` | Recommended fix | No |
| `pending` | Requires human confirmation | No |
| `info` | Informational only | No |
| `ignore` | Do not run or report this rule | No |

Every match and issue exposes structured `EvidenceConfidence` with `score`, `level`, `basis`, and `reasons`. Stable-text and structure-geometry candidates enter parameter comparison only at or above `match_confidence_min`. Below `high_confidence_min`, element findings configured as `error` or `warning` become `pending`; `info` is never promoted. An exact `data-figma-id` match scores `0.99`.

## Viewport

`viewport: auto` uses the Figma Frame render dimensions at scale 1.

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
| `visual_similarity_min` | `0.95` | 0–1 | Minimum stable-region visual similarity inside reliable matches |
| `pixel_threshold` | `0.10` | 0–1 | `pixelmatch` per-pixel difference threshold; lower is more sensitive |
| `position_tolerance_px` | `4` | 0–100 | Euclidean tolerance between element top-left positions |
| `size_tolerance_px` | `4` | 0–100 | Tolerance for the greater absolute width/height difference |
| `font_size_tolerance_px` | `1` | 0–20 | Absolute font-size tolerance |
| `color_delta_e` | `3` | 0–100 | Combined color and alpha difference tolerance |
| `match_confidence_min` | `0.72` | 0–1 | Minimum confidence for a stable-text or structure-geometry candidate to enter the intersection |
| `high_confidence_min` | `0.86` | 0–1 | Minimum confidence for an element finding to retain configured `error`/`warning` severity |

The parser clamps out-of-range numbers instead of failing. Values that cannot be parsed fall back to defaults. To catch silent configuration mistakes, inspect the effective `rules` field in the report JSON.

## Page-alignment confidence

`page_alignment.confidence` controls only `PageAlignmentRegionDecision` evidence scoring and its `high / medium / low` classification. It does not replace the global `match_confidence_min` and `high_confidence_min` used for element matching. The six non-negative weights are normalized to sum to `1`; an all-zero set falls back to defaults. Level thresholds are clamped to 0–1 and ordered as `low_min ≤ medium_min ≤ high_min`.

| Component | Default weight | Meaning |
| --- | ---: | --- |
| `stability_coverage` | `0.25` | Stable-anchor count divided by non-dynamic candidates |
| `anchor_sufficiency` | `0.20` | Eligible anchors relative to three anchors, capped at 1 |
| `inlier_ratio` | `0.30` | RANSAC inliers divided by eligible anchors |
| `residual_quality` | `0.15` | Residual quality relative to `position_tolerance_px` after strict-majority consensus; 0 without a majority |
| `dynamic_cleanliness` | `0.05` | `1 - dynamically excluded / candidates` |
| `structural_support` | `0.05` | Support from heading, header, and container anchors relative to two anchors, capped at 1 |

The final score is the lower of the weighted component sum and the raw matching-confidence cap. Every region's `scoreBreakdown` records component values, effective weights, contributions, weighted score, base cap, final score, and applied thresholds. Markdown and HTML reports expose the same data for offline recalculation from labeled production samples.

See [offline page-alignment confidence calibration](./PAGE_ALIGNMENT_CALIBRATION.en.md) to search candidate weights and level boundaries from human correct/false-positive labels. The tool produces a candidate snippet and never overwrites this file or production rules.

`page_alignment.missing_module` controls geometric verification of structural omissions. Stable neighboring anchors—or the page-top boundary and a following anchor—must overlap the candidate by at least `minimum_horizontal_overlap_ratio`. The residual between the design-flow gap and displacement step must not exceed the greater of `position_tolerance_px × 2` and `design-flow gap × maximum_residual_ratio`. When a trailing candidate has no ordinary downstream module displacement, the nearest following sibling may be reconstructed from at least two headings, table headers, or container anchors that remain stable across samples. Countdown, carousel, and live-market values are removed by temporal consistency before strict-majority displacement consensus, and the fallback region must reach medium confidence. Every evaluated candidate is recorded in Review JSON under `matching.missingModules.candidates`, including residual, overlap, publication status, rejection reasons, and optional `followingAnchorSource` / `followingAnchorStats` for manual labeling and offline calibration.

## Rules

| Rule | Default | Data source | Trigger |
| --- | --- | --- | --- |
| `visual_similarity` | `error` | Pixels + intersection matching | Stable-region similarity inside reliable matches is below the minimum |
| `position` | `error` | Figma + DOM | Element position difference exceeds tolerance |
| `size` | `error` | Figma + DOM | Element width or height difference exceeds tolerance |
| `content` | `error` | Figma + DOM | Normalized text differs for a matched element |
| `typography` | `error` | Figma + DOM | Font family differs, font size exceeds tolerance, weight differs by at least 100, or line height differs by more than 2 px |
| `alignment` | `error` | Figma + DOM | Horizontal text alignment differs |
| `color` | `warning` | Figma + DOM | Foreground or background color ΔE exceeds tolerance |
| `decoration` | `warning` | Figma + DOM | Radius differs by more than 2 px, border width by more than 1 px, or opacity by more than 0.05 |
| `broken_image` | `error` | H5 DOM | A completed image load has natural width 0 |
| `horizontal_overflow` | `error` | H5 DOM | Document width exceeds the viewport by more than 1 px |
| `clipped_text` | `warning` | H5 DOM | A text-bearing clipping container's scroll size exceeds its client size by more than 1 px |

The diff heatmap still covers the full viewport. Diff regions use the internal rule name `visual_region`. They are fixed to `pending`, are not affected by `rules`, and have a `0.70` EvidenceConfidence cap because they rely on single-frame visual evidence. They only help with localization and cannot fail a report. Verified dynamic regions are excluded from both the pixel numerator and denominator, so the reported score is stable-region similarity. It is `1` when no reliably matched stable pixels remain.

## Dynamic-content normalization

After Live or an H5-backed Hybrid/Long Screenshot mode captures at least three samples, the system discovers reliably bound DynamicRegion candidates whose geometry and style remain stable. Changing market values and countdowns may become candidates; date-time and probability values may also become candidates when design and actual values share the same semantic format even if they remain stable during capture. Ordinary static-copy differences do not invoke the dynamic Agent.

AgentHypothesis may only propose `market-value`, `date-time`, `countdown`, or `probability` with its matching text NormalizationStrategy. DeterministicVerifier then verifies the binding, semantic value family, geometry/style stability across at least three samples, and exact text-node scope. Failed verification preserves the original `content` issue and adds `pending`; Agent output never changes the gate directly.

Once verified, NormalizationPlan symmetrically excludes character pixels from the design and actual boxes and stops comparing that node's concrete text. Position, size, font family, font size, weight, line height, color, text alignment, clipped overflow, and structure remain reviewable. Adjacent static text is never hidden. Supported strategies are `normalize-market-value-text`, `normalize-date-time-text`, `normalize-countdown-text`, and `normalize-probability-text`.

Reports expose `summary.stableSimilarity`, `summary.dynamicRegionAreaRatio`, and `dynamicNormalization` separately. The latter contains the strategy, regions, sample count, design/actual boxes, and structured `EvidenceConfidence`. The compatibility field `summary.similarity` currently equals stable-region similarity.

## Ignore dynamic regions

`ignore` accepts an array of CSS selectors. Matching elements are hidden in the screenshot and excluded from DOM extraction and static audits:

```yaml
ignore:
  - "[data-dynamic]"
  - ".clock"
  - "#rotating-banner"
```

Ignore only the smallest region that cannot be stabilized. An invalid selector does not fail the run; it appears in diagnostics. Ignoring a parent also excludes its descendants from analysis.

## Intersection coverage

Only reliably matched design nodes and actual elements enter parameter comparison. Unmatched design nodes and additional actual elements do not create findings or affect the gate by default; the final report retains counts and diagnostics for both sides. A future completeness rule should handle missing implementation separately instead of mixing low-evidence bindings into restoration findings.

## Capture waits

| Field | Default | Valid range | Description |
| --- | ---: | ---: | --- |
| `timeout_ms` | `30000` | 1000–60000 | Total budget for Live session setup, all samples, and inter-sample waits; navigation and selector waits are bounded by it too |
| `settle_ms` | `500` | 0–5000 | Delay between layout snapshots; at most five comparisons |
| `samples` | `3` | 1–5 | Samples captured from the same browser page session; `1` preserves static single-frame mode |
| `sample_interval_ms` | `750` | 0–5000 | Delay between adjacent samples |
| `wait_for_selector` | None | Non-empty CSS selector | Wait for the element to become visible before capture |

For example, the business page can reveal a marker once data and fonts are ready:

```yaml
capture:
  timeout_ms: 20000
  settle_ms: 750
  samples: 5
  sample_interval_ms: 750
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

Unmatched nodes remain non-blocking by default. A module becomes a `missing_module` finding only when an Agent-verified `missing-in-actual` decision is independently supported by stable sibling displacement evidence: both sides for an interior gap, or the Figma page-top boundary plus an equally displaced following module for a leading gap. An Agent-proposed neighboring displacement may participate in residual calculation only after at least two stable anchors form an inlier consensus. A raw unmatched node, unanchored model displacement, trailing one-sided gap, or model statement is insufficient.

Agent invocation is not equivalent to producing a valid binding. When the Agent responds successfully but zero bindings are accepted, deterministic fallback is limited to design-supported dynamic fields whose text changes across at least three complete samples while geometry and style remain stable. Static numeric conflicts, ordinary text conflicts, and cross-module candidates remain unmatched. An accepted binding tightens only its top-level business module beneath the root Frame and corresponding actual parent container; sibling modules remain independent.

The final Review JSON records each module id, accepted-binding count, and dynamic-fallback statistics under `matching.semanticAgent.modules[]`. Every retained candidate decision includes `result`, a stable `reasonCode`, the Figma node, the actual selector, and whether it formed the final match. This structure explains matching behavior and does not participate in the acceptance gate.

Primary font-family comparison ignores spaces, hyphens, and underscores, so `PingFangSC` and `PingFang SC` are equivalent. Financial H5 reviews currently assume LTR layout, making CSS logical `start/end` equivalent to `left/right`; genuine font or left/right differences still produce findings.

### Block only on structural problems

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

`rules` may include only the fields you want to override; omitted fields retain their defaults. Unknown rule names are not included in the current configuration.
