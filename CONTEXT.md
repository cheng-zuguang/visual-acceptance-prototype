# DiffLab Domain Context

DiffLab is an AI-assisted UI visual review engine. It compares Figma design truth with a developed page and produces reproducible, evidence-backed UI restoration findings. It is not a workflow platform or a business automation testing system.

## Product boundary

The current default is **design-driven coverage**, superseding the historical intersection-only missing-module policy below (ADR 0002). Every non-root DesignTruth item is accounted for under `matching.designCoverage`; unmatched design content is no longer silently ignored. See `docs/DESIGN_COVERAGE.md` for implemented static-absence criteria, uncertainty boundaries and export fields. Historical sibling-displacement evaluations remain a separate optional evidence route, not a prerequisite for static absence.

Module coverage uses a separate geometry-derived view for flat Figma cards, preserving original identities and parent IDs. `ReviewIssue.coverageModule` distinguishes module-level verification from raw-node uncertainty; these published pending modules are mandatory advice evidence and are visible without AI, always retaining conditional wording. Capture limitations include selector, region and reason; bounded leaf-text clipping and limitations owned by a verified unrelated structural counterpart can be excluded from a region's absence search. Unknown ownership or relevant internally scrollable scope remains incomplete. Geometry-only matches cannot establish coverage identity. Coverage records preserve raw type/name and grouped parent identity for diagnosis. See the dated correction section in `docs/DESIGN_COVERAGE.md` for limits.

DiffLab owns:

- Figma design ingestion and normalization;
- live H5, screenshot, and hybrid actual-evidence ingestion;
- deterministic pixel and UI-parameter comparison;
- bounded Agent assistance for ambiguous matching and dynamic-content classification;
- confidence-backed review issues and report artifacts;
- a reusable review service for Web UI, HTTP API, MCP, CLI, or batch callers.

DiffLab does not own:

- Jira or other work-item workflow;
- notification and remediation lifecycle;
- business-data correctness;
- scripted business-process automation;
- automatic target-state navigation in the first delivery phase.

## Glossary

### DesignTruth

The expected visual state derived from a Figma Frame, including its rendered image, node hierarchy, components, variants, layout metadata, and styles.

Avoid: design payload, Figma dump, expected screenshot when the structured design evidence is relevant.

### ActualEvidence

The developed-page evidence used for review. It can contain live H5 capture samples, an actual device screenshot, a long screenshot, DOM observations, and computed styles.

Avoid: actual screenshot when the evidence bundle includes more than an image.

### PagePair

One `DesignTruth` paired with one developed-page state, one viewport profile, and one effective rule set. A review may contain many PagePairs, but the first delivery phase evaluates every PagePair independently as a one-to-one comparison.

### DynamicRegion

A region whose content changes over time or data while its visual structure remains subject to design review. Initial supported regions are market values, market lists, market variants, and asynchronous loading areas.

### MarketVariant

An allowed Figma-backed visual state for rising, falling, or flat market data. Internal semantics may be `market.up`, `market.down`, and `market.flat`; Figma property names do not need to use fixed English vocabulary.

### NormalizationStrategy

A verified method for removing legitimate dynamic-content differences without removing layout, typography, color-variant, icon, overflow, or structural checks.

### NormalizationPlan

The property-level comparison policy derived only from verified DynamicRegions. It tells the DeterministicOracle which text pixels and content checks are not comparable while preserving layout, typography, color, icon, overflow, and structural checks.

### PageAlignmentPlan

The structured page-to-page module correspondence used before element matching. It combines deterministic anchors with Agent-proposed, deterministically verified `matched`, `missing-in-actual`, and `uncertain` region decisions, including whole-region displacement and EvidenceConfidence. Each region exposes `anchorStats`: candidate, stable, dynamically excluded, and structural anchor counts plus RANSAC inlier count and residual. When multi-sample evidence exists, displacement anchors must be present with stable text, geometry, and style across every sample; known carousel, countdown, and live-market elements are excluded even when a short capture happens to show no change. Two or more stable heading, header, or container anchors take precedence over ordinary stable content. Whole-region displacement is then estimated from a strict-majority consensus and the median of its inliers; an Agent-proposed displacement is never published directly and is recomputed only when at least two stable verified element anchors form an inlier consensus. Without that support the displacement is removed and cannot participate in missing-module residuals. Reproducible anchor statistics calibrate EvidenceConfidence rather than trusting model self-confidence. Applied weights and level thresholds come from acceptance rules, while `scoreBreakdown` preserves feature values, weights, contributions, and final scoring for offline calibration. An `uncertain` decision for the DesignTruth root Frame is retained as diagnostic evidence but never becomes a page-wide matching veto; uncertainty for a bounded child region may suppress deterministic fallback only inside that region's subtree. It constrains candidate search and is included in JSON, Markdown, and HTML reports; it never decides the acceptance verdict directly.

