import assert from "node:assert/strict";
import test from "node:test";
import type { SemanticAgentMatchingEvidence } from "./types";
import { buildAgentMatchingDiagnosticsModel } from "./agent-matching-diagnostics";

const evidence: SemanticAgentMatchingEvidence = {
  invoked: true,
  responded: true,
  acceptedBindingCount: 2,
  modules: [
    {
      designModuleId: "module-rate-observation",
      acceptedBindingCount: 1,
      actualParentSelectors: ["#rate-observation"],
      dynamicFallback: {
        evaluatedCount: 2,
        acceptedCount: 1,
        rejectedCount: 1,
        decisions: [
          {
            figmaNodeId: "figma-rate",
            selector: "#rate-observation .countdown",
            actualParentSelector: "#rate-observation",
            result: "accepted",
            reasonCode: "temporal_dynamic_verified",
            matched: true
          },
          {
            figmaNodeId: "figma-policy",
            selector: "#policy .rate",
            result: "rejected",
            reasonCode: "module_has_valid_agent_binding",
            matched: false
          }
        ]
      }
    },
    {
      designModuleId: "module-news",
      acceptedBindingCount: 1,
      actualParentSelectors: ["#news"],
      dynamicFallback: {
        evaluatedCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        decisions: []
      }
    }
  ]
};

test("builds an unfiltered Agent matching diagnostic view from Review JSON", () => {
  const model = buildAgentMatchingDiagnosticsModel(evidence, {
    moduleId: "all",
    reasonCode: "all"
  });

  assert.equal(model.visible, true);
  assert.equal(model.invoked, true);
  assert.equal(model.responded, true);
  assert.equal(model.acceptedBindingCount, 2);
  assert.deepEqual(model.totals, { evaluated: 2, accepted: 1, rejected: 1 });
  assert.deepEqual(model.moduleOptions, ["module-rate-observation", "module-news"]);
  assert.deepEqual(model.reasonOptions, [
    "module_has_valid_agent_binding",
    "temporal_dynamic_verified"
  ]);
  assert.equal(model.modules.length, 2);
  assert.equal(model.filteredDecisionCount, 2);
});

test("filters fallback decisions by module and reason code without changing execution totals", () => {
  const model = buildAgentMatchingDiagnosticsModel(evidence, {
    moduleId: "module-rate-observation",
    reasonCode: "temporal_dynamic_verified"
  });

  assert.deepEqual(model.totals, { evaluated: 2, accepted: 1, rejected: 1 });
  assert.equal(model.filteredDecisionCount, 1);
  assert.equal(model.modules.length, 1);
  assert.equal(model.modules[0].state.designModuleId, "module-rate-observation");
  assert.deepEqual(
    model.modules[0].decisions.map((decision) => decision.reasonCode),
    ["temporal_dynamic_verified"]
  );
});
