import type {
  Box,
  EvidenceConfidence,
  Issue,
  MissingModuleEvaluation,
  MissingModuleSummary,
  PageAlignmentConfidenceLevels,
  PageAlignmentPlan,
  ReviewIssue,
  ReviewIssueEvidence,
  ReviewPriority
} from "../src/types";
import type { Locale } from "./i18n";
import { issuePresentation, reviewRuleLabel } from "../src/issue-presentation";
import { pageAlignmentConfidenceLevel } from "./page-alignment-confidence";

export interface ReviewIssueRewrite {
  title: string;
  summary: string;
  suggestion: string;
}

export type ReviewIssueRewriter = (
  issue: Readonly<ReviewIssue>
) => Promise<unknown>;

export interface AggregateReviewIssueOptions {
  relativeLayoutOnly?: boolean;
  rewriter?: ReviewIssueRewriter;
  moduleAlignment?: {
    plan: PageAlignmentPlan;
    designPageBox?: Box;
    designRegions?: Array<{
      figmaNodeId: string;
      parentId?: string;
      box: Box;
    }>;
    matches: Array<{
      figmaNodeId: string;
      selector: string;
      designAncestorIds: string[];
      actualParentSelector?: string;
      actualAncestorSelectors?: string[];
    }>;
    positionTolerancePx: number;
    confidenceLevels: PageAlignmentConfidenceLevels;
    missingModuleThresholds?: {
      minimumHorizontalOverlapRatio: number;
      maximumResidualRatio: number;
    };
  };
}

export interface AggregateReviewIssueResult {
  issues: ReviewIssue[];
  missingModules: MissingModuleSummary;
}

const severityOrder: Record<Issue["severity"], number> = {
  error: 0,
  warning: 1,
  pending: 2,
  info: 3
};
const MODULE_AGGREGATION_MIN_CONFIDENCE = 0.8;

function priorityFor(issue: Issue): ReviewPriority {
  if (issue.severity === "pending") return "Pending";
  if (
    issue.severity === "error" &&
    ["visual_similarity", "broken_image", "horizontal_overflow"].includes(issue.rule)
  ) return "P0";
  if (issue.severity === "error") return "P1";
  return "P2";
}

function evidenceFor(issue: Issue): ReviewIssueEvidence {
  return {
    sourceIssueId: issue.id,
    severity: issue.severity,
    rule: issue.rule,
    category: issue.category,
    summary: issue.summary,
    ...(issue.expected !== undefined ? { expected: issue.expected } : {}),
    ...(issue.actual !== undefined ? { actual: issue.actual } : {}),
    ...(issue.designBox ? { designBox: issue.designBox } : {}),
    ...(issue.actualBox ? { actualBox: issue.actualBox } : {}),
    ...(issue.box ? { box: issue.box } : {}),
    evidenceConfidence: issue.evidenceConfidence
  };
}

