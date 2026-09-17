# Offline calibration for page-alignment confidence

[简体中文](./PAGE_ALIGNMENT_CALIBRATION.md) | [English](./PAGE_ALIGNMENT_CALIBRATION.en.md)

The offline calibration tool reads generated Review JSON files plus human labels for module mappings. It searches the six `page_alignment.confidence` weights and the High/Medium boundaries. It only produces a candidate configuration and evaluation metrics; it never reads, modifies, or overwrites production acceptance rules.

Real financial H5 samples should first follow the [financial H5 human gold-set guide](../calibration/financial-h5/README.md) to capture evidence and label allowed dynamics, expected issues, and module mappings. Draft samples are excluded from calibration exports.

## Label manifest

Each `review` path is resolved relative to the manifest. It may reference a single `CompareReport`, an internal batch result with `pages[].report`, or the public `pageResults[]` response from `GET /v1/reviews/{reviewId}/result`.

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

`correct` means the PageAlignmentRegionDecision maps the right modules. `false_positive` means it maps unrelated modules. `clientPageId` is required for multi-PagePair results. Supplying `frameId` is recommended so one Figma Frame cannot cross data partitions. `regionIndex` is required when a page has repeated region ids, as can happen with tiled long screenshots.

The dataset must contain both labels and every region must expose a complete `scoreBreakdown`.

## Run

Print metrics and candidate YAML without creating files:

```bash
npm run calibrate:alignment -- --labels ./calibration/labels.json
```

Write explicit candidate artifacts:

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

The output directory always contains `page-alignment-metrics.json`, including the diagnostic candidate, aggregate metrics, confusion matrices, fold-parameter statistics, recommendation, search settings, and per-sample predictions. `page-alignment-candidate.yaml` is emitted only after the stability gate passes. A rejected run removes a stale candidate YAML from the same output directory. No acceptance-rules file is updated automatically.

## Grouped validation

Every sample receives a stable `groupId`, derived in order from an explicit label `frameId`, the Review's `source.design`, `clientPageId`, or the Review id. Every module in one group stays wholly in training or validation.

The default deterministic split holds out 20% of groups. Candidate weights and thresholds are searched only on training groups, then evaluated separately on training and validation. If there are too few groups or the training side would lose either manual label, the tool reports an empty holdout instead of producing a leaked validation result.

The tool also runs five-fold group cross-validation by default, capped by the number of groups. Each fold performs a fresh search on its training groups and evaluates unseen groups. `crossValidation.candidateMetrics` combines out-of-fold predictions in which each eligible group is evaluated once. The holdout measures the final exported candidate; cross-validation measures the generalization of the tuning procedure.

Use the same `--seed` to reproduce partitions. Assign related page variants, the same Figma Frame, and tiles from one long screenshot the same `frameId`.

## Candidate parameter stability gate

Every eligible cross-validation fold searches a fresh candidate. `crossValidation.parameterStability` summarizes all six weights plus `highMin` and `mediumMin`. Each parameter reports its mean, sample variance, sample standard deviation, minimum, maximum, and an approximate 95% confidence interval computed as `mean ± 1.96 × standardDeviation / √foldCount`, clamped to 0–1.

By default, recommendation requires at least three eligible folds. A weight standard deviation may not exceed `0.15`, and a threshold standard deviation may not exceed `0.10`. Override these limits with `--minimum-stability-folds`, `--max-weight-stddev`, and `--max-threshold-stddev`.

The assessment is `stable`, `unstable`, or `insufficient-folds`. A stable result proceeds to the OOF performance gates; the other states produce `rejected`. `unstableParameters` identifies each parameter, its kind, observed standard deviation, and configured limit. Rejection does not discard diagnostics: the candidate and metrics remain in the metrics JSON, but no candidate YAML is published.

## OOF performance gates

Stable parameters do not prove that a candidate improves on the current rules. Recommendation also requires both out-of-fold performance gates to pass:

1. `candidate balanced accuracy - current balanced accuracy ≥ minimum delta`. The default minimum is `0`, so balanced accuracy may not regress.
2. `candidate false-positive rate - current false-positive rate ≤ maximum increase`. The default maximum is `0`, so the share of false mappings accepted as High may not increase.

False-positive rate is `FP / (FP + TN)`. Use `--min-oof-balanced-accuracy-delta` to require a specific improvement and `--max-oof-false-positive-rate-increase` to allow an explicit bounded increase. The former accepts -1 to 1; the latter accepts 0 to 1.

`recommendation.gates` reports the parameter-stability result plus the evaluated/current/candidate/delta/limit values for `oofBalancedAccuracy` and `oofFalsePositiveRate`. `recommendation.status` is `recommended` only when all three gates pass. Any failure produces `rejected`, with all evaluated failure reasons retained in `reasons`.

## Search semantics

Weights are searched on a non-negative simplex whose sum is 1. High and Medium thresholds are searched on a grid while preserving `high_min > medium_min`. Candidate scoring matches production:

```text
candidateScore = round(min(baseScoreCap, Σ(componentValue × candidateWeight)), 2)
```

Candidates are ranked by balanced accuracy, ordinary accuracy, correct-to-High plus false-positive-to-Low separation, fewer false positives, and finally a wider High/Medium review band.

For binary metrics, `correct` is the positive class and High is automatic acceptance. Medium and Low are both held back. `levelConfusionMatrix` separately shows both labels across High, Medium, and Low.

`evaluation.training`, `evaluation.validation`, and `evaluation.crossValidation` each expose:

- `current`: recomputed from the effective weights and thresholds embedded in every Review's `scoreBreakdown`;
- `candidate`: metrics for the searched candidate;
- `delta`: candidate minus current for accuracy, balanced accuracy, precision, recall, specificity, and confusion-matrix counts.

Samples from different historical rule versions can therefore be compared, although one release calibration run should normally use one rule version so the baseline remains coherent.

Because the human labels are binary, they can supervise the High automatic-acceptance boundary and the Medium manual-review boundary. In the current three-level runtime, `low_min` is the score-domain floor and remains `0`. Learning a separate Low-versus-insufficient boundary would require a third human label and a fourth runtime state.

Always evaluate the candidate on a page-grouped holdout set and merge it into production rules only after human review.
