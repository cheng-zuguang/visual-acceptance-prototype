import assert from "node:assert/strict";
import test from "node:test";
import { load } from "js-yaml";

import {
  generatePrometheusExpectedTargetRules,
  renderPrometheusExpectedTargetRules
} from "./prometheus-expected-targets.js";

interface RenderedRule {
  record: string;
  expr: string;
  labels: Record<string, string>;
}

test("renders one expected inventory and absent_over_time rule for every configured tenant target", () => {
  const rendered = renderPrometheusExpectedTargetRules({
    targets: [
      { job: "difflab-ai-advice", tenant: "tenant-a", target: "tenant-a-primary" },
      { job: "difflab-ai-advice", tenant: "tenant-b", target: "tenant-b-primary" }
    ]
  });
  const document = load(rendered) as {
    groups: Array<{ name: string; rules: RenderedRule[] }>;
  };
  const rules = document.groups[0]?.rules ?? [];

  assert.equal(document.groups[0]?.name, "difflab-ai-advice-expected-targets");
  assert.equal(rules.length, 4);
  assert.deepEqual(
    rules.filter((rule) => rule.record === "difflab_ai_advice_metrics_expected_target")
      .map((rule) => rule.labels.difflab_tenant),
    ["tenant-a", "tenant-b"]
  );
  assert.ok(rules.every((rule) => rule.labels.difflab_metrics === "ai-advice"));

  const absentRules = rules.filter((rule) =>
    rule.record === "difflab_ai_advice_metrics_expected_target_absent"
  );
  assert.equal(absentRules.length, 2);
  assert.match(
    absentRules[0].expr,
    /^absent_over_time\(up\{job="difflab-ai-advice",difflab_tenant="tenant-a",difflab_metrics="ai-advice",difflab_target="tenant-a-primary"\}\[5m\]\)$/
  );
});

test("rejects target labels that could escape the generated PromQL selector", () => {
  assert.throws(
    () => renderPrometheusExpectedTargetRules({
      targets: [{
        job: "difflab-ai-advice",
        tenant: 'tenant-a"} or vector(1)',
        target: "tenant-a-primary"
      }]
    }),
    /targets\[0\]\.tenant/
  );
});

test("rejects duplicate expected tenant targets", () => {
  assert.throws(
    () => renderPrometheusExpectedTargetRules({
      targets: [
        { job: "difflab-ai-advice", tenant: "tenant-a", target: "tenant-a-primary" },
        { job: "difflab-ai-advice", tenant: "tenant-a", target: "tenant-a-primary" }
      ]
    }),
    /duplicate target/
  );
});

test("generates loadable Prometheus rules from a non-empty YAML inventory", () => {
  const rendered = generatePrometheusExpectedTargetRules(`
targets:
  - job: difflab-ai-advice
    tenant: tenant-a
    target: tenant-a-primary
`);
  const document = load(rendered) as {
    groups: Array<{ rules: RenderedRule[] }>;
  };

  assert.equal(document.groups[0]?.rules.length, 2);
  assert.throws(
    () => generatePrometheusExpectedTargetRules("targets: []\n"),
    /at least one target/
  );
});

test("tracks multiple expected targets independently within one tenant", () => {
  const rendered = renderPrometheusExpectedTargetRules({
    targets: [
      { job: "difflab-ai-advice", tenant: "tenant-a", target: "primary" },
      { job: "difflab-ai-advice", tenant: "tenant-a", target: "secondary" }
    ]
  });
  const document = load(rendered) as {
    groups: Array<{ rules: RenderedRule[] }>;
  };
  const absentTargets = document.groups[0].rules
    .filter((rule) => rule.record === "difflab_ai_advice_metrics_expected_target_absent")
    .map((rule) => rule.labels.difflab_target);

  assert.deepEqual(absentTargets, ["primary", "secondary"]);
});