function overlapArea(a: Box, b: Box): number {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

function sameElement(a: Issue, b: Issue): boolean {
  if (a.figmaNodeId && b.figmaNodeId && a.figmaNodeId !== b.figmaNodeId) return false;
  if (a.selector && b.selector && a.selector !== b.selector) return false;
  return Boolean((a.figmaNodeId && a.figmaNodeId === b.figmaNodeId) || (a.selector && a.selector === b.selector));
}

function sameRegion(a: Issue, b: Issue): boolean {
  if (sameElement(a, b)) return true;
  // Pixel overlays can supplement an identified target; geometry never merges distinct targets.
  if (a.rule !== "visual_region" && b.rule !== "visual_region") return false;
  if ((a.figmaNodeId && b.figmaNodeId) || (a.selector && b.selector)) return false;
  if (!a.box || !b.box) return false;
  const overlap = overlapArea(a.box, b.box);
  return overlap / Math.max(1, Math.min(a.box.width * a.box.height, b.box.width * b.box.height)) >= 0.6;
}

function locationFor(issue: Issue, locale: Locale): ReviewIssue["location"] {
  const target = issue.selector ?? issue.figmaNodeId;
  return {
    ...(issue.selector ? { selector: issue.selector } : {}),
    ...(issue.figmaNodeId ? { figmaNodeId: issue.figmaNodeId } : {}),
    ...(issue.designBox ? { designBox: issue.designBox } : {}),
    ...(issue.actualBox ? { actualBox: issue.actualBox } : {}),
    ...(issue.box ? { box: issue.box } : {}),
    description: target
      ? locale === "en" ? `Page region ${target}` : `页面区域 ${target}`
      : locale === "en" ? "Whole page" : "整个页面"
  };
}

function asReviewIssue(issue: Issue, locale: Locale): ReviewIssue {
  return {
    ...issue,
    priority: priorityFor(issue),
    location: locationFor(issue, locale),
    primaryAction: issue.suggestion,
    evidence: [evidenceFor(issue)]
  };
}

function unionBoxes(boxes: Box[]): Box | undefined {
  if (!boxes.length) return undefined;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function combinedConfidence(
  issues: Issue[],
  alignment: EvidenceConfidence,
  locale: Locale,
  levels: PageAlignmentConfidenceLevels
): EvidenceConfidence {
  const score = Math.min(alignment.score, ...issues.map((issue) => issue.evidenceConfidence.score));
  return {
    score,
    level: pageAlignmentConfidenceLevel(score, levels),
    basis: [...new Set([
      ...alignment.basis,
      ...issues.flatMap((issue) => issue.evidenceConfidence.basis)
    ])],
    reasons: [
      ...alignment.reasons,
      locale === "en"
        ? `${issues.length} matched elements share the verified module displacement.`
        : `${issues.length} 个已匹配元素共享已验证的模块整体位移。`
    ]
  };
}

function modulePositionIssues(
  lowLevelIssues: Issue[],
  locale: Locale,
  alignment: NonNullable<AggregateReviewIssueOptions["moduleAlignment"]>
): { issues: ReviewIssue[]; consumedIds: Set<string> } {
  const consumedIds = new Set<string>();
  const issues: ReviewIssue[] = [];

  const regions = [...alignment.plan.regions]
    .sort((a, b) => b.designPath.length - a.designPath.length);
  for (const region of regions) {
    if (
      region.status !== "matched" ||
      !region.displacement ||
      region.evidenceConfidence.score < MODULE_AGGREGATION_MIN_CONFIDENCE
    ) {
      continue;
    }
    const actualParentSelector = region.actualParentSelector;
    const designMembers = alignment.matches.filter((match) =>
      match.designAncestorIds.includes(region.designParentFigmaNodeId)
    );
    const actualMembers = actualParentSelector
      ? designMembers.filter((match) =>
          match.actualParentSelector === actualParentSelector ||
          match.actualAncestorSelectors?.includes(actualParentSelector)
        )
      : [];
    const usesCrossBranchFallback = !actualParentSelector ||
      (region.source === "agent-verified" && actualMembers.length < 2);
    const memberKeys = new Set((usesCrossBranchFallback ? designMembers : actualMembers)
      .map((match) => `${match.figmaNodeId}\u0000${match.selector}`));
    const members = lowLevelIssues.filter((issue) => {
      if (
        consumedIds.has(issue.id) ||
        issue.rule !== "position" ||
        !issue.figmaNodeId ||
        !issue.selector ||
        !issue.designBox ||
        !issue.actualBox ||
        !memberKeys.has(`${issue.figmaNodeId}\u0000${issue.selector}`)
      ) {
        return false;
      }
      const residual = Math.hypot(
        issue.actualBox.x - issue.designBox.x - region.displacement!.x,
        issue.actualBox.y - issue.designBox.y - region.displacement!.y
      );
      return residual <= alignment.positionTolerancePx;
    });
    if (members.length < 2) continue;

    members.forEach((issue) => consumedIds.add(issue.id));
    const designBox = unionBoxes(members.flatMap((issue) => issue.designBox ? [issue.designBox] : []));
    const actualBox = unionBoxes(members.flatMap((issue) => issue.actualBox ? [issue.actualBox] : []));
    const regionName = region.designPath.at(-1) || region.designParentFigmaNodeId;
    const displacement = `x ${region.displacement.x}px / y ${region.displacement.y}px`;
    const evidenceConfidence = combinedConfidence(
      members,
      region.evidenceConfidence,
      locale,
      alignment.confidenceLevels
    );
    const strongestSeverity = [...members]
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])[0].severity;
    const severity = evidenceConfidence.score < alignment.confidenceLevels.highMin && strongestSeverity !== "info"
      ? "pending"
      : strongestSeverity;
    const source: Issue = {
      id: `module-position:${region.designParentFigmaNodeId}`,
      category: locale === "en" ? "Layout" : "布局",
      severity,
      title: locale === "en" ? `${regionName} module is displaced` : `${regionName}模块整体位移`,
      summary: locale === "en"
        ? `${members.length} elements share the module displacement ${displacement}.`
        : `模块内 ${members.length} 个元素共同出现 ${displacement} 整体位移。`,
      expected: locale === "en" ? "Keep the module at its Figma position" : "模块保持 Figma 设计位置",
      actual: locale === "en" ? `Module displacement ${displacement}` : `模块整体位移 ${displacement}`,
      suggestion: locale === "en"
        ? usesCrossBranchFallback
          ? `Fix the positioning, spacing, or document flow of the ${regionName} module, then rerun the review.`
          : `Fix positioning, spacing, or flow on ${actualParentSelector}, then rerun the review.`
        : usesCrossBranchFallback
          ? `优先修复${regionName}模块的容器定位、间距或文档流，再重新走查。`
          : `优先修复 ${actualParentSelector} 的容器定位、间距或文档流，再重新走查。`,
      ...(usesCrossBranchFallback ? {} : { selector: actualParentSelector }),
      figmaNodeId: region.designParentFigmaNodeId,
      evidenceConfidence,
      ...(designBox ? { designBox } : {}),
      ...(actualBox ? { actualBox, box: actualBox } : {}),
      rule: "position"
    };
    const reviewIssue = asReviewIssue(source, locale);
    reviewIssue.location.description = locale === "en"
      ? `Page module ${regionName}`
      : `页面模块 ${regionName}`;
    reviewIssue.evidence = members.map(evidenceFor);
    issues.push(reviewIssue);
  }
  return { issues, consumedIds };
}

