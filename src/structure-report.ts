import type {
  ElementMatchingEvidence,
  MissingModuleEvaluation,
  ReviewIssue
} from "./types";

export interface ConfirmedMissingModule {
  issue: ReviewIssue;
  designPath: string[];
  evaluation?: MissingModuleEvaluation;
}

export interface StructureReportModel {
  visible: boolean;
  incomplete: boolean;
  coverageIncomplete: boolean;
  pendingModules: ReviewIssue[];
  confirmed: ConfirmedMissingModule[];
  unpublished: MissingModuleEvaluation[];
  unmatchedDesignCount: number;
  evaluatedCount: number;
}

export function buildStructureReportModel(input: {
  issues: ReviewIssue[];
  matching: ElementMatchingEvidence;
}): StructureReportModel {
  const actualDriven = input.matching.designCoverage?.policy === "actual-driven";
  const evaluations = actualDriven ? [] : input.matching.missingModules?.candidates ?? [];
  const evaluationByFigmaNodeId = new Map(
    evaluations.map((evaluation) => [evaluation.figmaNodeId, evaluation])
  );
  const confirmed = input.issues
    .filter((issue) => issue.rule === "missing_module")
    .map((issue): ConfirmedMissingModule => {
      const evaluation = issue.figmaNodeId
        ? evaluationByFigmaNodeId.get(issue.figmaNodeId)
        : undefined;
      const alignment = issue.figmaNodeId
        ? input.matching.pageAlignment.regions.find((region) =>
            region.designParentFigmaNodeId === issue.figmaNodeId
          )
        : undefined;
      return {
        issue,
        designPath: evaluation?.designPath ?? alignment?.designPath ?? [],
        ...(evaluation ? { evaluation } : {})
      };
    });
  const unpublished = evaluations.filter((evaluation) => !evaluation.published);
  const unmatchedDesignCount = actualDriven ? 0 : input.matching.unmatchedDesignCount;
  const agent = input.matching.semanticAgent;
  const incomplete = Boolean(agent?.invoked && (!agent.responded || agent.execution?.status === "failed"));
  const pendingModules = input.issues.filter(issue => issue.rule === "design_coverage_unverified" && Boolean(issue.coverageModule));

  return {
    visible: pendingModules.length > 0 || Boolean(input.matching.designCoverage) || incomplete || confirmed.length > 0 || unpublished.length > 0 || unmatchedDesignCount > 0,
    incomplete,
    coverageIncomplete: pendingModules.length > 0 || Boolean(input.matching.designCoverage?.items.some(item => item.status === "unverified" && item.reviewStatus !== "not-applicable")),
    pendingModules,
    confirmed,
    unpublished,
    unmatchedDesignCount,
    evaluatedCount: input.matching.missingModules?.evaluatedCount ?? 0
  };
}
