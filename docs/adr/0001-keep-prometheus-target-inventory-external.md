# 0001 Keep Prometheus target inventory external

Status: Accepted

## Context

Prometheus emits `up=0` only for targets that still exist in service discovery. If a DiffLab metrics target is removed from discovery or Prometheus configuration, its `up` series disappears and an `up == 0` alert becomes silent. An inventory emitted by DiffLab would disappear with the monitored service and cannot close this gap.

## Decision

Maintain a low-cardinality expected-target inventory in deployment configuration outside DiffLab application instances. Every entry has controlled `job`, `tenant`, and stable `target` identifiers. The generator produces an inventory recording rule and a target-specific `absent_over_time(up{...}[5m])` recording rule. The shared alert rules consume the resulting absence series.

Every corresponding scrape target carries `difflab_metrics="ai-advice"`, `difflab_tenant`, and `difflab_target`. Inventory values must never be derived from Review IDs, URLs, evidence references, or other request content.

## Consequences

- `up=1` with no counter growth remains healthy zero traffic.
- Sustained `up=0` reports a configured target that cannot be scraped.
- A missing `up` series reports an expected target removed from discovery or Prometheus configuration.
- Deployment automation must update and regenerate the inventory when intentionally adding, renaming, or removing a target.
