# Domain Docs

This repository uses a single domain context.

## Before exploring or changing code

- Read `CONTEXT.md` at the repository root.
- Read ADRs under `docs/adr/` that touch the area being changed.
- Read `docs/AI_UI_REVIEW_BLUEPRINT.md` for the target product and architecture.
- Read `docs/PUBLIC_API_DESIGN.md` when changing an external service boundary.

If a referenced document does not exist, proceed without inventing its decisions.

## Vocabulary

Use the glossary terms defined in `CONTEXT.md` in issue titles, implementation plans, type names, tests, and architecture proposals. Do not drift to synonyms that blur the distinction between design truth, actual evidence, Agent hypotheses, deterministic verification, and deterministic gating.

## Architectural decisions

System-wide ADRs live in `docs/adr/`. If proposed work conflicts with an ADR, surface the conflict explicitly instead of silently overriding it.
