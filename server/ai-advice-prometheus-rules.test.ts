import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { load } from "js-yaml";

interface PrometheusRule {
  record?: string;
  alert?: string;
  expr: string;
  labels?: Record<string, string>;
}

test("aggregates AI advice windows across instances before calculating five and fifteen minute alert ratios", async () => {
  const document = load(await readFile(
    new URL("../monitoring/prometheus-ai-advice-alerts.yml", import.meta.url),
    "utf8"
  )) as { groups: Array<{ rules: PrometheusRule[] }> };
  const rules = document.groups.flatMap((group) => group.rules);
  const recordingRules = rules.filter((rule) => rule.record);
  const expressionsFor = (record: string) => recordingRules
    .filter((rule) => rule.record === record)
    .map((rule) => `${rule.labels?.window ?? ""}:${rule.expr}`);

  const attemptExpressions = expressionsFor("ai_advice_cluster_window_attempts");
  assert.equal(attemptExpressions.length, 2);
  assert.ok(attemptExpressions.some((expr) =>
    /5m:sum without\s*\(instance,\s*pod\)\s*\(increase\(ai_advice_attempts_total\[5m\]\)\)/.test(expr)
  ));
  assert.ok(attemptExpressions.some((expr) =>
    /15m:sum without\s*\(instance,\s*pod\)\s*\(increase\(ai_advice_attempts_total\[15m\]\)\)/.test(expr)
  ));

  const rejectionExpressions = expressionsFor("ai_advice_cluster_window_rejections");
  assert.equal(rejectionExpressions.length, 2);
  assert.ok(rejectionExpressions.every((expr) =>
    /sum without\s*\(instance,\s*pod\)\s*\(increase\(ai_advice_rejections_total\[(5m|15m)\]\)\)/.test(expr)
  ));

  const danglingExpressions = expressionsFor("ai_advice_cluster_window_evidence_dangling_attempts");
  assert.equal(danglingExpressions.length, 2);
  assert.ok(danglingExpressions.every((expr) =>
    /increase\(ai_advice_evidence_dangling_attempts_total\[(5m|15m)\]\)/.test(expr)
  ));

  const timeoutRatioExpression = expressionsFor("ai_advice_cluster_window_timeout_ratio").join("\n");
  assert.match(
    timeoutRatioExpression,
    /ai_advice_cluster_window_rejections\{code="ai_timeout"\}/
  );
  assert.doesNotMatch(
    timeoutRatioExpression,
    /avg\s*\(/
  );
  assert.match(
    expressionsFor("ai_advice_cluster_alert_threshold_ratio").join("\n"),
    /max without\s*\(instance,\s*pod\)\s*\(ai_advice_alert_threshold_ratio\)/
  );
  assert.match(
    expressionsFor("ai_advice_cluster_alert_min_attempts").join("\n"),
    /max without\s*\(instance,\s*pod\)\s*\(ai_advice_alert_min_attempts\)/
  );

  const alertExpressions = rules
    .filter((rule) => rule.alert)
    .map((rule) => rule.expr)
    .join("\n");
  assert.match(alertExpressions, /ai_advice_cluster_window_timeout_ratio\{window="5m"\}/);
  assert.match(alertExpressions, /ai_advice_cluster_window_timeout_ratio\{window="15m"\}/);
  assert.match(alertExpressions, /ai_advice_cluster_window_evidence_dangling_ratio\{window="5m"\}/);
  assert.match(alertExpressions, /ai_advice_cluster_window_evidence_dangling_ratio\{window="15m"\}/);
  assert.match(alertExpressions, /on\s*\(job,\s*difflab_tenant\)\s*group_left/);
  assert.doesNotMatch(alertExpressions, /scalar\s*\(/);

  const absentTargetAlert = rules.find((rule) =>
    rule.alert === "DiffLabAiAdviceMetricsTargetAbsent"
  );
  assert.equal(
    absentTargetAlert?.expr,
    "difflab_ai_advice_metrics_expected_target_absent == 1"
  );
});