function horizontalOverlapRatio(a: Box, b: Box): number {
  const overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  return overlap / Math.max(1, Math.min(a.width, b.width));
}

function hasSameDesignParent(
  left: PageAlignmentPlan["regions"][number],
  right: PageAlignmentPlan["regions"][number]
): boolean {
  const leftParent = left.designPath.slice(0, -1);
  const rightParent = right.designPath.slice(0, -1);
  return leftParent.length === rightParent.length &&
    leftParent.every((part, index) => part === rightParent[index]);
}

function hasResidualEligibleDisplacement(
  region: PageAlignmentPlan["regions"][number]
): boolean {
  if (!region.displacement) return false;
  if (region.source !== "agent-verified") return true;
  return region.anchorStats.stableCount >= 2 && region.anchorStats.inlierCount >= 2;
}

function structuralMissingModuleReview(
  locale: Locale,
  alignment: NonNullable<AggregateReviewIssueOptions["moduleAlignment"]>
): { issues: ReviewIssue[]; summary: MissingModuleSummary } {
  if (!alignment.designRegions?.length) {
    return {
      issues: [],
      summary: { evaluatedCount: 0, publishedCount: 0, candidates: [] }
    };
  }
  const minimumHorizontalOverlapRatio =
    alignment.missingModuleThresholds?.minimumHorizontalOverlapRatio ?? 0.5;
  const maximumResidualRatio =
    alignment.missingModuleThresholds?.maximumResidualRatio ?? 0.15;
  const thresholds = {
    positionTolerancePx: alignment.positionTolerancePx,
    minimumHorizontalOverlapRatio,
    maximumResidualRatio
  };
  const boxByRegion = new Map(
    alignment.designRegions.map((region) => [region.figmaNodeId, region.box])
  );
  const parentByRegion = new Map(alignment.designRegions.map(region => [region.figmaNodeId, region.parentId]));
  const sameParent = (left: PageAlignmentPlan["regions"][number], right: PageAlignmentPlan["regions"][number]) => {
    const a = parentByRegion.get(left.designParentFigmaNodeId);
    const b = parentByRegion.get(right.designParentFigmaNodeId);
    return a !== undefined || b !== undefined ? a !== undefined && a === b : hasSameDesignParent(left, right);
  };
  const matched = alignment.plan.regions.filter((region) =>
    region.status === "matched" &&
    hasResidualEligibleDisplacement(region) &&
    region.evidenceConfidence.score >= alignment.confidenceLevels.mediumMin &&
    boxByRegion.has(region.designParentFigmaNodeId)
  );
  const output: ReviewIssue[] = [];
  const candidates: MissingModuleEvaluation[] = [];

  for (const [regionIndex, missing] of alignment.plan.regions.entries()) {
    if (missing.status !== "missing-in-actual" || missing.source !== "agent-verified") continue;
    const missingBox = boxByRegion.get(missing.designParentFigmaNodeId);
    const candidateBase = {
      candidateId: `missing-module:${missing.designParentFigmaNodeId}:${regionIndex}`,
      regionIndex,
      figmaNodeId: missing.designParentFigmaNodeId,
      designPath: missing.designPath,
      thresholds
    };
    if (!missingBox) {
      candidates.push({
        ...candidateBase,
        topology: "unsupported",
        published: false,
        rejectionReasons: ["missing-design-box"]
      });
      continue;
    }
    const preceding = matched
      .filter((region) => {
        const box = boxByRegion.get(region.designParentFigmaNodeId)!;
        return sameParent(region, missing) &&
          box.y + box.height <= missingBox.y + alignment.positionTolerancePx;
      })
      .sort((a, b) => {
        const aBox = boxByRegion.get(a.designParentFigmaNodeId)!;
        const bBox = boxByRegion.get(b.designParentFigmaNodeId)!;
        return (bBox.y + bBox.height) - (aBox.y + aBox.height);
      })[0];
    const following = matched
      .filter((region) => {
        const box = boxByRegion.get(region.designParentFigmaNodeId)!;
        return sameParent(region, missing) &&
          box.y >= missingBox.y + missingBox.height - alignment.positionTolerancePx;
      })
      .sort((a, b) =>
        boxByRegion.get(a.designParentFigmaNodeId)!.y -
        boxByRegion.get(b.designParentFigmaNodeId)!.y
      )[0];
    const fallbackFollowingEvidence = following?.alignmentRole === "missing-module-following-fallback"
      ? {
          followingAnchorSource: "temporal-stable-structure-fallback" as const,
          followingAnchorStats: following.anchorStats
        }
      : {};
    const pageBoundaryEvidence = !preceding?.displacement &&
      Boolean(alignment.designPageBox) &&
      Math.abs(missingBox.y - alignment.designPageBox!.y) <= alignment.positionTolerancePx;
    const topology: MissingModuleEvaluation["topology"] = preceding?.displacement
      ? "interior"
      : pageBoundaryEvidence
        ? "leading"
        : "unsupported";
    const overlapRatios = [
      ...(preceding
        ? [horizontalOverlapRatio(boxByRegion.get(preceding.designParentFigmaNodeId)!, missingBox)]
        : pageBoundaryEvidence
          ? [horizontalOverlapRatio(alignment.designPageBox!, missingBox)]
          : []),
      ...(following
        ? [horizontalOverlapRatio(boxByRegion.get(following.designParentFigmaNodeId)!, missingBox)]
        : [])
    ];
    const horizontalOverlap = overlapRatios.length > 0
      ? Math.min(...overlapRatios)
      : undefined;
    const rejectionReasons: MissingModuleEvaluation["rejectionReasons"] = [];
    if (!preceding?.displacement && !pageBoundaryEvidence) {
      rejectionReasons.push("missing-preceding-anchor");
    }
    if (!following?.displacement) rejectionReasons.push("missing-following-anchor");
    if (
      horizontalOverlap !== undefined &&
      horizontalOverlap < minimumHorizontalOverlapRatio
    ) {
      rejectionReasons.push("insufficient-horizontal-overlap");
    }

    if (!following?.displacement || (!preceding?.displacement && !pageBoundaryEvidence)) {
      candidates.push({
        ...candidateBase,
        topology,
        ...(preceding ? { precedingRegionId: preceding.designParentFigmaNodeId } : {}),
        ...(following ? { followingRegionId: following.designParentFigmaNodeId } : {}),
        ...fallbackFollowingEvidence,
        designBox: missingBox,
        ...(horizontalOverlap === undefined ? {} : { horizontalOverlapRatio: horizontalOverlap }),
        published: false,
        rejectionReasons
      });
      continue;
    }

    const followingBox = boxByRegion.get(following.designParentFigmaNodeId)!;
    const precedingBox = preceding
      ? boxByRegion.get(preceding.designParentFigmaNodeId)!
      : alignment.designPageBox!;
    const designFlowGap = followingBox.y - (
      pageBoundaryEvidence ? precedingBox.y : precedingBox.y + precedingBox.height
    );
    const displacementStep = pageBoundaryEvidence
      ? -following.displacement.y
      : preceding!.displacement!.y - following.displacement.y;
    const residual = Math.abs(designFlowGap - displacementStep);
    const allowedResidual = Math.max(
      alignment.positionTolerancePx * 2,
      Math.abs(designFlowGap) * maximumResidualRatio
    );
    const residualRatio = residual / Math.max(1, Math.abs(designFlowGap));
    if (designFlowGap <= alignment.positionTolerancePx) {
      rejectionReasons.push("insufficient-design-gap");
    }
    if (displacementStep <= alignment.positionTolerancePx) {
      rejectionReasons.push("insufficient-displacement-step");
    }
    if (residual > allowedResidual) rejectionReasons.push("residual-too-high");
    const evaluation: MissingModuleEvaluation = {
      ...candidateBase,
      topology,
      ...(preceding ? { precedingRegionId: preceding.designParentFigmaNodeId } : {}),
      followingRegionId: following.designParentFigmaNodeId,
      ...fallbackFollowingEvidence,
      designBox: missingBox,
      designFlowGapPx: roundForReport(designFlowGap),
      displacementStepPx: roundForReport(displacementStep),
      residualPx: roundForReport(residual),
      residualRatio: roundForReport(residualRatio, 4),
      ...(horizontalOverlap === undefined
        ? {}
        : { horizontalOverlapRatio: roundForReport(horizontalOverlap, 4) }),
      published: rejectionReasons.length === 0,
      rejectionReasons,
      thresholds
    };
    candidates.push(evaluation);
    if (!evaluation.published) {
      continue;
    }

    const fit = Math.max(0, 1 - residual / Math.max(1, Math.abs(designFlowGap)));
    const score = Math.min(
      fit,
      preceding?.evidenceConfidence.score ?? 1,
      following.evidenceConfidence.score
    );
    const moduleName = missing.designPath.at(-1) || missing.designParentFigmaNodeId;
    const issue: Issue = {
      id: `missing-module:${missing.designParentFigmaNodeId}`,
      category: locale === "en" ? "Structure" : "结构",
      severity: score >= alignment.confidenceLevels.highMin ? "error" : "pending",
      title: locale === "en" ? `${moduleName} module is missing` : `${moduleName}缺失`,
      summary: locale === "en"
        ? pageBoundaryEvidence
          ? `The ${roundForReport(designFlowGap)}px design-flow gap from the page top is explained by the following module's ${roundForReport(displacementStep)}px upward displacement.`
          : `The ${roundForReport(designFlowGap)}px design-flow gap between the adjacent matched modules is explained by their ${roundForReport(displacementStep)}px displacement step.`
        : pageBoundaryEvidence
          ? `页面顶部的设计流缺口为 ${roundForReport(designFlowGap)}px，与后续模块 ${roundForReport(displacementStep)}px 的上移量一致。`
          : `相邻已匹配模块之间的设计流缺口为 ${roundForReport(designFlowGap)}px，与前后模块 ${roundForReport(displacementStep)}px 的位移阶跃一致。`,
      expected: locale === "en"
        ? `Module exists at the Figma position (${boxForReport(missingBox)})`
        : `模块存在于 Figma 设计位置（${boxForReport(missingBox)}）`,
      actual: locale === "en"
        ? pageBoundaryEvidence
          ? "No corresponding module exists before the verified leading module"
          : "No corresponding module exists between the verified neighboring modules"
        : pageBoundaryEvidence
          ? "已验证的首个后续模块之前没有对应开发模块"
          : "已验证的相邻模块之间没有对应开发模块",
      suggestion: locale === "en"
        ? `Restore the ${moduleName} module before adjusting downstream element offsets.`
        : `先恢复${moduleName}，再处理下游元素位移。`,
      figmaNodeId: missing.designParentFigmaNodeId,
      designBox: missingBox,
      evidenceConfidence: {
        score,
        level: pageAlignmentConfidenceLevel(score, alignment.confidenceLevels),
        basis: [
          "agent-hypothesis",
          "structure-geometry",
          "geometric-alignment"
        ],
        reasons: [
          missing.reason,
          locale === "en"
            ? `${pageBoundaryEvidence ? "The verified following module moves upward" : "Verified neighboring modules change displacement"} by ${roundForReport(displacementStep)}px with ${roundForReport(residual)}px residual against the design-flow gap.`
            : `${pageBoundaryEvidence ? "已验证后续模块上移" : "已验证相邻模块的位移变化为"} ${roundForReport(displacementStep)}px，与设计流缺口的残差为 ${roundForReport(residual)}px。`
        ]
      },
      rule: "missing_module"
    };
    const item = asReviewIssue(issue, locale);
    const presentation = issuePresentation(item, locale);
    item.title = presentation.title;
    item.location.description = presentation.location;
    item.summary = presentation.summary;
    item.primaryAction = item.suggestion = presentation.suggestion;
    output.push(item);
  }
  return {
    issues: output,
    summary: {
      evaluatedCount: candidates.length,
      publishedCount: output.length,
      candidates
    }
  };
}