### AgentHypothesis

A structured, non-gating proposal about an ambiguous element binding, DynamicRegion type, MarketVariant, or NormalizationStrategy.

### MissingModuleEvaluation

A calibration trace for every Agent-verified `missing-in-actual` candidate considered by the structural-completeness rule. It records the PageAlignment region index, stable neighboring anchors, topology, horizontal overlap, design-flow gap, displacement step, residual, effective thresholds, publication result, and deterministic rejection reasons. When a missing tail module has no ordinary following PageAlignment region, `followingAnchorSource` and `followingAnchorStats` identify a fallback built from at least two temporally stable downstream structural anchors; dynamic values are excluded before displacement consensus. Review JSON exposes these traces under `matching.missingModules`; human labels must resolve to a specific candidate before threshold calibration.

### DeterministicVerifier

Code that attempts to disprove an AgentHypothesis using multi-sample, DOM, Figma, geometry, style, and replay evidence. It computes evidence confidence and decides whether normalization is safe.

### DeterministicOracle

The rule engine that compares normalized `DesignTruth` and `ActualEvidence`, emits findings, and determines the review verdict. Agent output never directly changes the gate.

### ReviewIssue

One actionable UI modification backed by design and actual evidence. Multiple low-level differences from one root cause are aggregated, with per-element coverage records linking to the final issue. Verified module displacement can aggregate child-position findings. Static missing-module publication follows design-driven coverage (ADR 0002); Agent plus sibling displacement is an additional evidence route, no longer mandatory. Unverified correspondence produces a pending design_coverage_unverified issue.

### EvidenceConfidence

The confidence computed from reproducible evidence such as temporal consistency, element identity, Figma correspondence, geometry, structure, and replay. It is not the model's self-reported confidence.

### Review

One execution request containing one or more PagePairs, an execution status, an acceptance verdict, and generated artifacts.

### Artifact

A generated Excel, JSON, HTML, Markdown, screenshot, crop, diff, or diagnostic file belonging to a Review.

## Invariants

- Figma is the design truth.
- The developed URL is already in the target visual state for the first delivery phase.
- The Agent may propose and explain; deterministic code verifies and gates.
- Agent invocation and accepted semantic bindings are distinct states. Accepted bindings tighten fallback only within their root-Frame child business module, with the actual parent container as a secondary scope signal; they cannot disable safe fallback in sibling modules. A successful Agent response with zero verified bindings cannot globally disable deterministic matching; only a design-supported dynamic text pair with at least three temporally consistent samples, changing text, and stable geometry and style may use the safe fallback. Static numeric conflicts and cross-region candidates remain unmatched. Review JSON exposes this under `matching.semanticAgent`, including every Agent-evaluated module's accepted-binding count and a bounded, deterministic dynamic-fallback decision with a stable rejection code for each design candidate.
- Every non-root DesignTruth item appears in the design-driven coverage ledger. Unresolved design regions produce grouped pending findings, never silent omission. Complete static absence evidence may publish missing_module without Agent or displacement prerequisites; the older sibling-displacement route remains supplementary. See docs/DESIGN_COVERAGE.md for implemented criteria and limitations.
- AI advice may rank only final published ReviewIssues and verified `matched` PageAlignmentPlan regions. The model returns evidence references rather than publishable prose; deterministic code assembles the final summary and rejects unknown references, so raw unmatched nodes cannot leak into advice; published pending coverage issues may be referenced only as unresolved, never rewritten as confirmed absence. Every blocking `missing_module` ReviewIssue is mandatory summary and priority evidence even when the model omits it. The report publication boundary independently revalidates every summary and priority reference and rejects the entire AI advice when any reference is missing, unresolved, or points outside the published issue/verified-alignment evidence set. Rejections are exposed as structured `aiAdviceRejection` data that distinguishes timeout, format, generation, and evidence-integrity failures; evidence failures identify dangling refs and one-based advice locations. Diagnostics retain the human-readable reason. Validated `summaryEvidenceRefs` and per-priority `evidenceRefs` remain visible in Review JSON, Markdown, HTML, and XLSX.
- Dynamic content is normalized narrowly; the containing visual structure remains reviewable.
- Low-confidence conclusions become `pending` or `needs_review` rather than deterministic failures.
- Review execution status and UI acceptance verdict are separate concepts.
- AI advice monitoring is tenant-scoped and low-cardinality. Only fixed rejection codes and alert types may be metric labels; request URLs, Review IDs, issue IDs, evidence refs, and caller-provided tenant strings must never become labels.
- Recent AI advice health is measured from fixed 5m/15m count windows. Prometheus derives those windows from cumulative counters with `increase()`, sums reset-safe numerators and denominators across instances, and only then derives ratios; process-local window gauges and per-instance ratios are never used for production alerts.
- Prometheus scrape health is separate from Review traffic. Controlled `difflab_tenant`, `difflab_metrics`, and stable `difflab_target` labels identify DiffLab AI-advice targets: `up=1` with zero counter growth is healthy idle traffic, sustained `up=0` is a collection failure, and an external expected-target inventory plus target-specific `absent_over_time()` detects a target removed from service discovery or Prometheus configuration. The inventory must not be emitted by the monitored application itself.
- Web UI, public HTTP API, MCP, CLI, and batch entry points reuse one ReviewService.

