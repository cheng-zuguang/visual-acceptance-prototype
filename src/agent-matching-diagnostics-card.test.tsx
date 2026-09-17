import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentMatchingDiagnosticsCard } from "./agent-matching-diagnostics-card";
import type { SemanticAgentMatchingEvidence } from "./types";

const evidence: SemanticAgentMatchingEvidence = {
  invoked: true,
  responded: true,
  acceptedBindingCount: 1,
  modules: [
    {
      designModuleId: "module-rate-observation",
      acceptedBindingCount: 1,
      actualParentSelectors: ["#rate-observation"],
      dynamicFallback: {
        evaluatedCount: 1,
        acceptedCount: 1,
        rejectedCount: 0,
        decisions: [{
          figmaNodeId: "figma-rate",
          selector: "#rate-observation .countdown",
          result: "accepted",
          reasonCode: "temporal_dynamic_verified",
          matched: true
        }]
      }
    }
  ]
};

test("renders a collapsed Agent matching panel with labelled module and reason-code filters", () => {
  const html = renderToStaticMarkup(
    <AgentMatchingDiagnosticsCard evidence={evidence} t={(key) => key} />
  );

  assert.match(html, /<details class="agent-diagnostics-card">/);
  assert.doesNotMatch(html, /<details[^>]* open/);
  assert.match(html, /<summary>/);
  assert.match(html, /<label for="agent-diagnostics-module">report\.agentDiagnostics\.moduleFilter<\/label>/);
  assert.match(html, /<select id="agent-diagnostics-module"/);
  assert.match(html, /<label for="agent-diagnostics-reason">report\.agentDiagnostics\.reasonFilter<\/label>/);
  assert.match(html, /<select id="agent-diagnostics-reason"/);
});

test("renders Agent execution state and traceable module-level fallback decisions", () => {
  const html = renderToStaticMarkup(
    <AgentMatchingDiagnosticsCard evidence={evidence} t={(key) => key} />
  );

  assert.match(html, /report\.agentDiagnostics\.invoked/);
  assert.match(html, /report\.agentDiagnostics\.responded/);
  assert.match(html, /module-rate-observation/);
  assert.match(html, /#rate-observation/);
  assert.match(html, /<table>/);
  assert.match(html, /figma-rate/);
  assert.match(html, /#rate-observation \.countdown/);
  assert.match(html, /temporal_dynamic_verified/);
  assert.match(html, /report\.agentDiagnostics\.accepted/);
});