function roundForReport(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function boxForReport(box: Box): string {
  return `x ${roundForReport(box.x)}px · y ${roundForReport(box.y)}px · ${roundForReport(box.width)}×${roundForReport(box.height)}px`;
}

function numericTokens(value: string): string[] {
  return value.match(/[-+]?\d+(?:\.\d+)?(?:px|%|ΔE)?/g) ?? [];
}

function validRewrite(value: unknown, issue: ReviewIssue): value is ReviewIssueRewrite {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (![record.title, record.summary, record.suggestion].every((field) => typeof field === "string" && field.trim())) {
    return false;
  }
  const allowed = new Set(numericTokens(JSON.stringify({
    title: issue.title,
    summary: issue.summary,
    suggestion: issue.suggestion,
    evidence: issue.evidence
  })));
  return [record.title, record.summary, record.suggestion]
    .flatMap((field) => numericTokens(field as string))
    .every((token) => allowed.has(token));
}

export async function aggregateReviewIssueResult(
  lowLevelIssues: Issue[],
  locale: Locale,
  options: AggregateReviewIssueOptions = {}
): Promise<AggregateReviewIssueResult> {
  const visualRegions = lowLevelIssues.filter((issue) => issue.rule === "visual_region");
  const primaryIssues = lowLevelIssues.filter((issue) => issue.rule !== "visual_region");
  const modulePositions = options.moduleAlignment && !options.relativeLayoutOnly
    ? modulePositionIssues(lowLevelIssues, locale, options.moduleAlignment)
    : { issues: [], consumedIds: new Set<string>() };
  const structuralMissingModules = options.moduleAlignment
    ? structuralMissingModuleReview(locale, options.moduleAlignment)
    : {
        issues: [],
        summary: { evaluatedCount: 0, publishedCount: 0, candidates: [] }
      };
  const output: ReviewIssue[] = [...(options.relativeLayoutOnly ? [] : structuralMissingModules.issues), ...modulePositions.issues];
  const modulePositionIssueIds = new Set(modulePositions.issues.map((issue) => issue.id));

  for (const issue of primaryIssues) {
    if (modulePositions.consumedIds.has(issue.id)) continue;
    const duplicate = output.find((candidate) =>
      !modulePositionIssueIds.has(candidate.id) &&
      (candidate.rule === issue.rule || !["missing_module", "design_coverage_unverified", "visual_similarity", "region_displacement"].includes(candidate.rule) && !["missing_module", "design_coverage_unverified", "visual_similarity", "region_displacement"].includes(issue.rule)) &&
      sameElement(candidate, issue)
    );
    if (duplicate) {
      duplicate.evidence.push(evidenceFor(issue));
      if (severityOrder[issue.severity] < severityOrder[duplicate.severity] || issue.severity === "pending" && duplicate.severity !== "error") {
        duplicate.severity = issue.severity;
        duplicate.priority = priorityFor(issue);
        duplicate.evidenceConfidence = issue.evidenceConfidence;
      }
      if (issue.severity === duplicate.severity && issue.evidenceConfidence.score < duplicate.evidenceConfidence.score) {
        duplicate.evidenceConfidence = issue.evidenceConfidence;
      }
      const actionable = duplicate.evidence.filter(item => item.rule !== "visual_region");
      duplicate.expected = actionable.map(item => `${reviewRuleLabel(item.rule)}：${item.expected ?? "—"}`).join("；");
      duplicate.actual = actionable.map(item => `${reviewRuleLabel(item.rule)}：${item.actual ?? "—"}`).join("；");
      const presentation = issuePresentation(asReviewIssue(issue, locale), locale);
      duplicate.primaryAction = [...new Set([duplicate.primaryAction, presentation.suggestion])].join(" ");
      duplicate.suggestion = duplicate.primaryAction;
      duplicate.summary = actionable.map(item => item.summary).join("；");
      continue;
    }
    const item = asReviewIssue(issue, locale);
    const presentation = issuePresentation(item, locale);
    item.title = presentation.title;
    item.location.description = presentation.location;
    item.summary = presentation.summary;
    item.primaryAction = item.suggestion = presentation.suggestion;
    output.push(item);
  }

  for (const visual of visualRegions) {
    const owner = output.find((candidate) => candidate.rule !== "region_displacement" && sameRegion(candidate, visual));
    if (owner) owner.evidence.push(evidenceFor(visual));
    else output.push(asReviewIssue(visual, locale));
  }

  if (options.rewriter) {
    for (const issue of output) {
      let rewrite: unknown;
      try {
        rewrite = await options.rewriter(issue);
      } catch {
        continue;
      }
      if (!validRewrite(rewrite, issue)) continue;
      issue.title = rewrite.title;
      issue.summary = rewrite.summary;
      issue.suggestion = rewrite.suggestion;
      issue.primaryAction = rewrite.suggestion;
    }
  }
  for (const issue of output) {
    const presentation = issuePresentation(issue, locale);
    issue.title = presentation.title;
    issue.location.description = presentation.location;
    issue.summary = presentation.summary;
    issue.primaryAction = issue.suggestion = presentation.suggestion;
  }
  for (const issue of output) {
    const presentation = issuePresentation(issue, locale);
    issue.title = presentation.title;
    issue.location.description = presentation.location;
    issue.summary = presentation.summary;
    issue.primaryAction = issue.suggestion = presentation.suggestion;
  }
  return { issues: output, missingModules: structuralMissingModules.summary };
}

export async function aggregateReviewIssues(
  lowLevelIssues: Issue[],
  locale: Locale,
  options: AggregateReviewIssueOptions = {}
): Promise<ReviewIssue[]> {
  return (await aggregateReviewIssueResult(lowLevelIssues, locale, options)).issues;
}
