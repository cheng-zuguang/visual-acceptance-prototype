import { dump, load } from "js-yaml";

export interface PrometheusExpectedTargetInventory {
  targets: Array<{
    job: string;
    tenant: string;
    target: string;
  }>;
}

const CONTROLLED_LABEL_VALUE = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;

function assertControlledLabel(value: string, path: string): void {
  if (!CONTROLLED_LABEL_VALUE.test(value)) {
    throw new Error(`${path} must be a 1-64 character controlled label value`);
  }
}

export function generatePrometheusExpectedTargetRules(source: string): string {
  const parsed = load(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected target inventory must be a YAML object");
  }
  const inventoryRecord = parsed as Record<string, unknown>;
  const unknownRootFields = Object.keys(inventoryRecord).filter((key) => key !== "targets");
  if (unknownRootFields.length > 0) {
    throw new Error(`expected target inventory contains unsupported fields: ${unknownRootFields.join(", ")}`);
  }
  const targets = inventoryRecord.targets;
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("expected target inventory must contain at least one target");
  }

  const normalizedTargets = targets.map((target, index) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) {
      throw new Error(`targets[${index}] must be an object`);
    }
    const record = target as Record<string, unknown>;
    const unknownFields = Object.keys(record).filter((key) =>
      key !== "job" && key !== "tenant" && key !== "target"
    );
    if (unknownFields.length > 0) {
      throw new Error(`targets[${index}] contains unsupported fields: ${unknownFields.join(", ")}`);
    }
    if (
      typeof record.job !== "string"
      || typeof record.tenant !== "string"
      || typeof record.target !== "string"
    ) {
      throw new Error(`targets[${index}] must contain string job, tenant, and target values`);
    }
    return {
      job: record.job,
      tenant: record.tenant,
      target: record.target
    };
  });

  return renderPrometheusExpectedTargetRules({ targets: normalizedTargets });
}

export function renderPrometheusExpectedTargetRules(
  inventory: PrometheusExpectedTargetInventory
): string {
  const targetKeys = new Set<string>();
  const rules = inventory.targets.flatMap(({ job, tenant, target }, index) => {
    assertControlledLabel(job, `targets[${index}].job`);
    assertControlledLabel(tenant, `targets[${index}].tenant`);
    assertControlledLabel(target, `targets[${index}].target`);
    const targetKey = `${job}\u0000${tenant}\u0000${target}`;
    if (targetKeys.has(targetKey)) {
      throw new Error(
        `targets[${index}] is a duplicate target for job ${job}, tenant ${tenant}, and target ${target}`
      );
    }
    targetKeys.add(targetKey);
    const labels = {
      job,
      difflab_tenant: tenant,
      difflab_metrics: "ai-advice",
      difflab_target: target
    };
    const selector = `up{job="${job}",difflab_tenant="${tenant}",difflab_metrics="ai-advice",difflab_target="${target}"}`;

    return [
      {
        record: "difflab_ai_advice_metrics_expected_target",
        expr: "vector(1)",
        labels
      },
      {
        record: "difflab_ai_advice_metrics_expected_target_absent",
        expr: `absent_over_time(${selector}[5m])`,
        labels
      }
    ];
  });

  return dump({
    groups: [{
      name: "difflab-ai-advice-expected-targets",
      rules
    }]
  }, {
    lineWidth: -1,
    noRefs: true
  });
}
