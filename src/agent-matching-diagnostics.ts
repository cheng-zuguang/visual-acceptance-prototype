import type {
  DynamicFallbackDecision,
  DynamicFallbackReasonCode,
  SemanticAgentMatchingEvidence,
  SemanticAgentModuleState
} from "./types";

export interface AgentMatchingDiagnosticsFilters {
  moduleId: "all" | string;
  reasonCode: "all" | DynamicFallbackReasonCode;
}

export interface AgentMatchingDiagnosticsModuleView {
  state: SemanticAgentModuleState;
  decisions: DynamicFallbackDecision[];
}

export interface AgentMatchingDiagnosticsModel {
  visible: boolean;
  invoked: boolean;
  responded: boolean;
  acceptedBindingCount: number;
  totals: {
    evaluated: number;
    accepted: number;
    rejected: number;
  };
  moduleOptions: string[];
  reasonOptions: DynamicFallbackReasonCode[];
  modules: AgentMatchingDiagnosticsModuleView[];
  filteredDecisionCount: number;
}

export function buildAgentMatchingDiagnosticsModel(
  evidence: SemanticAgentMatchingEvidence | undefined,
  filters: AgentMatchingDiagnosticsFilters
): AgentMatchingDiagnosticsModel {
  if (!evidence) {
    return {
      visible: false,
      invoked: false,
      responded: false,
      acceptedBindingCount: 0,
      totals: { evaluated: 0, accepted: 0, rejected: 0 },
      moduleOptions: [],
      reasonOptions: [],
      modules: [],
      filteredDecisionCount: 0
    };
  }

  const decisions = evidence.modules.flatMap((module) => module.dynamicFallback.decisions);
  const modules = evidence.modules
    .filter((module) => filters.moduleId === "all" || module.designModuleId === filters.moduleId)
    .map((state) => ({
      state,
      decisions: state.dynamicFallback.decisions.filter(
        (decision) => filters.reasonCode === "all" || decision.reasonCode === filters.reasonCode
      )
    }))
    .filter((module) => filters.reasonCode === "all" || module.decisions.length > 0);
  return {
    visible: true,
    invoked: evidence.invoked,
    responded: evidence.responded,
    acceptedBindingCount: evidence.acceptedBindingCount,
    totals: evidence.modules.reduce(
      (totals, module) => ({
        evaluated: totals.evaluated + module.dynamicFallback.evaluatedCount,
        accepted: totals.accepted + module.dynamicFallback.acceptedCount,
        rejected: totals.rejected + module.dynamicFallback.rejectedCount
      }),
      { evaluated: 0, accepted: 0, rejected: 0 }
    ),
    moduleOptions: evidence.modules.map((module) => module.designModuleId),
    reasonOptions: [...new Set(decisions.map((decision) => decision.reasonCode))].sort(),
    modules,
    filteredDecisionCount: modules.reduce((count, module) => count + module.decisions.length, 0)
  };
}
