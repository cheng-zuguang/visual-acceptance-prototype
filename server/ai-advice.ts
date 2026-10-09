import type { AiAdvice, AiAdviceEvidenceRef, PageAlignmentPlan, PageAlignmentRegionDecision, ReviewIssue } from "../src/types";
import { localText, type Locale } from "./i18n";

export interface AiAdviceSelection {
  summaryEvidenceRefs: AiAdviceEvidenceRef[];
  priorities: Array<{ evidenceRefs: AiAdviceEvidenceRef[] }>;
}

export interface AiAdviceEvidence {
  ref: AiAdviceEvidenceRef;
  kind: "review-issue" | "page-alignment";
  title: string;
  reason: string;
  action: string;
  digest: Record<string, unknown>;
}

function matchedAlignmentEvidence(
  region: PageAlignmentRegionDecision,
  locale: Locale
): AiAdviceEvidence | undefined {
  if (region.status !== "matched" || !region.actualParentSelector || !region.displacement) return undefined;
  const path = region.designPath.join(" / ") || region.designParentFigmaNodeId;
  const displacement = region.displacement
    ? `x=${region.displacement.x}px, y=${region.displacement.y}px`
    : localText(locale, "无已验证整体位移", "no verified whole-region displacement");
  return {
    ref: `page-alignment:${region.designParentFigmaNodeId}`,
    kind: "page-alignment",
    title: localText(locale, `${path} 模块对齐`, `${path} module alignment`),
    reason: region.reason,
    action: localText(
      locale,
      `复核${path}的整体定位，已验证位移为 ${displacement}；详见关联证据。`,
      `Review the positioning of ${path}; verified displacement is ${displacement}. See linked evidence.`
    ),
    digest: {
      designPath: region.designPath,
      designParentFigmaNodeId: region.designParentFigmaNodeId,
      actualParentSelector: region.actualParentSelector,
      displacement: region.displacement,
      reason: region.reason,
      evidenceConfidence: region.evidenceConfidence,
      anchorStats: region.anchorStats
    }
  };
}

export function buildAiAdviceEvidence(
  issues: ReviewIssue[],
  pageAlignment: PageAlignmentPlan,
  locale: Locale,
  relativeLayoutOnly = false
): AiAdviceEvidence[] {
  const issueEvidence: AiAdviceEvidence[] = issues.filter(issue => issue.rule !== "visual_similarity").map((issue) => ({
    ref: `review-issue:${issue.id}`,
    kind: "review-issue",
    title: issue.title,
    reason: issue.summary,
    action: issue.location.selector?.startsWith("body >")
      ? issue.primaryAction.replaceAll(issue.location.selector, localText(locale, "该模块内的对应元素", "the corresponding element in this module"))
      : issue.primaryAction,
    digest: {
      id: issue.id,
      priority: issue.priority,
      severity: issue.severity,
      category: issue.category,
      title: issue.title,
      summary: issue.summary,
      expected: issue.expected,
      actual: issue.actual,
      primaryAction: issue.primaryAction,
      location: issue.location,
      evidenceConfidence: issue.evidenceConfidence
    }
  }));
  const alignmentEvidence = (relativeLayoutOnly ? [] : pageAlignment.regions)
    .map((region) => matchedAlignmentEvidence(region, locale))
    .filter((item): item is AiAdviceEvidence => Boolean(item));
  return [...issueEvidence, ...alignmentEvidence];
}

export function materializeAiAdvice(
  selection: AiAdviceSelection,
  evidence: AiAdviceEvidence[],
  locale: Locale,
  model: string
): AiAdvice {
  const evidenceByRef = new Map(evidence.map((item) => [item.ref, item]));
  const resolve = (refs: AiAdviceEvidenceRef[]): AiAdviceEvidence[] => refs.map((ref) => {
    const item = evidenceByRef.get(ref);
    if (!item) throw new Error("AI advice evidence disappeared before publication.");
    return item;
  });
  const summaryItems = resolve(selection.summaryEvidenceRefs);
  return {
    model,
    summaryEvidenceRefs: selection.summaryEvidenceRefs,
    summary: localText(
      locale,
      `AI 仅对最终发布问题和已验证模块对齐结论排序。优先处理：${summaryItems.map((item) => item.title).join("；")}。`,
      `AI ranked only final published issues and verified module-alignment decisions. Prioritize: ${summaryItems.map((item) => item.title).join("; ")}.`
    ),
    priorities: selection.priorities.map(({ evidenceRefs }) => {
      const items = resolve(evidenceRefs);
      const primary = items.find(item => item.ref.startsWith("review-issue:missing-module:")) ??
        items.find(item => item.kind === "review-issue") ?? items[0];
      return {
        title: primary.title,
        reason: primary.reason,
        action: primary.action,
        evidenceRefs
      };
    })
  };
}

export function enforceBlockingStructuralCoverage(
  selection: AiAdviceSelection,
  issues: ReviewIssue[]
): AiAdviceSelection {
  const requiredRefs = issues
    .filter((issue) => (issue.rule === "missing_module" && issue.severity === "error") ||
      (issue.rule === "design_coverage_unverified" && issue.severity === "pending" && Boolean(issue.coverageModule)))
    .map((issue): AiAdviceEvidenceRef => `review-issue:${issue.id}`);
  if (!requiredRefs.length) return selection;

  const summaryEvidenceRefs = [...new Set([
    ...requiredRefs,
    ...selection.summaryEvidenceRefs
  ])];
  const selectedPriorityRefs = new Set(
    selection.priorities.flatMap((priority) => priority.evidenceRefs)
  );
  const requiredPriorities = requiredRefs
    .filter((ref) => !selectedPriorityRefs.has(ref) ||
      (issues.some(issue => `review-issue:${issue.id}` === ref && issue.rule === "design_coverage_unverified" && issue.coverageModule) &&
        !selection.priorities.some(priority => priority.evidenceRefs.length === 1 && priority.evidenceRefs[0] === ref)))
    .map((ref) => ({ evidenceRefs: [ref] }));
  return {
    summaryEvidenceRefs,
    priorities: [...requiredPriorities, ...selection.priorities]
  };
}
