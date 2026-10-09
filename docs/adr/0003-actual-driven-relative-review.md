# 0003 Actual-driven scope and relative layout review

Status: Accepted (2026-10-08). Supersedes ADR 0002 for newly executed Reviews.

## Context

The user changed acceptance scope to the actual H5 requirements. Design-only modules can be intentional and must not shift all downstream position checks or produce missing-module findings. Reports must explain actionable visual differences rather than DOM implementation details.

## Decision

- ActualEvidence determines the content in scope. DesignTruth remains the visual standard for corresponding actual content.
- Keep every non-root design identity in the coverage ledger. Design-only items are outside scope, not accepted visual matches, and generate no missing-module or design-side pending findings.
- Visible actual content without reliable design correspondence remains pending. Failed matching is not proof of either absence or acceptance.
- Ordinary position checks use only verified local parent/neighbor relations shared by both sides. Never fall back to absolute page coordinates or cumulative vertical displacement. Unavailable references remain pending. Design-only intervening blocks invalidate adjacency references.
- Retain PageAlignmentPlan displacement and historical missing-module evaluation as diagnostics, not new position/missing findings. Preserve long-screenshot absolute evidence coordinates.
- Equivalent visual alignment may use different CSS implementation methods. Compare rendered evidence, with uncertainty retained when evidence is unavailable.
- Merge attributes of one verified element into one ReviewIssue, retaining individual measurements, evidence, confidence and severity. Present Chinese actions; technical identity belongs in diagnostics.
- Put whole-page similarity in report summary, not the actionable issue list. Preserve its deterministic acceptance effect.
- XLSX evidence includes local context and an exact target outline, preserving image proportions.

## Consequences

New Reviews publish actual-driven coverage. Historical design-driven reports, calibration and replay remain readable; their original mandatory advice integrity safeguards continue to apply. HTTP/MCP adapters, tenant isolation, concurrency and signed artifacts do not change.