## Structured-content review safeguards

- Semantic binding execution permits one additional transport retry shared across the two verification rounds (at most three calls in total). Timeouts, format errors and unknown failures are not retried. After a retry or failure, `matching.semanticAgent.execution` records recovered/failed status and per-attempt round, duration, fixed error category and allowlisted transport cause code, never raw response bodies or credential-bearing error text. Failed execution remains incomplete even if an earlier round responded; Web and HTML/Markdown reports warn that zero missing candidates does not establish structural completeness. Execution degradation does not fabricate missing-module issues or alter the deterministic acceptance verdict.
- AI priorities retain all validated evidence refs but show one primary issue/action rather than concatenated suggestions. Verified missing-module evidence stays mandatory and takes priority within a group. Alignment without verified displacement is excluded from advice generation. The Web report folds raw selectors, linked issues and anchor diagnostics into native details/summary disclosures.
- Live capture selectors retain the complete body-rooted DOM ancestry rather than a truncated suffix. DOM IDs and normalized Figma IDs are used as identity only when unique; repeated Figma annotations fall back to DOM identity instead of merging temporal observations or asserting an exact design binding. Captured parent links point to the nearest captured ancestor, skipping boxless or otherwise unobserved wrappers; `siblingIndex` still describes the original DOM sibling position. Deep-DOM browser regressions cover selector resolution, closed ancestry, temporal stability and capture-to-date-style comparison. This identity repair does not itself verify missing modules or relax normalization rules.
- Agent element-binding requests include a bounded `designRegions` inventory (at most 200 structural groups with real parent IDs, boxes, paths and bounded descendant text context), independently of the 160 element candidates. Plain Figma groups are not lost just because they lack their own visual styles. Only explicitly proposed missing ancestors absorb duplicate missing descendants; a missing small label is never promoted to a missing card automatically.
- Missing-module neighbors use Figma parent identity, not repeated group names. Either preceding or following sibling displacement may be reconstructed from at least two temporally stable structural anchors with consensus and calibrated confidence. This does not relax the residual, overlap or verified-missing-region requirements.
- Horizontal date slots may be bound inside one already identified selector container when both sides have the same slot count and existing bindings agree with slot order. Date text may be nested in wrappers; a one-slot direct wrapper can inherit its verified slot identity for style review. Changed month/day text alone cannot justify a global geometry match; rejected unverified date selectors use `date_selector_unverified`. Typography and decoration remain reviewable, including appearance/disappearance of a 1px border. Ambiguous or unbound selectors still require additional correspondence evidence.
- News templates can be recognized from a verified section-title/container binding plus vertically repeated design cards and repeated actual subtrees, without prescribed layer names or DOM Figma IDs. Nested text fields contribute to the field count. Unequal field counts produce a template-structure finding without shifting remaining fields into index-based bindings. Template-bound fields receive typography, color, alignment and decoration checks; their dynamic text and absolute per-row position/size are not treated as equality requirements. Row-level geometry remains covered by template checks. This path requires identifiable repeated containers on both sides; it does not infer arbitrary flattened cards from pixels alone.

## Source documents

- Product and architecture blueprint: `docs/AI_UI_REVIEW_BLUEPRINT.md`
- Implemented public HTTP contract: `docs/PUBLIC_HTTP_API.md`
- Public service contract draft: `docs/PUBLIC_API_DESIGN.md`
- MCP adapter contract: `docs/MCP.md`
- Current prototype architecture: `docs/ARCHITECTURE.md`
- Current deterministic rule reference: `docs/ACCEPTANCE_RULES.md`
- Architectural decisions: `docs/adr/`
