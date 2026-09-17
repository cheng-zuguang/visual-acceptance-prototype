## Agent skills

### Issue tracker

Issues and PRDs are stored as local Markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. Read `CONTEXT.md` and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.

### Delivery boundaries

- Keep comparison orchestration in `server/review.ts`; HTTP and MCP layers are thin adapters.
- Keep MCP tools in `server/mcp.ts` as exact `/v1` contract adapters and transport/configuration in `server/mcp-stdio.ts` or `server/mcp-http.ts`; do not add MCP-only comparison, state, credential, or artifact-byte handling.
- MCP AI defaults come from `server/ai-review-config.ts`; per-call AI overrides are local-prototype inputs only and must never be persisted or returned.
- Generate XLSX artifacts through `server/excel-report.ts` and keep large image bytes out of public JSON results.
- Use design-driven coverage: every non-root DesignTruth item must appear in `matching.designCoverage`, independently of matching/Agent candidate limits. Unresolved items produce grouped pending findings, never silent success. Static absence can be published from complete multi-sample capture evidence without Agent or displacement prerequisites; incomplete/opaque/capped/excluded evidence and dynamic or ambiguous correspondence remain unverified. Preserve the independently verified displacement route as additional evidence, not the only missing-module gate. AI prose alone never proves absence. See ADR 0002 and `docs/DESIGN_COVERAGE.md`.
- Preserve mandatory AI-advice coverage for blocking `missing_module` ReviewIssues: model ranking may add or order other evidence, but cannot omit a verified structural root cause from the summary and priorities.
- Also preserve published module-level pending coverage in advice, without converting uncertainty into confirmed absence. Module verification actions must remain visible without AI. Keep original Figma identities when grouping flat cards; geometry-only candidates cannot certify coverage. Persist local capture limitations rather than silently relaxing full-document checks. See `docs/DESIGN_COVERAGE.md`.
- Preserve the separation between execution status and UI acceptance verdict in batch and public API work.
- Preserve global and per-tenant Review concurrency, bounded queue admission, submission rate limits, shared PagePair concurrency, idempotent retries, and `Retry-After` backpressure when changing the public API.
- Keep monitoring tenant-scoped and low-cardinality: never derive metric labels from request content, URLs, Review IDs, issue IDs, evidence refs, or raw tenant input. `/v1/metrics` must require `metrics:read` and expose only the authenticated tenant's aggregate.
- For multi-instance AI monitoring, derive 5m/15m attempt, rejection, and dangling-evidence counts from cumulative counters with Prometheus `increase()`, aggregate those counts across instances, and only then calculate ratios. Never average per-instance ratios or depend on process-local window gauges for production alerts.
- Prometheus scrape targets for AI-advice metrics must carry the controlled `difflab_metrics="ai-advice"`, `difflab_tenant`, and stable low-cardinality `difflab_target` labels. Keep the expected-target inventory outside DiffLab application instances, generate target-specific `absent_over_time()` rules from it, and distinguish `up=1` with zero Review traffic, sustained `up=0` collection failure, and a target whose `up` series disappeared entirely. Never populate inventory labels from request content.
- Keep public assets, jobs, idempotency records, and webhook delivery state tenant-scoped; raw credentials must never enter public results.
- Public upload/download URLs and completion callbacks are signed boundaries. Preserve expiry, HMAC verification, bounded retries, and SSRF checks when changing them.
- Long Screenshot findings use full-page absolute coordinates. Preserve tile index, scroll position, sticky-copy suppression, and full-image Excel crops when changing tiling or reporting.
- Long Screenshot may carry an optional H5 URL. Treat the uploaded long image as visual truth, collect multi-sample Live ActualEvidence at every tile scroll offset in one browser session, and degrade only unaligned tiles to Screenshot evidence.
- Keep financial gold-set drafts separate from calibration truth. Only designer-approved, sanitized/public, explicitly reusable samples with Review JSON and manual PageAlignment labels may be exported for threshold calibration.
