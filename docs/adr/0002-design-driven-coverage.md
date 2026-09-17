# 0002 Design-driven coverage replaces silent intersection omission

Status: Accepted (2026-09-14)

## Context

The user explicitly changed the earlier intersection-only policy: inspect every design item against actual evidence. Static omissions must not depend on an Agent proposal or displacement residual. The old policy hid omitted modules and therefore also excluded them from evidence-grounded AI advice.

## Decision

- Account for all non-root DesignTruth items, independent of matcher candidate budgets.
- Matching failure alone is uncertainty, not proof of absence. Publish grouped pending findings when correspondence or capture coverage is unresolved.
- Allow reproducible static-absence evidence to publish `missing_module` without Agent or sibling-displacement prerequisites. Retain the existing verified displacement route as supplementary evidence.
- Aggregate an absent/unresolved subtree once and link children to the parent finding. An unmatched wrapper containing verified descendants must not suppress independent child-module checks.
- Preserve dynamic-content normalization and style checks. Dynamic or ambiguous text is not static-absence evidence.
- Advice still references only published ReviewIssues and verified alignment decisions. Mandatory missing-module advice coverage remains enforced.

## Consequences

New reports carry a coverage ledger in JSON, Web, Markdown, HTML and XLSX. Old saved reports require a new run to acquire the ledger and capture completeness metadata. Detection capabilities and limitations are documented in `docs/DESIGN_COVERAGE.md`; this policy does not claim arbitrary screenshot-only absence detection or perfect semantic classification.
