# DiffLab Domain Context

DiffLab is an AI-assisted UI visual review engine. It compares Figma design truth with a developed page and produces reproducible, evidence-backed UI restoration findings. It is not a workflow platform or a business automation testing system.

## Product boundary

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

### AgentHypothesis

A structured, non-gating proposal about an ambiguous element binding, DynamicRegion type, MarketVariant, or NormalizationStrategy.

### DeterministicVerifier

Code that attempts to disprove an AgentHypothesis using multi-sample, DOM, Figma, geometry, style, and replay evidence. It computes evidence confidence and decides whether normalization is safe.

### DeterministicOracle

The rule engine that compares normalized `DesignTruth` and `ActualEvidence`, emits findings, and determines the review verdict. Agent output never directly changes the gate.

### ReviewIssue

One actionable UI modification backed by design and actual evidence. Multiple low-level differences from one root cause should be aggregated into one ReviewIssue.

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
- Dynamic content is normalized narrowly; the containing visual structure remains reviewable.
- Low-confidence conclusions become `pending` or `needs_review` rather than deterministic failures.
- Review execution status and UI acceptance verdict are separate concepts.
- Web UI, public HTTP API, MCP, CLI, and batch entry points reuse one ReviewService.

## Source documents

- Product and architecture blueprint: `docs/AI_UI_REVIEW_BLUEPRINT.md`
- Public service contract draft: `docs/PUBLIC_API_DESIGN.md`
- Current prototype architecture: `docs/ARCHITECTURE.md`
- Current deterministic rule reference: `docs/ACCEPTANCE_RULES.md`
- Architectural decisions: `docs/adr/`
