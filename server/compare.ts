import pixelmatch from "pixelmatch";
import sharp from "sharp";
import type {
  AcceptanceConfig,
  ActualEvidence,
  ActualEvidenceElement,
  AgentElementBindingRequest,
  AgentElementBindingResult,
  Box,
  DesignTruth,
  DesignTruthNode,
  DomElement,
  DynamicNormalizationSummary,
  DynamicFallbackDecision,
  DynamicFallbackReasonCode,
  ElementChangeSummary,
  ElementMatchEvidence,
  ElementMatchingEvidence,
  EvidenceConfidence,
  HybridAlignment,
  Issue,
  MarketVariantSummary,
  MarketListSummary,
  PageAlignmentAnchorStats,
  PageAlignmentPlan,
  PageAlignmentRegionDecision,
  ReviewIssue,
  SemanticAgentMatchingEvidence,
  Severity
} from "../src/types";
import type { StaticAudit } from "../src/types";
import { severityFor } from "./default-rules";
import {
  isPotentialDynamicTextPair,
  resolveDynamicNormalization,
  type DynamicHypothesisAgent
} from "./dynamic";
import { buildNormalizationPlan } from "./normalization-plan";
import { localText, type Locale } from "./i18n";
import { analyzeMarketVariants } from "./market-variant";
import { analyzeMarketLists } from "./market-list";
import { aggregateReviewIssueResult, type ReviewIssueRewriter } from "./review-issue";
import { evaluateDesignCoverage } from "./design-coverage";
import { verifyDataDrivenWidths } from "./data-geometry";
import { reviewCheckRecorder } from "./review-checks";
import { identifyReviewRegions } from "./region-correspondence";
import { alignRegionPixels } from "./region-pixels";
import {
  pageAlignmentConfidenceLevel,
  scorePageAlignmentConfidence
} from "./page-alignment-confidence";

interface VisualComparison {
  scope: NonNullable<ElementMatchingEvidence["visualScope"]>;
  diff: Buffer;
  similarity: number;
  regions: Array<Box & { changedPixels: number; density: number }>;
}

interface ElementMatch {
  design: ComparableDesignNode;
  actual: ActualEvidenceElement;
  confidence: number;
  method: ElementMatchEvidence["method"];
  agentAssisted?: boolean;
  templateStyleOnly?: boolean;
}

interface DynamicFallbackCandidateDecision extends DynamicFallbackDecision {
  designModuleId: string;
  geometryScore: number;
}

interface ComparableDesignNode {
  id: string;
  ancestorIds: string[];
  ancestorPath: string[];
  name: string;
  type: string;
  text?: string;
  box: Box;
  style: DesignTruthNode["style"];
  node: DesignTruthNode;
}

export interface ComparisonResult {
  referenceImage: Buffer;
  actualImage: Buffer;
  diffImage: Buffer;
  similarity: number;
  issues: ReviewIssue[];
  matching: ElementMatchingEvidence;
  dynamicNormalization: DynamicNormalizationSummary;
  marketVariants: MarketVariantSummary;
  marketLists: MarketListSummary;
  alignment?: HybridAlignment;
}

export interface CompareOptions {
  dynamicHypothesisAgent?: DynamicHypothesisAgent;
  elementBindingAgent?: ElementBindingAgent;
  reviewIssueRewriter?: ReviewIssueRewriter;
}

export type ElementBindingAgent = (input: {
  request: AgentElementBindingRequest;
  referenceImage: Buffer;
  actualImage: Buffer;
}) => Promise<AgentElementBindingResult>;

const severityRank: Record<Severity, number> = {
  error: 0,
  warning: 1,
  pending: 2,
  info: 3
};

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function median(values: number[]): number {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function moduleDisplacementConsensus(
  matches: ElementMatch[],
  tolerancePx: number
): {
  displacement?: { x: number; y: number };
  inlierCount: number;
  residualPx: number | null;
} {
  const offsets = matches.map((match) => ({
    x: match.actual.box.x - match.design.box.x,
    y: match.actual.box.y - match.design.box.y
  }));
  if (offsets.length === 1) {
    return {
      inlierCount: 1,
      residualPx: 0
    };
  }

  const candidates = offsets.map((candidate) => {
    const inliers = offsets.filter((offset) =>
      Math.hypot(offset.x - candidate.x, offset.y - candidate.y) <= tolerancePx
    );
    const residual = inliers.reduce((sum, offset) =>
      sum + Math.hypot(offset.x - candidate.x, offset.y - candidate.y), 0
    );
    return { inliers, residual };
  }).sort((a, b) =>
    b.inliers.length - a.inliers.length || a.residual - b.residual
  );
  const consensus = candidates[0]?.inliers ?? [];
  const displacement = consensus.length > 0
    ? {
        x: round(median(consensus.map((offset) => offset.x))),
        y: round(median(consensus.map((offset) => offset.y)))
      }
    : undefined;
  const residualPx = displacement
    ? round(Math.sqrt(
        consensus.reduce((sum, offset) =>
          sum + (offset.x - displacement.x) ** 2 + (offset.y - displacement.y) ** 2, 0
        ) / consensus.length
      ), 2)
    : null;
  if (consensus.length <= offsets.length / 2) {
    return { inlierCount: consensus.length, residualPx };
  }
  return {
    displacement: displacement!,
    inlierCount: consensus.length,
    residualPx
  };
}

interface TemporalAnchorEvidence {
  sampleCount: number;
  changes: ElementChangeSummary[];
  samples?: Array<{ elements: ActualEvidenceElement[] }>;
}

interface TemporalAnchorSelection {
  anchors: ElementMatch[];
  applied: boolean;
  excludedCount: number;
  dynamicExcludedCount: number;
  stableCount: number;
  structuralAnchorCount: number;
  preferredCount: number;
  deprioritizedCount: number;
}

function isKnownDynamicModuleAnchor(match: ElementMatch): boolean {
  const structuralContext = [
    match.design.name,
    match.actual.selector,
    match.actual.parentSelector ?? "",
    match.actual.role ?? ""
  ].join(" ");
  if (
    /轮播|跑马灯|滚动播报|倒计时|计时器|实时行情|实时价格|行情数值|carousel|swiper|slider|marquee|countdown|timer|live.?market|live.?price/i
      .test(structuralContext)
  ) {
    return true;
  }
  return isPotentialDynamicTextPair({
    designName: match.design.name,
    designContextTexts: match.design.ancestorPath,
    designText: match.design.text,
    actualText: match.actual.text
  });
}

function isPreferredStructuralModuleAnchor(match: ElementMatch): boolean {
  const tag = match.actual.tag.toLocaleLowerCase();
  const context = [
    match.design.name,
    match.actual.selector,
    match.actual.role ?? ""
  ].join(" ");
  return (
    /^h[1-6]$/.test(tag) ||
    ["header", "nav", "section", "article", "table", "thead", "th"].includes(tag) ||
    /标题|表头|页头|导航|容器|模块|卡片|title|heading|header|navigation|container|section|panel|card|column.?header/i
      .test(context) ||
    ["FRAME", "GROUP", "COMPONENT", "INSTANCE"].includes(match.design.type.toUpperCase())
  );
}

function selectTemporallyStableAnchors(
  matches: ElementMatch[],
  evidence: TemporalAnchorEvidence
): TemporalAnchorSelection {
  if (evidence.sampleCount < 2 || evidence.changes.length === 0) {
    const structuralAnchorCount = matches.filter(isPreferredStructuralModuleAnchor).length;
    return {
      anchors: matches,
      applied: false,
      excludedCount: 0,
      dynamicExcludedCount: 0,
      stableCount: matches.length,
      structuralAnchorCount,
      preferredCount: 0,
      deprioritizedCount: 0
    };
  }
  const changesByFingerprint = new Map(
    evidence.changes.map((change) => [change.fingerprintKey, change])
  );
  const minimumObservedSampleCount = Math.max(
    2,
    Math.ceil(evidence.sampleCount * 2 / 3)
  );
  let dynamicExcludedCount = 0;
  const stable = matches.filter((match) => {
    const change = changesByFingerprint.get(match.actual.fingerprint.key);
    const dynamic = Boolean(
      isKnownDynamicModuleAnchor(match) ||
      change?.textChanged ||
      change?.geometryChanged ||
      change?.styleChanged
    );
    if (dynamic) dynamicExcludedCount += 1;
    return Boolean(
      change &&
      new Set(change.observedSampleIndexes).size >= minimumObservedSampleCount &&
      !dynamic
    );
  });
  const preferred = stable.filter(isPreferredStructuralModuleAnchor);
  const usePreferred = preferred.length >= 2;
  return {
    anchors: usePreferred ? preferred : stable,
    applied: true,
    excludedCount: matches.length - stable.length,
    dynamicExcludedCount,
    stableCount: stable.length,
    structuralAnchorCount: preferred.length,
    preferredCount: usePreferred ? preferred.length : 0,
    deprioritizedCount: usePreferred ? stable.length - preferred.length : 0
  };
}

function alignmentAnchorStats(
  candidateCount: number,
  selection: TemporalAnchorSelection,
  consensus: ReturnType<typeof moduleDisplacementConsensus>
): PageAlignmentAnchorStats {
  return {
    candidateCount,
    stableCount: selection.stableCount,
    dynamicExcludedCount: selection.dynamicExcludedCount,
    structuralAnchorCount: selection.structuralAnchorCount,
    inlierCount: consensus.inlierCount,
    residualPx: consensus.residualPx
  };
}

function alignmentStatsReason(
  stats: PageAlignmentAnchorStats,
  locale: Locale
): string {
  const residual = stats.residualPx === null ? "-" : `${stats.residualPx}px`;
  return localText(
    locale,
    `锚点评分依据：候选 ${stats.candidateCount}，稳定 ${stats.stableCount}，动态排除 ${stats.dynamicExcludedCount}，结构锚点 ${stats.structuralAnchorCount}，RANSAC 内点 ${stats.inlierCount}，残差 ${residual}。`,
    `Anchor scoring evidence: ${stats.candidateCount} candidates, ${stats.stableCount} stable, ${stats.dynamicExcludedCount} dynamic excluded, ${stats.structuralAnchorCount} structural anchors, ${stats.inlierCount} RANSAC inliers, residual ${residual}.`
  );
}

function temporalAnchorSelectionSummary(
  selection: TemporalAnchorSelection,
  locale: Locale,
  purpose: "consensus" | "verification"
): string {
  const action = purpose === "consensus" ? "位移共识" : "位移复核";
  const englishAction = purpose === "consensus"
    ? "displacement consensus"
    : "displacement verification";
  return localText(
    locale,
    `${selection.anchors.length} 个跨帧稳定锚点参与${action}，排除 ${selection.excludedCount} 个动态或不完整锚点。${selection.preferredCount > 0 ? `优先采用 ${selection.preferredCount} 个标题、表头或容器锚点，未纳入 ${selection.deprioritizedCount} 个普通稳定元素。` : ""}`,
    `${selection.anchors.length} temporally stable anchors entered ${englishAction}; ${selection.excludedCount} dynamic or incomplete anchors were excluded.${selection.preferredCount > 0 ? ` ${selection.preferredCount} heading, header, or container anchors were prioritized over ${selection.deprioritizedCount} ordinary stable elements.` : ""}`
  );
}

function formatPx(value: number | undefined, locale: Locale): string {
  return typeof value === "number" ? `${round(value)}px` : localText(locale, "未设置", "not set");
}

function centerDistance(a: Box, b: Box): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

function sizeSimilarity(a: Box, b: Box): number {
  const width = Math.min(a.width, b.width) / Math.max(a.width, b.width, 1);
  const height = Math.min(a.height, b.height) / Math.max(a.height, b.height, 1);
  return (width + height) / 2;
}

function overlapArea(a: Box, b: Box): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function compatibleType(design: ComparableDesignNode, actual: DomElement): boolean {
  const type = design.type.toUpperCase();
  if (type === "TEXT") return Boolean(actual.text);
  if (["VECTOR", "BOOLEAN_OPERATION", "ELLIPSE", "LINE", "STAR"].includes(type)) {
    return ["svg", "img", "i", "span"].includes(actual.tag);
  }
  if (/button|cta|按钮/i.test(design.name)) return actual.tag === "button" || actual.tag === "a";
  if (/input|输入/i.test(design.name)) return ["input", "textarea", "select"].includes(actual.tag);
  return true;
}

function normalizeText(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

function hasConflictingVisibleText(
  design: ComparableDesignNode,
  actual: ActualEvidenceElement,
  allowPotentialDynamicPair: boolean
): boolean {
  if (design.type.toUpperCase() !== "TEXT") return false;
  const designText = normalizeText(design.text);
  const actualText = normalizeText(actual.text);
  if (!designText || !actualText || designText === actualText) return false;
  if (!allowPotentialDynamicPair) return true;
  return !isPotentialDynamicTextPair({
    designName: design.name,
    designContextTexts: design.ancestorPath,
    designText: design.text,
    actualText: actual.text
  });
}

function temporalDynamicFallbackRejection(
  actual: ActualEvidenceElement,
  evidence: TemporalAnchorEvidence
): DynamicFallbackReasonCode | undefined {
  if (evidence.sampleCount < 3) return "insufficient_temporal_samples";
  const change = evidence.changes.find(
    (candidate) => candidate.fingerprintKey === actual.fingerprint.key
  );
  if (!change) return "temporal_evidence_missing";
  if (!change.presentInAllSamples || change.observedSampleIndexes.length < 3) {
    return "incomplete_temporal_presence";
  }
  if (!change.textChanged) return "text_unchanged";
  if (change.geometryChanged) return "geometry_changed";
  if (change.styleChanged) return "style_changed";
  return undefined;
}

function primaryFontFamily(value?: string): string {
  return (value ?? "")
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .toLocaleLowerCase()
    .replace(/[\s_-]+/g, "");
}

function canonicalLtrTextAlign(value?: string): string {
  const normalized = (value ?? "").trim().toLocaleLowerCase();
  if (normalized === "start") return "left";
  if (normalized === "end") return "right";
  return normalized;
}

function comparableDesignElements(truth: DesignTruth): ComparableDesignNode[] {
  const output: ComparableDesignNode[] = [];

  function visit(
    node: DesignTruthNode,
    ancestorPath: string[],
    ancestorIds: string[]
  ): void {
    const hasVisualStyle = Boolean(
      node.style.color ||
      node.style.backgroundColor ||
      node.style.borderColor ||
      node.style.boxShadow
    );
    const isUseful =
      node.id !== truth.root.id &&
      node.box &&
      (node.type === "TEXT" || node.children.length > 0 ||
        node.children.length === 0 ||
        hasVisualStyle ||
        /button|input|logo|icon|按钮|输入|图标/i.test(node.name));

    if (isUseful && node.box && output.length < 1200) {
      output.push({
        id: node.id,
        ancestorIds,
        ancestorPath,
        name: node.name,
        type: node.type,
        text: node.text,
        box: node.box,
        style: node.style,
        node
      });
    }
    const childAncestorPath = [...ancestorPath, node.name].filter(Boolean);
    const childAncestorIds = [...ancestorIds, node.id];
    node.children.forEach((child) => visit(child, childAncestorPath, childAncestorIds));
  }

  visit(truth.root, [], []);
  return output;
}

function designRegionBoxes(truth: DesignTruth): Array<{ figmaNodeId: string; parentId?: string; box: Box }> {
  const output: Array<{ figmaNodeId: string; parentId?: string; box: Box }> = [];

  function visit(node: DesignTruthNode): void {
    if (node.box) {
      output.push({ figmaNodeId: node.id, parentId: node.parentId, box: node.box });
    }
    node.children.forEach(visit);
  }

  visit(truth.root);
  return output;
}

async function elementMatches(
  designRoot: DesignTruthNode,
  designElements: ComparableDesignNode[],
  domElements: ActualEvidenceElement[],
  viewport: { width: number; height: number },
  minConfidence: number,
  alignmentConfidence: AcceptanceConfig["pageAlignment"]["confidence"],
  positionTolerancePx: number,
  temporalEvidence: TemporalAnchorEvidence,
  locale: Locale,
  images: { referenceImage: Buffer; actualImage: Buffer },
  agent?: ElementBindingAgent,
  verifiedRegions: PageAlignmentRegionDecision[] = []
): Promise<{
  matches: ElementMatch[];
  unmatchedDesign: ComparableDesignNode[];
  unmatchedDom: ActualEvidenceElement[];
  diagnostics: string[];
  pageAlignment: PageAlignmentPlan;
  semanticAgent: SemanticAgentMatchingEvidence;
}> {
  const unusedDesign = new Set(designElements.map((_, index) => index));
  const unusedDom = new Set(domElements.map((_, index) => index));
  const matches: ElementMatch[] = [];
  const diagnostics: string[] = [];
  const pageAlignmentRegions = new Map<string, PageAlignmentRegionDecision>();
  const blockedDesignRegionIds = new Set<string>();
  let pageAlignmentSummary = "";
  let rejectedRegionCount = 0;

  const actualElementsBySelector = new Map(
    domElements.map((element) => [element.selector, element])
  );
  const belongsToActualRegion = (
    actual: ActualEvidenceElement,
    regionSelector: string
  ): boolean => {
    const seen = new Set<string>();
    let selector: string | undefined = actual.selector;
    while (selector && !seen.has(selector)) {
      if (selector === regionSelector) return true;
      seen.add(selector);
      selector = actualElementsBySelector.get(selector)?.parentSelector;
    }
    return false;
  };
  const boundaryRegions = verifiedRegions.filter(region => !verifiedRegions.some(parent => parent !== region &&
    designElements.find(node => node.id === region.designParentFigmaNodeId)?.ancestorIds.includes(parent.designParentFigmaNodeId)));
  const crossesIdentifiedRegion = (design: ComparableDesignNode, actual: ActualEvidenceElement) => boundaryRegions.some(region =>
    Boolean(region.actualParentSelector) &&
    (design.id === region.designParentFigmaNodeId || design.ancestorIds.includes(region.designParentFigmaNodeId)) !== belongsToActualRegion(actual, region.actualParentSelector!));
  const accept = (
    designIndex: number,
    domIndex: number,
    confidence: number,
    method: ElementMatch["method"]
  ): void => {
    const candidateDesign = designElements[designIndex];
    const candidateActual = domElements[domIndex];
    // A visible text label cannot stand in for a leaf graphic, even at the same coordinates.
    if (["VECTOR", "BOOLEAN_OPERATION", "LINE", "ELLIPSE", "POLYGON", "STAR"].includes(candidateDesign.type) && candidateActual.text?.trim()) return;
    if (crossesIdentifiedRegion(candidateDesign, candidateActual)) return;
    unusedDesign.delete(designIndex);
    unusedDom.delete(domIndex);
    matches.push({
      design: designElements[designIndex],
      actual: domElements[domIndex],
      confidence,
      method
    });
  };

  for (const region of verifiedRegions) {
    const designIndex = designElements.findIndex(node => node.id === region.designParentFigmaNodeId);
    const domIndex = domElements.findIndex(node => node.selector === region.actualParentSelector);
    if (designIndex >= 0 && domIndex >= 0 && unusedDesign.has(designIndex) && unusedDom.has(domIndex)) {
      accept(designIndex, domIndex, Math.min(region.confidence, region.evidenceConfidence.score), "verified-region");
      pageAlignmentRegions.set(region.designParentFigmaNodeId, region);
    }
  }

  for (const designIndex of [...unusedDesign]) {
    const design = designElements[designIndex];
    const domIndex = [...unusedDom].find(
      (index) => domElements[index].dataFigmaId?.replace(/-/g, ":") === design.id.replace(/-/g, ":")
    );
    if (domIndex !== undefined) accept(designIndex, domIndex, 1, "exact-id");
  }

  const diagonal = Math.hypot(viewport.width, viewport.height);
  const designIndexesByText = new Map<string, number[]>();
  const domIndexesByText = new Map<string, number[]>();
  for (const designIndex of unusedDesign) {
    const text = normalizeText(designElements[designIndex].text);
    if (text) designIndexesByText.set(text, [...(designIndexesByText.get(text) ?? []), designIndex]);
  }
  for (const domIndex of unusedDom) {
    const text = normalizeText(domElements[domIndex].text);
    if (text) domIndexesByText.set(text, [...(domIndexesByText.get(text) ?? []), domIndex]);
  }
  const ambiguousDesign = new Set<number>();
  const ambiguousDom = new Set<number>();
  let ambiguousTextGroupCount = 0;
  for (const [text, designIndexes] of designIndexesByText) {
    const domIndexes = domIndexesByText.get(text) ?? [];
    if (domIndexes.length === 0 || (designIndexes.length === 1 && domIndexes.length === 1)) continue;
    ambiguousTextGroupCount += 1;
    designIndexes.forEach((index) => ambiguousDesign.add(index));
    domIndexes.forEach((index) => ambiguousDom.add(index));
  }
  if (ambiguousTextGroupCount > 0) {
    diagnostics.push(localText(
      locale,
      `检测到 ${ambiguousTextGroupCount} 组跨模块重复文案；已跳过全局文本捷径，交由带层级上下文的语义复核。`,
      `Detected ${ambiguousTextGroupCount} duplicate text group(s) across modules; global text matching was skipped in favor of hierarchy-aware semantic review.`
    ));
  }
  const textCandidates: Array<{ designIndex: number; domIndex: number; score: number }> = [];
  for (const designIndex of unusedDesign) {
    if (ambiguousDesign.has(designIndex)) continue;
    const design = designElements[designIndex];
    const text = normalizeText(design.text);
    if (!text) continue;
    for (const domIndex of unusedDom) {
      if (ambiguousDom.has(domIndex)) continue;
      const actual = domElements[domIndex];
      if (normalizeText(actual.text) !== text) continue;
      const distanceScore = 1 - Math.min(1, centerDistance(design.box, actual.box) / diagonal);
      const score = 0.72 + distanceScore * 0.16 + sizeSimilarity(design.box, actual.box) * 0.1 +
        (compatibleType(design, actual) ? 0.02 : 0);
      if (score >= minConfidence) textCandidates.push({ designIndex, domIndex, score });
    }
  }
  textCandidates.sort((a, b) => b.score - a.score);
  for (const candidate of textCandidates) {
    if (!unusedDesign.has(candidate.designIndex) || !unusedDom.has(candidate.domIndex)) continue;
    const actual = domElements[candidate.domIndex];
    const visual = actual.fingerprint.identitySource === "visual-anchor";
    accept(
      candidate.designIndex,
      candidate.domIndex,
      visual ? Math.min(0.82, actual.visualConfidence ?? 0.7) : Math.min(0.99, candidate.score),
      visual ? "visual-inference" : "stable-text"
    );
  }

  const strongRegionMatches = matches.filter((match) =>
    (match.method === "exact-id" || match.method === "stable-text") &&
    match.design.node.parentId &&
    match.actual.parentSelector
  );
  const regionHints = strongRegionMatches.map((match) => ({
    designParentFigmaNodeId: match.design.node.parentId!,
    designPath: match.design.ancestorPath,
    actualParentSelector: match.actual.parentSelector!,
    evidence: match.method as "exact-id" | "stable-text"
  }));
  const actualParentToDesignParents = new Map<string, Set<string>>();
  const designParentToActualParents = new Map<string, Set<string>>();
  for (const hint of regionHints) {
    actualParentToDesignParents.set(
      hint.actualParentSelector,
      new Set([...(actualParentToDesignParents.get(hint.actualParentSelector) ?? []), hint.designParentFigmaNodeId])
    );
    designParentToActualParents.set(
      hint.designParentFigmaNodeId,
      new Set([...(designParentToActualParents.get(hint.designParentFigmaNodeId) ?? []), hint.actualParentSelector])
    );
  }
  const regionAnchorGroups = new Map<string, ElementMatch[]>();
  for (const match of strongRegionMatches) {
    const key = JSON.stringify([
      match.design.node.parentId!,
      match.actual.parentSelector!
    ]);
    regionAnchorGroups.set(key, [...(regionAnchorGroups.get(key) ?? []), match]);
  }
  for (const regionMatches of regionAnchorGroups.values()) {
    const match = regionMatches[0];
    const designParentFigmaNodeId = match.design.node.parentId!;
    const actualParentSelector = match.actual.parentSelector!;
    if (verifiedRegions.some(region => region.designParentFigmaNodeId === designParentFigmaNodeId)) continue;
    if (
      designParentToActualParents.get(designParentFigmaNodeId)?.size !== 1 ||
      actualParentToDesignParents.get(actualParentSelector)?.size !== 1
    ) {
      continue;
    }
    const confidence = match.method === "exact-id" ? 1 : Math.min(0.99, match.confidence);
    const temporalSelection = selectTemporallyStableAnchors(
      regionMatches,
      temporalEvidence
    );
    const displacementConsensus = moduleDisplacementConsensus(
      temporalSelection.anchors,
      positionTolerancePx
    );
    const anchorStats = alignmentAnchorStats(
      regionMatches.length,
      temporalSelection,
      displacementConsensus
    );
    const scoreBreakdown = scorePageAlignmentConfidence({
      baseScore: confidence,
      anchorStats,
      eligibleAnchorCount: temporalSelection.anchors.length,
      positionTolerancePx,
      config: alignmentConfidence
    });
    const evidenceScore = scoreBreakdown.finalScore;
    const hasDisplacementConsensus = Boolean(displacementConsensus.displacement);
    const temporalReason = temporalSelection.applied
      ? temporalAnchorSelectionSummary(temporalSelection, locale, "consensus")
      : "";
    pageAlignmentRegions.set(designParentFigmaNodeId, {
      designParentFigmaNodeId,
      designPath: match.design.ancestorPath,
      status: "matched",
      actualParentSelector,
      ...(displacementConsensus.displacement
        ? { displacement: displacementConsensus.displacement }
        : {}),
      confidence,
      reason: localText(
        locale,
        temporalSelection.applied
          ? hasDisplacementConsensus
            ? `${temporalReason} 模块对应关系及整体位移已由稳定证据确认。`
            : `${temporalReason} 模块对应关系已确定，但稳定锚点位移无多数共识，未发布整体位移。`
          : regionMatches.length > 1
          ? hasDisplacementConsensus
            ? `由 ${displacementConsensus.inlierCount}/${regionMatches.length} 个模块锚点的位移共识确定模块对应关系。`
            : `模块对应关系已确定，但 ${regionMatches.length} 个锚点位移无多数共识，未发布整体位移。`
          : `由${match.method === "exact-id" ? "精确 Figma ID" : "唯一稳定文案"}锚点确定模块对应关系。`,
        temporalSelection.applied
          ? hasDisplacementConsensus
            ? `${temporalReason} The module correspondence and whole-module displacement are confirmed by stable evidence.`
            : `${temporalReason} The module correspondence is established, but stable anchor offsets have no majority consensus, so no whole-module displacement was published.`
          : regionMatches.length > 1
          ? hasDisplacementConsensus
            ? `Module correspondence established from the displacement consensus of ${displacementConsensus.inlierCount}/${regionMatches.length} anchors.`
            : `Module correspondence is established, but ${regionMatches.length} anchor offsets have no majority consensus, so no whole-module displacement was published.`
          : `Module correspondence established by a ${match.method === "exact-id" ? "precise Figma ID" : "unique stable-text"} anchor.`
      ),
      source: "deterministic",
      anchorStats,
      scoreBreakdown,
      evidenceConfidence: {
        score: evidenceScore,
        level: pageAlignmentConfidenceLevel(evidenceScore, alignmentConfidence.levels),
        basis: [
          match.method,
          "structure-geometry",
          ...(temporalSelection.applied ? ["temporal-consistency" as const] : [])
        ],
        reasons: [localText(
          locale,
          temporalSelection.applied
            ? hasDisplacementConsensus
              ? `${displacementConsensus.inlierCount}/${temporalSelection.anchors.length} 个跨帧稳定锚点支持该模块位移。`
              : "跨帧证据确认模块对应，但不足以确认整体位移。"
            : regionMatches.length > 1
            ? hasDisplacementConsensus
              ? `${displacementConsensus.inlierCount}/${regionMatches.length} 个一对一强锚点共同支持该模块位移。`
              : `${regionMatches.length} 个一对一强锚点确认模块对应，但不足以确认整体位移。`
            : "模块两侧存在唯一的一对一强锚点。",
          temporalSelection.applied
            ? hasDisplacementConsensus
              ? `${displacementConsensus.inlierCount}/${temporalSelection.anchors.length} temporally stable anchors support the module displacement.`
              : "Temporal evidence confirms module correspondence but is insufficient to confirm a whole-module displacement."
            : regionMatches.length > 1
            ? hasDisplacementConsensus
              ? `${displacementConsensus.inlierCount}/${regionMatches.length} one-to-one strong anchors support the module displacement.`
              : `${regionMatches.length} one-to-one strong anchors confirm the module correspondence but not a whole-module displacement.`
            : "A unique one-to-one strong anchor exists on both sides of the module."
        ), alignmentStatsReason(anchorStats, locale)]
      }
    });
  }

  const anchorKey = (match: ElementMatch): string =>
    `${match.design.id}\u0000${match.actual.selector}`;
  const anchorsHandledByDirectRegions = new Set<string>();
  for (const regionMatches of regionAnchorGroups.values()) {
    const region = pageAlignmentRegions.get(regionMatches[0].design.node.parentId!);
    if (region?.displacement && regionMatches.length >= 2) {
      regionMatches.forEach((match) => anchorsHandledByDirectRegions.add(anchorKey(match)));
    }
  }
  const hierarchicalAnchorGroups = new Map<string, {
    designPath: string[];
    depth: number;
    matches: ElementMatch[];
  }>();
  for (const match of strongRegionMatches) {
    match.design.ancestorIds.forEach((ancestorId, index) => {
      if (index === 0) return;
      const existing = hierarchicalAnchorGroups.get(ancestorId);
      const entry = existing ?? {
        designPath: match.design.ancestorPath.slice(0, index + 1),
        depth: index,
        matches: []
      };
      entry.matches.push(match);
      hierarchicalAnchorGroups.set(ancestorId, entry);
    });
  }
  const claimedHierarchicalAnchors = new Set<string>();
  const hierarchicalCandidates = [...hierarchicalAnchorGroups.entries()]
    .sort(([, a], [, b]) => b.depth - a.depth);
  for (const [designParentFigmaNodeId, candidate] of hierarchicalCandidates) {
    if (pageAlignmentRegions.has(designParentFigmaNodeId)) continue;
    const regionMatches = candidate.matches.filter((match) =>
      !anchorsHandledByDirectRegions.has(anchorKey(match)) &&
      !claimedHierarchicalAnchors.has(anchorKey(match))
    );
    if (regionMatches.length < 2) continue;
    const designParents = new Set(regionMatches.map((match) => match.design.node.parentId));
    const actualParents = new Set(regionMatches.map((match) => match.actual.parentSelector));
    if (designParents.size === 1 && actualParents.size === 1) continue;

    const temporalSelection = selectTemporallyStableAnchors(regionMatches, temporalEvidence);
    if (temporalSelection.anchors.length < 2) continue;
    const displacementConsensus = moduleDisplacementConsensus(
      temporalSelection.anchors,
      positionTolerancePx
    );
    if (!displacementConsensus.displacement) continue;
    const anchorStats = alignmentAnchorStats(
      regionMatches.length,
      temporalSelection,
      displacementConsensus
    );
    const baseConfidence = Math.min(...temporalSelection.anchors.map((match) =>
      match.method === "exact-id" ? 1 : Math.min(0.99, match.confidence)
    ));
    const scoreBreakdown = scorePageAlignmentConfidence({
      baseScore: baseConfidence,
      anchorStats,
      eligibleAnchorCount: temporalSelection.anchors.length,
      positionTolerancePx,
      config: alignmentConfidence
    });
    const commonActualParent = actualParents.size === 1
      ? [...actualParents][0]
      : undefined;
    const regionName = candidate.designPath.at(-1) || designParentFigmaNodeId;
    const temporalReason = temporalSelection.applied
      ? temporalAnchorSelectionSummary(temporalSelection, locale, "consensus")
      : "";
    pageAlignmentRegions.set(designParentFigmaNodeId, {
      designParentFigmaNodeId,
      designPath: candidate.designPath,
      status: "matched",
      ...(commonActualParent ? { actualParentSelector: commonActualParent } : {}),
      displacement: displacementConsensus.displacement,
      confidence: baseConfidence,
      reason: localText(
        locale,
        `${temporalReason}${displacementConsensus.inlierCount}/${temporalSelection.anchors.length} 个强锚点在多个结构分支中共同支持“${regionName}”模块及其整体位移。`,
        `${temporalReason}${displacementConsensus.inlierCount}/${temporalSelection.anchors.length} strong anchors across structural branches support the “${regionName}” module and its whole-module displacement.`
      ),
      source: "deterministic",
      anchorStats,
      scoreBreakdown,
      evidenceConfidence: {
        score: scoreBreakdown.finalScore,
        level: pageAlignmentConfidenceLevel(
          scoreBreakdown.finalScore,
          alignmentConfidence.levels
        ),
        basis: [...new Set([
          ...temporalSelection.anchors.map((match) => match.method),
          "structure-geometry" as const,
          ...(temporalSelection.applied ? ["temporal-consistency" as const] : [])
        ])],
        reasons: [
          localText(
            locale,
            `${displacementConsensus.inlierCount}/${temporalSelection.anchors.length} 个跨结构分支的一对一强锚点形成位移共识。`,
            `${displacementConsensus.inlierCount}/${temporalSelection.anchors.length} one-to-one strong anchors across structural branches form a displacement consensus.`
          ),
          alignmentStatsReason(anchorStats, locale)
        ]
      }
    });
    temporalSelection.anchors.forEach((match) =>
      claimedHierarchicalAnchors.add(anchorKey(match))
    );
  }
  const crossesVerifiedRegion = (
    design: ComparableDesignNode,
    actual: ActualEvidenceElement
  ): boolean => {
    if (crossesIdentifiedRegion(design, actual)) return true;
    const designParentId = design.node.parentId;
    const actualParentSelector = actual.parentSelector;
    if (!designParentId || !actualParentSelector) return false;
    const anchoredDesignParents = actualParentToDesignParents.get(actualParentSelector);
    const anchoredActualParents = designParentToActualParents.get(designParentId);
    return Boolean(
      (anchoredDesignParents?.size === 1 && !anchoredDesignParents.has(designParentId)) ||
      (anchoredActualParents?.size === 1 && !anchoredActualParents.has(actualParentSelector))
    );
  };
  const belongsToDesignRegion = (
    design: ComparableDesignNode,
    regionId: string
  ): boolean => design.id === regionId || design.ancestorIds.includes(regionId);
  const designModuleScopeId = (design: ComparableDesignNode): string =>
    design.ancestorIds.find((ancestorId) => ancestorId !== designRoot.id) ?? design.id;
  const belongsToBlockedDesignRegion = (
    design: ComparableDesignNode
  ): boolean => [...blockedDesignRegionIds].some((regionId) =>
    belongsToDesignRegion(design, regionId)
  );
  let semanticAgentInvoked = false;
  let semanticAgentResponded = false;
  const agentAttempts: NonNullable<SemanticAgentMatchingEvidence["execution"]>["attempts"] = [];
  let agentRetryUsed = false;
  let agentFailed = false;
  const agentBoundDesignModuleIds = new Set<string>();
  const agentBoundActualParentSelectors = new Set<string>();
  const agentEvaluatedDesignModuleIds = new Set<string>();
  const agentBindingCountsByModule = new Map<string, number>();
  const actualParentsByModule = new Map<string, Set<string>>();
  const fallbackDecisionByDesignId = new Map<string, DynamicFallbackCandidateDecision>();
  const addActualParentToModule = (designModuleId: string, actualParentSelector?: string): void => {
    if (!actualParentSelector) return;
    const selectors = actualParentsByModule.get(designModuleId) ?? new Set<string>();
    selectors.add(actualParentSelector);
    actualParentsByModule.set(designModuleId, selectors);
  };
  const recordFallbackDecision = (decision: DynamicFallbackCandidateDecision): void => {
    const current = fallbackDecisionByDesignId.get(decision.figmaNodeId);
    if (!current || decision.geometryScore > current.geometryScore) {
      fallbackDecisionByDesignId.set(decision.figmaNodeId, decision);
    }
  };

  if (agent && unusedDesign.size > 0) {
    const actualBySelector = new Map(domElements.map((element) => [element.selector, element]));
    const siblingContextTexts = (element: ActualEvidenceElement): string[] => {
      const context = new Set<string>();
      if (element.parentSelector) {
        const parentText = actualBySelector.get(element.parentSelector)?.text?.trim();
        if (parentText && parentText !== element.text) context.add(parentText.slice(0, 160));
        for (const sibling of domElements) {
          if (sibling.parentSelector !== element.parentSelector || sibling === element) continue;
          const text = sibling.text?.trim();
          if (text && text !== element.text) context.add(text.slice(0, 80));
          if (context.size >= 6) break;
        }
      }
      return [...context];
    };
    const designCandidates = [...unusedDesign]
      .map((index) => ({ index, element: designElements[index] }))
      .sort((a, b) =>
        Number(ambiguousDesign.has(b.index)) - Number(ambiguousDesign.has(a.index)) ||
        (b.element.box.width * b.element.box.height) - (a.element.box.width * a.element.box.height)
      )
      .slice(0, 160);
    const actualCandidates = [...unusedDom]
      .map((index) => ({ index, element: domElements[index] }))
      .sort((a, b) =>
        Number(ambiguousDom.has(b.index)) - Number(ambiguousDom.has(a.index)) ||
        (b.element.box.width * b.element.box.height) - (a.element.box.width * a.element.box.height)
      )
      .slice(0, 160);
    designCandidates.forEach(({ element }) =>
      agentEvaluatedDesignModuleIds.add(designModuleScopeId(element))
    );
    const structuralRegions: NonNullable<AgentElementBindingRequest["designRegions"]> = [];
    const collectRegions = (node: DesignTruthNode, path: string[]): void => {
      const designPath = [...path, node.name];
      if (node.box && node.children.length > 0) {
        const texts: string[] = [];
        const collectTexts = (child: DesignTruthNode): void => {
          if (texts.length >= 12) return;
          if (child.text?.trim()) texts.push(child.text.trim().slice(0, 120));
          child.children.forEach(collectTexts);
        };
        collectTexts(node);
        structuralRegions.push({figmaNodeId: node.id, parentFigmaNodeId: node.parentId, designPath, box: node.box, contextTexts: texts});
      }
      node.children.forEach(child => collectRegions(child, designPath));
    };
    collectRegions(designRoot, []);
    const designRegions = structuralRegions.sort((a,b) => a.designPath.length - b.designPath.length ||
      b.box.width * b.box.height - a.box.width * a.box.height).slice(0, 200);
    const baseRequest: AgentElementBindingRequest = {
      locale,
      designRegions,
      designCandidates: designCandidates.map(({ element }) => ({
        figmaNodeId: element.id,
        ...(element.node.parentId ? { parentFigmaNodeId: element.node.parentId } : {}),
        ...(element.ancestorPath.length ? { ancestorPath: element.ancestorPath } : {}),
        name: element.name,
        type: element.type,
        ...(element.text ? { text: element.text } : {}),
        box: element.box
      })),
      actualCandidates: actualCandidates.map(({ element }) => ({
        fingerprintKey: element.fingerprint.key,
        selector: element.selector,
        ...(element.parentSelector ? { parentSelector: element.parentSelector } : {}),
        ...(siblingContextTexts(element).length
          ? { contextTexts: siblingContextTexts(element) }
          : {}),
        tag: element.tag,
        ...(element.role ? { role: element.role } : {}),
        ...(element.text ? { text: element.text } : {}),
        box: element.box
      })),
      ...(regionHints.length ? { regionHints } : {})
    };
    let accepted = 0;
    let rejected = 0;
    let attempts = 0;
    let feedback: AgentElementBindingRequest["feedback"];
    const pageSummaries: string[] = [];
    try {
      const designById = new Map(designCandidates.map(({ index, element }) => [element.id, index]));
      const actualByKey = new Map(actualCandidates.map(({ index, element }) => [element.fingerprint.key, index]));
      while (attempts < 2 && unusedDesign.size > 0) {
        attempts += 1;
        const request: AgentElementBindingRequest = {
          ...baseRequest,
          ...(feedback ? { feedback } : {})
        };
        semanticAgentInvoked = true;
        const invoke = async (): Promise<AgentElementBindingResult> => {
          const startedAt = Date.now();
          try {
            const result = await agent({ request, ...images });
            agentAttempts.push({round: attempts, durationMs: Date.now() - startedAt, code: "success"});
            return result;
          } catch (error) {
            const cause = error instanceof Error ? error.cause as {code?: unknown} | undefined : undefined;
            const causeCode = typeof cause?.code === "string" &&
              ["UND_ERR_SOCKET", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(cause.code) ? cause.code : undefined;
            const code = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? "timeout" :
              error instanceof SyntaxError ? "format_error" :
              causeCode || (error instanceof TypeError && /terminated|fetch failed/i.test(error.message)) ? "transport_error" : "generation_error";
            agentAttempts.push({round: attempts, durationMs: Date.now() - startedAt, code, ...(causeCode ? {causeCode} : {})});
            // One transport retry shared by both semantic correction rounds.
            // Timeouts, invalid output and unknown failures are not retried.
            if (code === "transport_error" && !agentRetryUsed) {
              agentRetryUsed = true;
              await new Promise(resolve => setTimeout(resolve, 250));
              return invoke();
            }
            throw new Error(code);
          }
        };
        const result = await invoke();
        semanticAgentResponded = true;
        if (result.pageSummary?.trim()) {
          pageAlignmentSummary = result.pageSummary.trim();
          pageSummaries.push(pageAlignmentSummary);
        }
        const knownDesignRegionIds = new Set(
          [...designRegions.map(region => region.figmaNodeId), ...designCandidates.flatMap(({ element }) => [
            element.id,
            ...element.ancestorIds,
            ...(element.node.parentId ? [element.node.parentId] : [])
          ])]
        );
        const knownActualParentSelectors = new Set(
          actualCandidates.flatMap(({ element }) =>
            element.parentSelector ? [element.parentSelector] : []
          )
        );
        for (const decision of result.alignmentPlan.regions) {
          if (pageAlignmentRegions.get(decision.designParentFigmaNodeId)?.source === "deterministic") {
            continue;
          }
          const actualParentSelector = decision.actualParentSelector?.trim();
          const existingDesignParents = actualParentSelector
            ? actualParentToDesignParents.get(actualParentSelector)
            : undefined;
          const existingActualParents = designParentToActualParents.get(
            decision.designParentFigmaNodeId
          );
          const displacementValid = !decision.displacement || (
            Number.isFinite(decision.displacement.x) &&
            Number.isFinite(decision.displacement.y)
          );
          const invalid =
            !knownDesignRegionIds.has(decision.designParentFigmaNodeId) ||
            !Number.isFinite(decision.confidence) ||
            decision.confidence < 0.65 ||
            !decision.reason?.trim() ||
            !displacementValid ||
            (decision.status === "matched" && (
              !actualParentSelector ||
              !knownActualParentSelectors.has(actualParentSelector) ||
              Boolean(existingDesignParents?.size && !existingDesignParents.has(decision.designParentFigmaNodeId)) ||
              Boolean(existingActualParents?.size && !existingActualParents.has(actualParentSelector))
            )) ||
            (decision.status !== "matched" && Boolean(actualParentSelector || decision.displacement)) ||
            (decision.status === "missing-in-actual" && Boolean(existingActualParents?.size));
          if (invalid) {
            rejectedRegionCount += 1;
            continue;
          }

          const confidence = Math.min(0.82, Math.max(0.7, decision.confidence));
          const anchorStats: PageAlignmentAnchorStats = {
            candidateCount: 0,
            stableCount: 0,
            dynamicExcludedCount: 0,
            structuralAnchorCount: 0,
            inlierCount: 0,
            residualPx: null
          };
          const scoreBreakdown = scorePageAlignmentConfidence({
            baseScore: confidence,
            anchorStats,
            eligibleAnchorCount: 0,
            positionTolerancePx,
            config: alignmentConfidence
          });
          const {
            actualParentSelector: _actualParentSelector,
            displacement: _agentProposedDisplacement,
            ...decisionFields
          } = decision;
          pageAlignmentRegions.set(decision.designParentFigmaNodeId, {
            ...decisionFields,
            ...(actualParentSelector ? { actualParentSelector } : {}),
            source: "agent-verified",
            confidence,
            anchorStats,
            scoreBreakdown,
            evidenceConfidence: {
              score: scoreBreakdown.finalScore,
              level: pageAlignmentConfidenceLevel(scoreBreakdown.finalScore, alignmentConfidence.levels),
              basis: ["visual-inference", "agent-hypothesis"],
              reasons: [decision.reason.trim()]
            }
          });
          const blocksDeterministicFallback =
            decision.status === "missing-in-actual" ||
            (decision.status === "uncertain" && decision.designParentFigmaNodeId !== designRoot.id);
          if (blocksDeterministicFallback) {
            blockedDesignRegionIds.add(decision.designParentFigmaNodeId);
          } else if (decision.status === "matched" && actualParentSelector) {
            actualParentToDesignParents.set(
              actualParentSelector,
              new Set([...(existingDesignParents ?? []), decision.designParentFigmaNodeId])
            );
            designParentToActualParents.set(
              decision.designParentFigmaNodeId,
              new Set([...(existingActualParents ?? []), actualParentSelector])
            );
          }
        }
        const rejectedBindings: NonNullable<AgentElementBindingRequest["feedback"]>["rejectedBindings"] = [];
        for (const proposal of result.bindings.slice(0, 60)) {
          const designIndex = designById.get(proposal.figmaNodeId);
          const domIndex = actualByKey.get(proposal.fingerprintKey);
          const design = designIndex === undefined ? undefined : designElements[designIndex];
          const actual = domIndex === undefined ? undefined : domElements[domIndex];
          const crossesRegionAnchor = Boolean(design && actual && crossesVerifiedRegion(design, actual));
          const targetsMissingRegion = Boolean(design && belongsToBlockedDesignRegion(design));
          const rejectionReason =
            designIndex === undefined || domIndex === undefined
              ? localText(locale, "候选 ID 不存在。", "Candidate ID does not exist.")
              : !unusedDesign.has(designIndex) || !unusedDom.has(domIndex)
                ? localText(locale, "候选违反一对一绑定约束。", "Candidate violates the one-to-one constraint.")
                : !Number.isFinite(proposal.confidence) || proposal.confidence < 0.65
                  ? localText(locale, "AI 置信度低于 0.65。", "AI confidence is below 0.65.")
                  : !proposal.reason?.trim()
                    ? localText(locale, "绑定缺少证据理由。", "Binding has no evidence reason.")
                    : !design || !actual || !compatibleType(design, actual)
                      ? localText(locale, "元素类型不兼容。", "Element types are incompatible.")
                      : targetsMissingRegion
                        ? localText(locale, "绑定目标位于已确认缺失的设计模块。", "The binding targets a verified missing design region.")
                      : sizeSimilarity(design.box, actual.box) < 0.4
                        ? localText(locale, "元素尺寸相似度低于 0.4。", "Element size similarity is below 0.4.")
                        : crossesRegionAnchor
                          ? localText(locale, "绑定跨越了已确认的业务模块边界。", "Binding crosses a verified business-module boundary.")
                        : undefined;
          if (rejectionReason || !design || !actual || designIndex === undefined || domIndex === undefined) {
            rejected += 1;
            rejectedBindings.push({
              figmaNodeId: proposal.figmaNodeId,
              fingerprintKey: proposal.fingerprintKey,
              reason: rejectionReason ?? localText(locale, "绑定无法验证。", "Binding could not be verified.")
            });
            continue;
          }
          unusedDesign.delete(designIndex);
          unusedDom.delete(domIndex);
          matches.push({
            design,
            actual,
            confidence: Math.min(0.82, Math.max(0.7, proposal.confidence)),
            method: "visual-inference",
            agentAssisted: true
          });
          accepted += 1;
          const designModuleId = designModuleScopeId(design);
          agentBoundDesignModuleIds.add(designModuleId);
          agentBindingCountsByModule.set(
            designModuleId,
            (agentBindingCountsByModule.get(designModuleId) ?? 0) + 1
          );
          addActualParentToModule(designModuleId, actual.parentSelector);
          if (actual.parentSelector) {
            agentBoundActualParentSelectors.add(actual.parentSelector);
          }
        }
        if (rejectedBindings.length === 0 || attempts >= 2) break;
        feedback = {
          rejectedBindings,
          instruction: localText(
            locale,
            "根据确定性复核反馈纠正绑定；只能从原候选 ID 中重新选择，不确定则省略。",
            "Correct bindings using deterministic verification feedback; choose only original candidate IDs and omit uncertain bindings."
          )
        };
      }
      diagnostics.push(localText(
        locale,
        `AI 语义绑定接受 ${accepted} 项；经过 ${attempts} 轮，确定性复核拒绝 ${rejected} 项；模块对齐提案拒绝 ${rejectedRegionCount} 项。${pageSummaries.length ? ` AI 页面判断：${pageSummaries.at(-1)}` : ""}`,
        `AI semantic binding accepted ${accepted} proposal(s); ${attempts} round(s) ran and deterministic verification rejected ${rejected}; ${rejectedRegionCount} page-alignment proposal(s) were rejected.${pageSummaries.length ? ` AI page assessment: ${pageSummaries.at(-1)}` : ""}`
      ));
    } catch (error) {
      agentFailed = true;
      diagnostics.push(localText(
        locale,
        `AI 语义绑定失败，已继续使用确定性匹配：${error instanceof Error ? error.message : String(error)}`,
        `AI semantic binding failed; deterministic matching continued: ${error instanceof Error ? error.message : String(error)}`
      ));
    }
  }

  for (const [regionId, region] of pageAlignmentRegions) {
    if (
      region.source !== "agent-verified" ||
      region.status !== "matched" ||
      !region.actualParentSelector
    ) {
      continue;
    }
    const verifiedAnchors = matches.filter((match) =>
      match.agentAssisted &&
      belongsToDesignRegion(match.design, regionId) &&
      belongsToActualRegion(match.actual, region.actualParentSelector!)
    );
    if (verifiedAnchors.length < 2) continue;
    const temporalSelection = selectTemporallyStableAnchors(
      verifiedAnchors,
      temporalEvidence
    );
    const consensus = moduleDisplacementConsensus(
      temporalSelection.anchors,
      positionTolerancePx
    );
    const anchorStats = alignmentAnchorStats(
      verifiedAnchors.length,
      temporalSelection,
      consensus
    );
    const scoreBreakdown = scorePageAlignmentConfidence({
      baseScore: region.confidence,
      anchorStats,
      eligibleAnchorCount: temporalSelection.anchors.length,
      positionTolerancePx,
      config: alignmentConfidence
    });
    const evidenceScore = scoreBreakdown.finalScore;
    const temporalSummary = temporalSelection.applied
      ? temporalAnchorSelectionSummary(temporalSelection, locale, "verification")
      : "";
    if (!consensus.displacement) {
      const { displacement: _displacement, ...regionWithoutDisplacement } = region;
      pageAlignmentRegions.set(regionId, {
        ...regionWithoutDisplacement,
        anchorStats,
        scoreBreakdown,
        reason: localText(
          locale,
          `${region.reason} ${temporalSummary} 已验证元素锚点位移无多数共识，已移除模型推断的整体位移。`,
          `${region.reason} ${temporalSummary} Verified element anchor offsets have no majority consensus, so the model-inferred whole-module displacement was removed.`
        ),
        evidenceConfidence: {
          ...region.evidenceConfidence,
          score: evidenceScore,
          level: pageAlignmentConfidenceLevel(evidenceScore, alignmentConfidence.levels),
          basis: [...new Set([
            ...region.evidenceConfidence.basis,
            "geometric-alignment" as const,
            ...(temporalSelection.applied ? ["temporal-consistency" as const] : [])
          ])],
          reasons: [
            ...region.evidenceConfidence.reasons,
            localText(
              locale,
              "已验证元素的几何证据不足以确认整体位移。",
              "Verified element geometry is insufficient to confirm a whole-module displacement."
            ),
            alignmentStatsReason(anchorStats, locale)
          ]
        }
      });
      continue;
    }
    pageAlignmentRegions.set(regionId, {
      ...region,
      displacement: consensus.displacement,
      anchorStats,
      scoreBreakdown,
      reason: localText(
        locale,
        `${region.reason} ${temporalSummary} 已使用 ${consensus.inlierCount}/${temporalSelection.anchors.length} 个合格锚点重新计算整体位移。`,
        `${region.reason} ${temporalSummary} The whole-module displacement was recomputed from ${consensus.inlierCount}/${temporalSelection.anchors.length} eligible anchors.`
      ),
      evidenceConfidence: {
        ...region.evidenceConfidence,
        score: evidenceScore,
        level: pageAlignmentConfidenceLevel(evidenceScore, alignmentConfidence.levels),
        basis: [...new Set([
          ...region.evidenceConfidence.basis,
          "geometric-alignment" as const,
          ...(temporalSelection.applied ? ["temporal-consistency" as const] : [])
        ])],
        reasons: [
          ...region.evidenceConfidence.reasons,
          localText(
            locale,
            `${consensus.inlierCount}/${temporalSelection.anchors.length} 个合格元素锚点支持重新计算后的模块位移。`,
            `${consensus.inlierCount}/${temporalSelection.anchors.length} eligible element anchors support the recomputed module displacement.`
          ),
          alignmentStatsReason(anchorStats, locale)
        ]
      }
    });
  }

  // Date values identify a slot type, not an element identity. Pair horizontal
  // slots only inside an already bound container; never search the whole page.
  const dateOption = (text: string | undefined): boolean => /^\s*\d{1,2}\s*月\s*\d{1,2}\s*日\s*$/.test(text ?? "");
  const dateParents = new Set([...unusedDesign]
    .filter(index => dateOption(designElements[index].text))
    .flatMap(index => designElements[index].ancestorIds).filter(id => id !== designRoot.id));
  const actualBySelector = new Map(domElements.map(node => [node.selector, node]));
  const insideActualContainer = (node: ActualEvidenceElement, container: string): boolean => {
    const visited = new Set<string>();
    let parent = node.parentSelector;
    while (parent && !visited.has(parent)) {
      if (parent === container) return true;
      visited.add(parent);
      parent = actualBySelector.get(parent)?.parentSelector;
    }
    return false;
  };
  for (const parentId of dateParents) {
    if (!parentId || blockedDesignRegionIds.has(parentId)) continue;
    const containers = new Set([
      ...matches.filter(match => match.design.id === parentId).map(match => match.actual.selector),
      ...[...pageAlignmentRegions.values()].filter(region => region.designParentFigmaNodeId === parentId &&
        region.status === "matched" && region.evidenceConfidence.score >= alignmentConfidence.levels.mediumMin)
        .flatMap(region => region.actualParentSelector ? [region.actualParentSelector] : [])
    ]);
    if (containers.size !== 1) continue;
    const container = [...containers][0];
    const left = designElements.map((node, index) => ({ node, index }))
      .filter(({node}) => node.ancestorIds.includes(parentId) && dateOption(node.text))
      .sort((a,b) => a.node.box.x - b.node.box.x);
    const right = domElements.map((node,index) => ({node,index}))
      .filter(({node}) => insideActualContainer(node, container) && dateOption(node.text))
      .sort((a,b) => a.node.box.x - b.node.box.x);
    const horizontal = (nodes: Array<{node: {box: Box}}>) => nodes.every(({node}, index) =>
      Math.abs(node.box.y - nodes[0].node.box.y) <= positionTolerancePx &&
      (index === 0 || node.box.x >= nodes[index-1].node.box.x + nodes[index-1].node.box.width - positionTolerancePx));
    if (left.some(({node}) => belongsToBlockedDesignRegion(node)) ||
      left.length < 2 || left.length !== right.length || !horizontal(left) || !horizontal(right)) continue;
    // Existing bindings must agree with the slot ordering before filling gaps.
    if (left.some(({node}, i) => matches.some(match =>
      (match.design.id === node.id || match.actual.fingerprint.key === right[i].node.fingerprint.key) &&
      !(match.design.id === node.id && match.actual.fingerprint.key === right[i].node.fingerprint.key)))) continue;
    left.forEach(({index}, i) => {
      if (unusedDesign.has(index) && unusedDom.has(right[i].index)) accept(index, right[i].index, 0.9, "verified-template");
      const designWrapperIndex = designElements.findIndex(node => node.id === left[i].node.node.parentId && node.node.parentId === parentId);
      const actualWrapperIndex = domElements.findIndex(node => node.selector === right[i].node.parentSelector && node.parentSelector === container);
      if (designWrapperIndex < 0 || actualWrapperIndex < 0) return;
      const wrapper = designElements[designWrapperIndex];
      // Only a single-slot wrapper can inherit the verified slot identity.
      if (left.filter(entry => entry.node.ancestorIds.includes(wrapper.id)).length !== 1 ||
        right.filter(entry => insideActualContainer(entry.node, domElements[actualWrapperIndex].selector)).length !== 1) return;
      if (unusedDesign.has(designWrapperIndex) && unusedDom.has(actualWrapperIndex)) {
        accept(designWrapperIndex, actualWrapperIndex, 0.9, "verified-template");
      }
    });
  }

  // Typed cells inherit a column role from a separately verified static header.
  // Reciprocal slot uniqueness and stable samples are mandatory; geometry alone
  // never upgrades an arbitrary unresolved field to a verified binding.
  const stableCell = (element: ActualEvidenceElement) => (temporalEvidence.samples?.length ?? 0) >= 3 && temporalEvidence.samples!.every(sample => {
    const observed = sample.elements.filter(item => item.fingerprint.key === element.fingerprint.key);
    return observed.length === 1 && JSON.stringify(observed[0].box) === JSON.stringify(element.box) && JSON.stringify(observed[0].style) === JSON.stringify(element.style);
  });
  const headers = matches.filter(match => ["exact-id", "stable-text"].includes(match.method) &&
    /概率|利率区间|最新价|涨跌幅|probability|rate.?range|price/i.test(match.design.text ?? "") && normalizeText(match.design.text) === normalizeText(match.actual.text));
  for (const header of headers) {
    const region = verifiedRegions.find(region => header.design.ancestorIds.includes(region.designParentFigmaNodeId));
    if (!region?.actualParentSelector || !stableCell(header.actual)) continue;
    const left = [...unusedDesign].filter(index => {
      const node = designElements[index];
      return node.ancestorIds.includes(region.designParentFigmaNodeId) && node.box.y > header.design.box.y &&
        node.box.x + node.box.width / 2 >= header.design.box.x - positionTolerancePx &&
        node.box.x + node.box.width / 2 <= header.design.box.x + header.design.box.width + positionTolerancePx &&
        isPotentialDynamicTextPair({ designName: header.design.text!, designText: node.text, actualText: node.text });
    });
    const right = [...unusedDom].filter(index => belongsToActualRegion(domElements[index], region.actualParentSelector!) && stableCell(domElements[index]));
    const candidates = left.flatMap(designIndex => right.flatMap(domIndex => {
      const design = designElements[designIndex], actual = domElements[domIndex];
      if (!isPotentialDynamicTextPair({ designName: header.design.text!, designText: design.text, actualText: actual.text }) || crossesVerifiedRegion(design, actual)) return [];
      const dy = Math.abs((design.box.y - header.design.box.y) - (actual.box.y - header.actual.box.y));
      const dx = Math.abs((design.box.x - header.design.box.x) - (actual.box.x - header.actual.box.x));
      if (dy > Math.max(positionTolerancePx, design.box.height / 2) || dx > Math.max(positionTolerancePx, design.box.width / 2)) return [];
      return [{ designIndex, domIndex, distance: Math.hypot(dx, dy) }];
    }));
    for (const candidate of candidates) {
      if (!unusedDesign.has(candidate.designIndex) || !unusedDom.has(candidate.domIndex)) continue;
      if (candidates.some(other => other !== candidate && (other.designIndex === candidate.designIndex || other.domIndex === candidate.domIndex) && other.distance <= candidate.distance + positionTolerancePx)) continue;
      accept(candidate.designIndex, candidate.domIndex, 0.9, "verified-template");
    }
  }

  const geometryCandidates: Array<{
    designIndex: number;
    domIndex: number;
    score: number;
    fallbackDecision?: DynamicFallbackCandidateDecision;
  }> = [];
  for (const designIndex of unusedDesign) {
    if (ambiguousDesign.has(designIndex)) continue;
    const design = designElements[designIndex];
    if (belongsToBlockedDesignRegion(design)) continue;
    for (const domIndex of unusedDom) {
      if (ambiguousDom.has(domIndex)) continue;
      const actual = domElements[domIndex];
      const distanceScore = 1 - Math.min(1, centerDistance(design.box, actual.box) / diagonal);
      const score = distanceScore * 0.48 + sizeSimilarity(design.box, actual.box) * 0.22 +
        (compatibleType(design, actual) ? 0.08 : 0);
      const visibleTextConflict = hasConflictingVisibleText(design, actual, false);
      const designModuleId = designModuleScopeId(design);
      const crossesRegionBoundary = crossesVerifiedRegion(design, actual);
      if (crossesRegionBoundary) {
        if (visibleTextConflict) {
          recordFallbackDecision({
            designModuleId,
            figmaNodeId: design.id,
            selector: actual.selector,
            ...(actual.parentSelector ? { actualParentSelector: actual.parentSelector } : {}),
            result: "rejected",
            reasonCode: "verified_module_boundary",
            matched: false,
            geometryScore: score
          });
        }
        continue;
      }
      const agentProducedValidBindingInModule = Boolean(
        agentBoundDesignModuleIds.has(designModuleId) ||
        (actual.parentSelector && agentBoundActualParentSelectors.has(actual.parentSelector))
      );
      let fallbackDecision: DynamicFallbackCandidateDecision | undefined;
      if (visibleTextConflict) {
        const hasDynamicSemantics = isPotentialDynamicTextPair({
          designName: design.name,
          designContextTexts: design.ancestorPath,
          designText: design.text,
          actualText: actual.text
        });
        const temporalRejection = temporalDynamicFallbackRejection(actual, temporalEvidence);
        let result: DynamicFallbackDecision["result"] = "rejected";
        let reasonCode: DynamicFallbackReasonCode;
        if (dateOption(design.text)) {
          reasonCode = "date_selector_unverified";
        } else if (agentProducedValidBindingInModule) {
          reasonCode = "module_has_valid_agent_binding";
        } else if (!hasDynamicSemantics) {
          reasonCode = "design_semantics_not_dynamic";
        } else if (!semanticAgentResponded) {
          result = "accepted";
          reasonCode = "agent_unavailable_dynamic_semantics";
        } else if (temporalRejection) {
          reasonCode = temporalRejection;
        } else if (score < minConfidence) {
          reasonCode = "geometry_confidence_below_threshold";
        } else {
          result = "accepted";
          reasonCode = "temporal_dynamic_verified";
        }
        fallbackDecision = {
          designModuleId,
          figmaNodeId: design.id,
          selector: actual.selector,
          ...(actual.parentSelector ? { actualParentSelector: actual.parentSelector } : {}),
          result,
          reasonCode,
          matched: false,
          geometryScore: score
        };
        recordFallbackDecision(fallbackDecision);
        if (result === "rejected") continue;
      }
      if (score >= minConfidence) {
        geometryCandidates.push({
          designIndex,
          domIndex,
          score,
          ...(fallbackDecision ? { fallbackDecision } : {})
        });
      }
    }
  }
  geometryCandidates.sort((a, b) => b.score - a.score);
  for (const candidate of geometryCandidates) {
    if (!unusedDesign.has(candidate.designIndex) || !unusedDom.has(candidate.domIndex)) continue;
    accept(candidate.designIndex, candidate.domIndex, candidate.score, "structure-geometry");
    if (candidate.fallbackDecision) {
      candidate.fallbackDecision.matched = true;
      fallbackDecisionByDesignId.set(
        candidate.fallbackDecision.figmaNodeId,
        candidate.fallbackDecision
      );
    }
  }
  for (const decision of fallbackDecisionByDesignId.values()) {
    if (decision.result !== "accepted") continue;
    if (!decision.matched) {
      decision.result = "rejected";
      decision.reasonCode = "one_to_one_conflict";
    }
  }

  const designNodesById = new Map<string, DesignTruthNode>();
  const collectDesignNodes = (node: DesignTruthNode): void => {
    designNodesById.set(node.id, node);
    node.children.forEach(collectDesignNodes);
  };
  collectDesignNodes(designRoot);

  // Preserve the largest explicitly proposed missing region, not every nested
  // layer of the same card. Never promote a small missing label to its parent.
  for (const [regionId, region] of pageAlignmentRegions) {
    if (region.status !== "missing-in-actual") continue;
    let parentId = designNodesById.get(regionId)?.parentId;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      if (pageAlignmentRegions.get(parentId)?.status === "missing-in-actual") {
        pageAlignmentRegions.delete(regionId);
        diagnostics.push(localText(locale,
          `缺失候选 ${regionId} 已合并到同一缺失模块 ${parentId}。`,
          `Missing candidate ${regionId} was merged into missing ancestor module ${parentId}.`));
        break;
      }
      parentId = designNodesById.get(parentId)?.parentId;
    }
  }

  for (const missingRegion of pageAlignmentRegions.values()) {
    if (missingRegion.status !== "missing-in-actual") continue;
    const missingNode = designNodesById.get(missingRegion.designParentFigmaNodeId);
    if (!missingNode?.box || !missingNode.parentId) continue;
    const parentId = missingNode.parentId;
    for (const side of ["preceding", "following"] as const) {
    const isOnSide = (box: Box): boolean => side === "following"
      ? box.y >= missingNode.box!.y + missingNode.box!.height - positionTolerancePx
      : box.y + box.height <= missingNode.box!.y + positionTolerancePx;
    const hasSideDisplacement = [...pageAlignmentRegions.values()].some((region) => {
      const node = designNodesById.get(region.designParentFigmaNodeId);
      return region.status === "matched" &&
        Boolean(region.displacement) &&
        region.evidenceConfidence.score >= alignmentConfidence.levels.mediumMin &&
        node?.parentId === parentId &&
        Boolean(node.box && isOnSide(node.box));
    });
    if (hasSideDisplacement) continue;

    const siblingGroups = new Map<string, {
      designPath: string[];
      matches: ElementMatch[];
      node: DesignTruthNode;
    }>();
    for (const match of matches) {
      if (match.method === "structure-geometry") continue;
      const parentIndex = match.design.ancestorIds.indexOf(parentId);
      const regionId = parentIndex >= 0
        ? match.design.ancestorIds[parentIndex + 1] ?? (
            match.design.node.parentId === parentId ? match.design.id : undefined
          )
        : undefined;
      if (!regionId || regionId === missingNode.id) continue;
      const regionNode = designNodesById.get(regionId);
      if (
        !regionNode?.box ||
        regionNode.parentId !== parentId ||
        !isOnSide(regionNode.box)
      ) {
        continue;
      }
      const existingRegion = pageAlignmentRegions.get(regionId);
      if (existingRegion && existingRegion.status !== "matched") continue;
      const entry = siblingGroups.get(regionId) ?? {
        designPath: match.design.ancestorPath.slice(0, parentIndex + 2),
        matches: [],
        node: regionNode
      };
      entry.matches.push(match);
      siblingGroups.set(regionId, entry);
    }

    const orderedGroups = [...siblingGroups.entries()].sort(([, left], [, right]) =>
      side === "following" ? left.node.box!.y - right.node.box!.y
        : (right.node.box!.y + right.node.box!.height) - (left.node.box!.y + left.node.box!.height)
    );
    for (const [regionId, candidate] of orderedGroups) {
      const temporalSelection = selectTemporallyStableAnchors(
        candidate.matches,
        temporalEvidence
      );
      if (
        !temporalSelection.applied ||
        temporalSelection.anchors.length < 2 ||
        temporalSelection.structuralAnchorCount < 2
      ) {
        continue;
      }
      const consensus = moduleDisplacementConsensus(
        temporalSelection.anchors,
        positionTolerancePx
      );
      if (!consensus.displacement) continue;
      const anchorStats = alignmentAnchorStats(
        candidate.matches.length,
        temporalSelection,
        consensus
      );
      const baseConfidence = Math.min(...temporalSelection.anchors.map((match) =>
        match.method === "exact-id" ? 1 : Math.min(0.99, match.confidence)
      ));
      const scoreBreakdown = scorePageAlignmentConfidence({
        baseScore: baseConfidence,
        anchorStats,
        eligibleAnchorCount: temporalSelection.anchors.length,
        positionTolerancePx,
        config: alignmentConfidence
      });
      if (scoreBreakdown.finalScore < alignmentConfidence.levels.mediumMin) continue;
      const actualParents = new Set(
        temporalSelection.anchors
          .map((match) => match.actual.parentSelector)
          .filter((selector): selector is string => Boolean(selector))
      );
      const existingRegion = pageAlignmentRegions.get(regionId);
      pageAlignmentRegions.set(regionId, {
        designParentFigmaNodeId: regionId,
        designPath: candidate.designPath,
        status: "matched",
        alignmentRole: side === "following" ? "missing-module-following-fallback" : "missing-module-preceding-fallback",
        ...(actualParents.size === 1
          ? { actualParentSelector: [...actualParents][0] }
          : existingRegion?.actualParentSelector
            ? { actualParentSelector: existingRegion.actualParentSelector }
            : {}),
        displacement: consensus.displacement,
        confidence: baseConfidence,
        reason: localText(
          locale,
          `${temporalSelection.anchors.length} 个跨帧稳定的${side === "following" ? "后置" : "前置"}结构锚点，为缺失模块补充了位移证据。`,
          `${temporalSelection.anchors.length} temporally stable ${side} structural anchors provide displacement evidence for a missing module.`
        ),
        source: temporalSelection.anchors.some((match) => match.agentAssisted)
          ? "agent-verified"
          : "deterministic",
        anchorStats,
        scoreBreakdown,
        evidenceConfidence: {
          score: scoreBreakdown.finalScore,
          level: pageAlignmentConfidenceLevel(
            scoreBreakdown.finalScore,
            alignmentConfidence.levels
          ),
          basis: [...new Set([
            ...temporalSelection.anchors.map((match) => match.method),
            "structure-geometry" as const,
            "temporal-consistency" as const
          ])],
          reasons: [
            localText(
              locale,
              `${consensus.inlierCount}/${temporalSelection.anchors.length} 个时序稳定结构锚点形成${side === "following" ? "后置" : "前置"}位移共识。`,
              `${consensus.inlierCount}/${temporalSelection.anchors.length} temporally stable structural anchors form the ${side} displacement consensus.`
            ),
            alignmentStatsReason(anchorStats, locale)
          ]
        }
      });
      diagnostics.push(localText(
        locale,
        `已为缺失模块 ${missingNode.id} 使用${side === "following" ? "后置" : "前置"}稳定结构区域 ${regionId} 补充对齐锚点。`,
        `Added ${side} stable structural region ${regionId} as an alignment fallback for missing module ${missingNode.id}.`
      ));
      break;
    }
    }
  }

  const fallbackDecisionsByModule = new Map<string, DynamicFallbackDecision[]>();
  for (const decision of fallbackDecisionByDesignId.values()) {
    const decisions = fallbackDecisionsByModule.get(decision.designModuleId) ?? [];
    const {
      designModuleId: _designModuleId,
      geometryScore: _geometryScore,
      ...publicDecision
    } = decision;
    decisions.push(publicDecision);
    addActualParentToModule(decision.designModuleId, decision.actualParentSelector);
    fallbackDecisionsByModule.set(decision.designModuleId, decisions);
  }
  const semanticModuleIds = new Set([
    ...agentEvaluatedDesignModuleIds,
    ...agentBindingCountsByModule.keys(),
    ...fallbackDecisionsByModule.keys()
  ]);
  const semanticAgent: SemanticAgentMatchingEvidence = {
    invoked: semanticAgentInvoked,
    responded: semanticAgentResponded,
    ...((agentFailed || agentRetryUsed) ? {execution: {
      status: agentFailed ? "failed" as const : "recovered" as const,
      attempts: agentAttempts
    }} : {}),
    acceptedBindingCount: [...agentBindingCountsByModule.values()]
      .reduce((sum, count) => sum + count, 0),
    modules: [...semanticModuleIds]
      .sort((left, right) => left.localeCompare(right))
      .map((designModuleId) => {
        const decisions = (fallbackDecisionsByModule.get(designModuleId) ?? [])
          .sort((left, right) =>
            left.figmaNodeId.localeCompare(right.figmaNodeId) ||
            left.selector.localeCompare(right.selector)
          );
        return {
          designModuleId,
          acceptedBindingCount: agentBindingCountsByModule.get(designModuleId) ?? 0,
          actualParentSelectors: [...(actualParentsByModule.get(designModuleId) ?? [])]
            .sort((left, right) => left.localeCompare(right)),
          dynamicFallback: {
            evaluatedCount: decisions.length,
            acceptedCount: decisions.filter((decision) => decision.result === "accepted").length,
            rejectedCount: decisions.filter((decision) => decision.result === "rejected").length,
            decisions
          }
        };
      })
  };

  return {
    matches,
    unmatchedDesign: [...unusedDesign].map((index) => designElements[index]),
    unmatchedDom: [...unusedDom].map((index) => domElements[index]),
    diagnostics,
    pageAlignment: {
      summary: pageAlignmentSummary,
      regions: [...pageAlignmentRegions.values()],
      rejectedRegionCount
    },
    semanticAgent
  };
}

interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value?: string): Rgb | undefined {
  if (!value || value === "transparent") return undefined;
  const rgb = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: Number(rgb[4] ?? 1) };
  }
  const hex = value.match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i)?.[1];
  if (!hex) return undefined;
  const expanded = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
    a: expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1
  };
}

function rgbToLab(color: Rgb): [number, number, number] {
  const convert = (value: number) => {
    const normalized = value / 255;
    return normalized > 0.04045
      ? ((normalized + 0.055) / 1.055) ** 2.4
      : normalized / 12.92;
  };
  const r = convert(color.r);
  const g = convert(color.g);
  const b = convert(color.b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const pivot = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const fx = pivot(x);
  const fy = pivot(y);
  const fz = pivot(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function colorDeltaE(expected?: string, actual?: string): number | undefined {
  const a = parseColor(expected);
  const b = parseColor(actual);
  if (!a || !b) return undefined;
  const labA = rgbToLab(a);
  const labB = rgbToLab(b);
  const color = Math.hypot(labA[0] - labB[0], labA[1] - labB[1], labA[2] - labB[2]);
  return Math.hypot(color, Math.abs(a.a - b.a) * 100);
}

async function compareVisual(
  reference: Buffer,
  actual: Buffer,
  width: number,
  height: number,
  threshold: number,
  reviewedBoxes: Box[],
  normalizedBoxPairs: Array<{ designBox: Box; actualBox: Box }> = [],
  scopeRegions = false
): Promise<VisualComparison> {
  const referenceRaw = await sharp(reference)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const actualRaw = await sharp(actual)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const clearBox = (data: Buffer, box: Box): void => {
    const startX = Math.max(0, Math.floor(box.x));
    const startY = Math.max(0, Math.floor(box.y));
    const endX = Math.min(width, Math.ceil(box.x + box.width));
    const endY = Math.min(height, Math.ceil(box.y + box.height));
    for (let y = startY; y < endY; y += 1) {
      data.fill(0, (y * width + startX) * 4, (y * width + endX) * 4);
    }
  };
  for (const pair of normalizedBoxPairs) {
    clearBox(referenceRaw.data, pair.designBox);
    clearBox(actualRaw.data, pair.actualBox);
  }
  const diffData = Buffer.alloc(width * height * 4);
  pixelmatch(
    referenceRaw.data,
    actualRaw.data,
    diffData,
    width,
    height,
    { threshold, includeAA: false, diffMask: true }
  );
  const diff = await sharp(diffData, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const reviewedMask = new Uint8Array(width * height);
  const fillMask = (box: Box, value: 0 | 1 | 2): void => {
    const startX = Math.max(0, Math.floor(box.x));
    const startY = Math.max(0, Math.floor(box.y));
    const endX = Math.min(width, Math.ceil(box.x + box.width));
    const endY = Math.min(height, Math.ceil(box.y + box.height));
    for (let y = startY; y < endY; y += 1) {
      reviewedMask.fill(value, y * width + startX, y * width + endX);
    }
  };
  for (const box of reviewedBoxes) fillMask(box, 1);
  for (const pair of normalizedBoxPairs) {
    fillMask(pair.designBox, 2);
    fillMask(pair.actualBox, 2);
  }
  let reviewedPixels = 0;
  let reviewedChangedPixels = 0;
  for (let index = 0; index < reviewedMask.length; index += 1) {
    if (reviewedMask[index] !== 1) continue;
    reviewedPixels += 1;
    if (diffData[index * 4 + 3] !== 0) reviewedChangedPixels += 1;
  }

  const cellSize = Math.max(24, Math.min(64, Math.round(Math.min(width, height) / 14)));
  const changedCells = new Map<string, number>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (diffData[(y * width + x) * 4 + 3] === 0 || (scopeRegions && reviewedMask[y * width + x] !== 1)) continue;
      const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`;
      changedCells.set(key, (changedCells.get(key) ?? 0) + 1);
    }
  }

  const visited = new Set<string>();
  const regions: VisualComparison["regions"] = [];
  for (const key of changedCells.keys()) {
    if (visited.has(key)) continue;
    const queue = [key];
    visited.add(key);
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    while (queue.length) {
      const current = queue.shift()!;
      const [cellX, cellY] = current.split(",").map(Number);
      minX = Math.min(minX, cellX * cellSize);
      minY = Math.min(minY, cellY * cellSize);
      maxX = Math.max(maxX, (cellX + 1) * cellSize);
      maxY = Math.max(maxY, (cellY + 1) * cellSize);
      count += changedCells.get(current) ?? 0;
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          if (!dx && !dy) continue;
          const next = `${cellX + dx},${cellY + dy}`;
          if (changedCells.has(next) && !visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
    }
    const regionWidth = Math.min(width, maxX) - minX;
    const regionHeight = Math.min(height, maxY) - minY;
    if (count >= 18) {
      regions.push({
        x: minX,
        y: minY,
        width: regionWidth,
        height: regionHeight,
        changedPixels: count,
        density: count / Math.max(1, regionWidth * regionHeight)
      });
    }
  }

  return {
    diff,
    scope: { reviewedPixels, changedPixels: reviewedChangedPixels, excludedPixels: reviewedMask.reduce((sum, item) => sum + (item === 2 ? 1 : 0), 0), canvasPixels: width * height },
    similarity: reviewedPixels > 0 ? 1 - reviewedChangedPixels / reviewedPixels : 1,
    regions: regions.sort((a, b) => b.changedPixels - a.changedPixels).slice(0, 8)
  };
}

function addIssueFactory() {
  let counter = 0;
  return (issue: Omit<Issue, "id">): Issue => ({
    ...issue,
    id: `issue-${String(++counter).padStart(3, "0")}`
  });
}

function confidenceSeverity(
  severity: Severity | null,
  confidence: number,
  highConfidence: number
): Severity | null {
  if (!severity) return null;
  if (severity === "info") return severity;
  return confidence < highConfidence ? "pending" : severity;
}

function evidenceConfidenceForMatch(
  match: ElementMatch,
  config: AcceptanceConfig,
  locale: Locale,
  alignment?: HybridAlignment
): EvidenceConfidence {
  const baseScore = match.method === "exact-id" ? 0.99 : match.confidence;
  const score = alignment
    ? Math.min(baseScore, alignment.evidenceConfidence.score)
    : baseScore;
  const baseBasis: EvidenceConfidence["basis"] =
    match.method === "exact-id"
      ? ["exact-id"]
      : match.method === "stable-text"
        ? ["stable-text", "structure-geometry"]
        : match.method === "visual-inference"
          ? match.agentAssisted
            ? ["visual-inference", "agent-hypothesis"]
            : ["visual-inference"]
          : match.method === "verified-region" || match.method === "verified-template" ? [match.method, "temporal-consistency", "structure-geometry"] : ["structure-geometry"];
  return {
    score,
    level:
      score >= config.thresholds.highConfidenceMin
        ? "high"
        : score >= config.thresholds.matchConfidenceMin
          ? "medium"
          : "low",
    basis: alignment ? [...baseBasis, "geometric-alignment"] : baseBasis,
    reasons: [
      match.method === "exact-id"
        ? localText(locale, "data-figma-id 与 Figma node id 完全一致。", "data-figma-id exactly matches the Figma node id.")
        : match.method === "stable-text"
          ? localText(locale, "稳定文本一致，并由几何与元素类型佐证。", "Stable text matches, supported by geometry and element type.")
          : match.method === "visual-inference"
            ? match.agentAssisted
              ? localText(locale, "AI 基于双图与元素语义提出绑定，并通过元素身份、类型、尺寸和一对一约束复核；置信度受 AI 证据上限约束。", "AI proposed the binding from both images and element semantics; identity, type, size, and one-to-one constraints verified it, with an AI evidence confidence cap.")
              : localText(locale, "OCR/视觉锚点文字与 Figma 一致；结论受纯图像证据上限约束。", "OCR/visual-anchor text matches Figma; confidence is capped for image-only evidence.")
            : match.method === "verified-region" ? localText(locale, "多个独立稳定子元素验证区域身份。", "Independent stable descendants verify region identity.")
            : match.method === "verified-template" ? localText(locale, "可信容器内按字段类型、顺序与一对一槽位约束验证。", "Field type, order and one-to-one slots are verified within a trusted container.")
            : localText(locale, "元素结构、类型和几何特征形成候选匹配。", "Element structure, type, and geometry support the candidate match."),
      ...(alignment ? alignment.evidenceConfidence.reasons : [])
    ]
  };
}

function deterministicEvidenceConfidence(
  basis: "pixel-measurement" | "dom-audit",
  locale: Locale
): EvidenceConfidence {
  return {
    score: 0.99,
    level: "high",
    basis: [basis],
    reasons: [
      basis === "pixel-measurement"
        ? localText(
            locale,
            "由固定视口下可复现的像素测量直接得出。",
            "Derived directly from a reproducible pixel measurement at a fixed viewport."
          )
        : localText(
            locale,
            "由浏览器 DOM 与布局属性的确定性审计直接得出。",
            "Derived directly from a deterministic browser DOM and layout audit."
          )
    ]
  };
}

function issueForAudit(
  audit: StaticAudit,
  config: AcceptanceConfig,
  create: ReturnType<typeof addIssueFactory>,
  locale: Locale
): Issue | undefined {
  const severity = severityFor(config, audit.rule);
  if (!severity) return undefined;
  const suggestions: Record<StaticAudit["rule"], string> = {
    broken_image: localText(locale, "检查资源地址、构建产物路径和跨域访问策略。", "Check the asset URL, build output paths, and cross-origin access policy."),
    horizontal_overflow: localText(locale, "定位超出视口的元素，修正固定宽度、负边距或未换行内容。", "Find elements extending beyond the viewport and fix fixed widths, negative margins, or unwrapped content."),
    clipped_text: localText(locale, "检查容器尺寸、line-height、overflow 和文本换行规则。", "Check container dimensions, line-height, overflow, and text wrapping rules.")
  };
  return create({
    category: localText(locale, "静态规则", "Static audit"),
    severity,
    title: audit.rule === "broken_image"
      ? localText(locale, "图片加载失败", "Image failed to load")
      : audit.rule === "horizontal_overflow"
        ? localText(locale, "页面横向溢出", "Horizontal page overflow")
        : localText(locale, "文本可能被截断", "Text may be clipped"),
    summary: audit.summary,
    suggestion: suggestions[audit.rule],
    evidenceConfidence: deterministicEvidenceConfidence("dom-audit", locale),
    selector: audit.selector,
    box: audit.box,
    rule: audit.rule
  });
}

export async function compareDesignToPage(
  design: DesignTruth,
  evidence: ActualEvidence,
  config: AcceptanceConfig,
  locale: Locale,
  options: CompareOptions = {}
): Promise<ComparisonResult> {
  const capture = evidence.samples[evidence.canonicalSampleIndex];
  if (!capture) {
    throw new Error(
      localText(locale, "ActualEvidence 缺少 canonical sample。", "ActualEvidence has no canonical sample.")
    );
  }
  const width = Math.round(design.render.viewport.width);
  const height = Math.round(design.render.viewport.height);
  const referenceImage = await sharp(design.render.image).resize(width, height, { fit: "fill" }).png().toBuffer();
  const actualImage = await sharp(capture.image).resize(width, height, { fit: "fill" }).png().toBuffer();
  const regionCorrespondence = identifyReviewRegions(design.root, evidence, config);
  const designElements = comparableDesignElements({ ...design, root: regionCorrespondence.tree });
  const matching = await elementMatches(
    regionCorrespondence.tree,
    designElements,
    capture.elements,
    design.render.viewport,
    config.thresholds.matchConfidenceMin,
    config.pageAlignment.confidence,
    config.thresholds.positionTolerancePx,
    {
      sampleCount: evidence.samples.length,
      changes: evidence.elementChanges, samples: evidence.samples
    },
    locale,
    { referenceImage, actualImage },
    options.elementBindingAgent,
    regionCorrespondence.regions
  );
  const marketListAnalysis = analyzeMarketLists(design, capture.elements, locale,
    matching.matches.filter(match => match.method !== "structure-geometry" && match.confidence >= config.thresholds.highConfidenceMin)
      .map(match => ({design: match.design.node, actual: match.actual})));
  const verifiedTemplateBindings = [...marketListAnalysis.templateBindings, ...marketListAnalysis.summary.matches.flatMap(list => {
    const row = designElements.find(node => node.id === list.rowTemplate.figmaNodeId);
    return row ? list.rowSelectors.flatMap(selector => {
      const actual = capture.elements.find(item => item.selector === selector); return actual ? [{ design: row.node, actual }] : [];
    }) : [];
  })];
  for (const match of matching.matches) {
    if (verifiedTemplateBindings.some(binding => binding.design.id === match.design.id && binding.actual.selector === match.actual.selector)) {
      match.templateStyleOnly = true; match.method = "verified-template"; match.confidence = Math.max(0.9, match.confidence);
    }
  }
  const actualElementsBySelector = new Map(
    capture.elements.map((element) => [element.selector, element])
  );
  const actualAncestorSelectors = (element: ActualEvidenceElement): string[] => {
    const selectors: string[] = [];
    const seen = new Set<string>();
    let parentSelector = element.parentSelector;
    while (parentSelector && !seen.has(parentSelector) && selectors.length < 20) {
      selectors.push(parentSelector);
      seen.add(parentSelector);
      parentSelector = actualElementsBySelector.get(parentSelector)?.parentSelector;
    }
    return selectors;
  };
  const regionNodes = new Map<string, DesignTruthNode>();
  const indexRegion = (node: DesignTruthNode) => { regionNodes.set(node.id, node); node.children.forEach(indexRegion); };
  indexRegion(regionCorrespondence.tree);
  const subtreeIds = (node: DesignTruthNode): string[] => [node.id, ...node.children.flatMap(subtreeIds)];
  const displacementRegions = matching.pageAlignment.regions.filter(region => region.status === "matched" && region.actualParentSelector && region.displacement &&
    region.evidenceConfidence.score >= config.pageAlignment.confidence.levels.highMin && region.anchorStats.stableCount >= 2 && region.anchorStats.inlierCount >= 2 &&
    regionNodes.has(region.designParentFigmaNodeId) && capture.elements.some(element => element.selector === region.actualParentSelector));
  const localRegions = displacementRegions.filter(region => !displacementRegions.some(parent => parent !== region &&
    subtreeIds(regionNodes.get(parent.designParentFigmaNodeId)!).slice(1).includes(region.designParentFigmaNodeId)));
  const localRegionFor = (match: ElementMatch) => localRegions.find(region =>
    subtreeIds(regionNodes.get(region.designParentFigmaNodeId)!).includes(match.design.id) &&
    (match.actual.selector === region.actualParentSelector || actualAncestorSelectors(match.actual).includes(region.actualParentSelector!)));
  const directBindings = matching.matches.map((match) => ({
    design: match.design.node,
    actual: match.actual,
    matchMethod: match.method
  }));
  const listTemplateBindings = verifiedTemplateBindings
    .filter((binding) => Boolean(binding.design.box))
    .map((binding) => ({
      ...binding,
      matchMethod: "structure-geometry" as const
    }));
  const allBindings = [...directBindings, ...listTemplateBindings].filter(
    (binding, index, bindings) =>
      bindings.findIndex(
        (candidate) =>
          candidate.design.id === binding.design.id &&
          candidate.actual.fingerprint.key === binding.actual.fingerprint.key
      ) === index
  );
  const dynamicEvidence = evidence.kind === "live"
    ? evidence
    : evidence.kind === "hybrid"
      ? evidence.projectedLive
      : undefined;
  const designContextTexts = (node: DesignTruthNode): string[] => designElements
    .filter((candidate) => candidate.id !== node.id && candidate.node.parentId === node.parentId)
    .flatMap((candidate) => [candidate.name, candidate.text])
    .filter((value): value is string => Boolean(value?.trim()));
  const actualContextTexts = (element: ActualEvidenceElement): string[] => capture.elements
    .filter((candidate) =>
      candidate.fingerprint.key !== element.fingerprint.key &&
      Boolean(element.parentSelector) &&
      candidate.parentSelector === element.parentSelector
    )
    .flatMap((candidate) => [candidate.role, candidate.text])
    .filter((value): value is string => Boolean(value?.trim()));
  const detectedNormalization: Omit<DynamicNormalizationSummary, "stableSimilarity"> & { stableSimilarity?: number } = dynamicEvidence
    ? await resolveDynamicNormalization(
        dynamicEvidence,
        allBindings.map((binding) => ({
          figmaNodeId: binding.design.id,
          designName: binding.design.name,
          designText: binding.design.text,
          designContextTexts: designContextTexts(binding.design),
          actualContextTexts: actualContextTexts(binding.actual),
          designBox: binding.design.box!,
          actual: binding.actual,
          matchMethod: binding.matchMethod
        })),
        design.render.viewport,
        locale,
        options.dynamicHypothesisAgent
      )
    : {
        stableSimilarity: 1,
        dynamicRegionAreaRatio: 0,
        strategies: [],
        regions: [],
        agentHypotheses: []
      };
  const marketVariants = analyzeMarketVariants(
    design,
    allBindings.map((binding) => ({
      design: binding.design,
      actual: binding.actual
    })),
    capture.elements,
    locale
  );
  detectedNormalization.geometry = verifyDataDrivenWidths(regionCorrespondence.tree, evidence,
    matching.matches.map(match => ({ design: match.design.node, actual: match.actual, method: match.method })));
  const normalizationPlan = buildNormalizationPlan(detectedNormalization);
  // Only verified leaf fields are exempt. Row containers, fixed headers and
  // independent typography/decoration checks remain reviewable.
  const templatePixelExclusions = marketListAnalysis.templateBindings.flatMap(binding =>
    binding.design.type === "TEXT" && binding.design.box && !binding.design.children.length
      ? [{ figmaNodeId: binding.design.id, designBox: binding.design.box, actualBox: binding.actual.box }] : []);
  normalizationPlan.pixelExclusions.push(...templatePixelExclusions);
  normalizationPlan.pixelExclusions.push(...detectedNormalization.geometry.map(item => ({ designBox: item.designBox, actualBox: item.actualBox })));
  const visual = await compareVisual(
    referenceImage,
    actualImage,
    width,
    height,
    config.thresholds.pixelThreshold,
    evidence.kind === "screenshot" ||
      (evidence.kind === "hybrid" && evidence.effectiveMode === "screenshot")
      ? [design.root.box ?? { x: 0, y: 0, width, height }]
      : matching.matches.flatMap((match) => [match.design.box, match.actual.box]),
    normalizationPlan.pixelExclusions
  );
  if (localRegions.length) {
    const alignedImage = await alignRegionPixels(actualImage, { width, height }, localRegions.flatMap(region => {
      const element = capture.elements.find(element => element.selector === region.actualParentSelector);
      return element ? [{ box: element.box, offset: region.displacement! }] : [];
    }));
    const alignBox = (box: Box, designId: string): Box => {
      const region = localRegions.find(region => subtreeIds(regionNodes.get(region.designParentFigmaNodeId)!).includes(designId));
      return { ...box, x: box.x - Math.round(region?.displacement?.x ?? 0), y: box.y - Math.round(region?.displacement?.y ?? 0) };
    };
    const aligned = await compareVisual(referenceImage, alignedImage, width, height, config.thresholds.pixelThreshold,
      matching.matches.flatMap(match => [match.design.box, alignBox(match.actual.box, match.design.id)]),
      [...detectedNormalization.regions, ...(detectedNormalization.geometry ?? []), ...templatePixelExclusions].map(region => ({ designBox: region.designBox, actualBox: alignBox(region.actualBox, region.figmaNodeId) })), true);
    visual.similarity = aligned.similarity;
    visual.scope = aligned.scope;
    visual.regions = aligned.regions;
  }
  const create = addIssueFactory();
  const issues: Issue[] = [];
  for (const region of localRegions) {
    const displacement = region.displacement!;
    if (Math.hypot(displacement.x, displacement.y) <= config.thresholds.positionTolerancePx) continue;
    const node = regionNodes.get(region.designParentFigmaNodeId)!;
    const actual = capture.elements.find(element => element.selector === region.actualParentSelector)!;
    issues.push(create({ rule: "region_displacement", category: localText(locale, "区域位移", "Region displacement"), severity: "pending",
      figmaNodeId: node.id, selector: actual.selector, designBox: node.box, actualBox: actual.box, box: actual.box, evidenceConfidence: region.evidenceConfidence,
      title: localText(locale, `${node.name} 整体位移（原因待核验）`, `${node.name}: regional displacement needs verification`),
      summary: localText(locale, `区域整体位移 x ${round(displacement.x)}px、y ${round(displacement.y)}px；内部已按局部坐标独立比较。`,
        `Region displacement x ${round(displacement.x)}px, y ${round(displacement.y)}px; internal layout is reviewed in regional coordinates.`),
      suggestion: localText(locale, "核验前序缺失、列表高度或区域位置原因；内部样式问题独立处理。", "Verify preceding omissions, list height or region placement; review internal style findings independently.") }));
  }

  for (const list of marketListAnalysis.summary.matches) {
    const addListIssue = (input: {
      rule: string;
      severity: Severity;
      titleZh: string;
      titleEn: string;
      summaryZh: string;
      summaryEn: string;
      expected?: string;
      actual?: string;
      selector?: string;
    }): void => {
      issues.push(create({
        category: list.kind === "news"
          ? localText(locale, "资讯卡片模板", "News card template")
          : localText(locale, "行情列表模板", "Market list template"),
        severity: input.severity,
        title: localText(locale, input.titleZh, input.titleEn),
        summary: localText(locale, input.summaryZh, input.summaryEn),
        expected: input.expected,
        actual: input.actual,
        suggestion: localText(locale, "按 Figma 行模板调整列表结构和样式。", "Align the list structure and styles with the Figma row template."),
        selector: input.selector ?? list.selector,
        figmaNodeId: list.figmaNodeId,
        evidenceConfidence: list.evidenceConfidence,
        box: capture.elements.find((element) => element.selector === (input.selector ?? list.selector))?.box,
        rule: input.rule
      }));
    };
    if (
      list.header.actualHeight === undefined ||
      Math.abs(list.header.expectedHeight - list.header.actualHeight) >
        config.thresholds.sizeTolerancePx
    ) {
      addListIssue({
        rule: "market_list_header",
        severity: severityFor(config, "size", "error") ?? "error",
        titleZh: "行情列表表头尺寸不一致",
        titleEn: "Market-list header size does not match",
        summaryZh: "表头缺失或高度超出允许偏差。",
        summaryEn: "The header is missing or its height exceeds the allowed tolerance.",
        expected: formatPx(list.header.expectedHeight, locale),
        actual: formatPx(list.header.actualHeight, locale),
        selector: list.header.selector
      });
    }
    if (list.expectedColumnCount !== list.actualColumnCount) {
      addListIssue({
        rule: "market_list_column_count",
        severity: "error",
        titleZh: list.kind === "news" ? "资讯卡片字段结构不一致" : "行情列表列数不一致",
        titleEn: list.kind === "news" ? "News-card field structure does not match" : "Market-list column count does not match",
        summaryZh: list.kind === "news" ? "重复资讯卡片的文本字段数与设计模板不同；已停止按序号绑定剩余字段，避免错配。" : "同构重复行的稳定列数与 Figma 行模板不同。",
        summaryEn: list.kind === "news" ? "Repeated news-card field counts differ from the design template. Positional field binding is disabled to prevent shifted matches." : "The stable column count across isomorphic rows differs from the Figma row template.",
        expected: String(list.expectedColumnCount),
        actual: String(list.actualColumnCount)
      });
    }
    for (const column of list.columns) {
      if (
        Math.abs(column.expectedWidth - column.actualWidth) >
        config.thresholds.sizeTolerancePx
      ) {
        addListIssue({
          rule: "market_list_column_width",
          severity: severityFor(config, "size", "error") ?? "error",
          titleZh: `${column.name} 列宽不一致`,
          titleEn: `${column.name} column width does not match`,
          summaryZh: "重复行的中位列宽与 Figma 行模板不同。",
          summaryEn: "The median repeated-row column width differs from the Figma row template.",
          expected: formatPx(column.expectedWidth, locale),
          actual: formatPx(column.actualWidth, locale)
        });
      }
      if (
        column.expectedAlignment &&
        column.actualAlignment &&
        column.expectedAlignment.toLocaleLowerCase() !==
          column.actualAlignment.toLocaleLowerCase()
      ) {
        addListIssue({
          rule: "market_list_alignment",
          severity: severityFor(config, "alignment", "error") ?? "error",
          titleZh: `${column.name} 列对齐不一致`,
          titleEn: `${column.name} column alignment does not match`,
          summaryZh: "重复行单元格的文字对齐与 Figma 行模板不同。",
          summaryEn: "Repeated-row cell alignment differs from the Figma row template.",
          expected: column.expectedAlignment,
          actual: column.actualAlignment
        });
      }
    }
    if (
      Math.abs(list.rowTemplate.expectedHeight - list.rowTemplate.actualHeight) >
      config.thresholds.sizeTolerancePx
    ) {
      addListIssue({
        rule: "market_list_row_height",
        severity: severityFor(config, "size", "error") ?? "error",
        titleZh: "行情列表行高不一致",
        titleEn: "Market-list row height does not match",
        summaryZh: "重复行的中位行高与 Figma 行模板不同。",
        summaryEn: "The median repeated-row height differs from the Figma row template.",
        expected: formatPx(list.rowTemplate.expectedHeight, locale),
        actual: formatPx(list.rowTemplate.actualHeight, locale)
      });
    }
    if (
      Math.abs(list.rowTemplate.expectedGap - list.rowTemplate.actualGap) >
      config.thresholds.positionTolerancePx
    ) {
      addListIssue({
        rule: "market_list_row_gap",
        severity: severityFor(config, "position", "error") ?? "error",
        titleZh: "行情列表行间距不一致",
        titleEn: "Market-list row gap does not match",
        summaryZh: "重复行之间的中位间距与 Figma 列表不同。",
        summaryEn: "The median gap between repeated rows differs from the Figma list.",
        expected: formatPx(list.rowTemplate.expectedGap, locale),
        actual: formatPx(list.rowTemplate.actualGap, locale)
      });
    }
    const dividerWidthMismatch =
      list.rowTemplate.expectedDividerWidth !== undefined &&
      (list.rowTemplate.actualDividerWidth === undefined ||
        Math.abs(
          list.rowTemplate.expectedDividerWidth -
            list.rowTemplate.actualDividerWidth
        ) > 1);
    const dividerColorMismatch =
      colorDeltaE(
        list.rowTemplate.expectedDividerColor,
        list.rowTemplate.actualDividerColor
      );
    if (
      dividerWidthMismatch ||
      (dividerColorMismatch !== undefined &&
        dividerColorMismatch > config.thresholds.colorDeltaE)
    ) {
      addListIssue({
        rule: "market_list_divider",
        severity: severityFor(config, "decoration", "warning") ?? "warning",
        titleZh: "行情列表分割线不一致",
        titleEn: "Market-list divider does not match",
        summaryZh: "重复行分割线的宽度或颜色与 Figma 行模板不同。",
        summaryEn: "The repeated-row divider width or color differs from the Figma row template.",
        expected: `${formatPx(list.rowTemplate.expectedDividerWidth, locale)} · ${list.rowTemplate.expectedDividerColor ?? "-"}`,
        actual: `${formatPx(list.rowTemplate.actualDividerWidth, locale)} · ${list.rowTemplate.actualDividerColor ?? "-"}`
      });
    }
  }
  for (const unresolved of marketListAnalysis.summary.unresolved) {
    issues.push(create({
      category: localText(locale, "行情列表模板", "Market list template"),
      severity: "pending",
      title: localText(locale, "行情列表重复结构待确认", "Market-list repetition needs confirmation"),
      summary: unresolved.reason,
      expected: localText(locale, "至少两个列结构一致的重复行", "At least two repeated rows with a stable column structure"),
      actual: localText(locale, "重复结构证据不足", "Insufficient repetition evidence"),
      suggestion: localText(locale, "保留当前元素级审查结果，并人工确认列表容器和行模板。", "Keep the element-level findings and confirm the list container and row template manually."),
      selector: unresolved.selector,
      figmaNodeId: unresolved.figmaNodeId,
      evidenceConfidence: unresolved.evidenceConfidence,
      box: capture.elements.find((element) => element.selector === unresolved.selector)?.box,
      rule: "market_list_structure"
    }));
  }

  const visualSeverity = severityFor(config, "visual_similarity", "error");
  if (visualSeverity && visual.similarity < config.thresholds.visualSimilarityMin) {
    issues.push(
      create({
        category: localText(locale, "视觉相似度", "Visual similarity"),
        severity: visualSeverity,
        title: localText(locale, "稳定区域视觉相似度未达标", "Stable-region visual similarity is below the threshold"),
        summary: localText(
          locale,
          `可靠匹配的稳定区域相似度 ${(visual.similarity * 100).toFixed(2)}%，低于最低要求 ${(config.thresholds.visualSimilarityMin * 100).toFixed(2)}%。`,
          `Stable-region similarity inside reliable matches is ${(visual.similarity * 100).toFixed(2)}%, below the minimum ${(config.thresholds.visualSimilarityMin * 100).toFixed(2)}%.`
        ),
        expected: `≥ ${(config.thresholds.visualSimilarityMin * 100).toFixed(2)}%`,
        actual: `${(visual.similarity * 100).toFixed(2)}%`,
        suggestion: localText(locale, "先处理报告中变化像素最多的区域，再重新运行验收。", "Fix the areas with the most changed pixels first, then rerun acceptance."),
        evidenceConfidence: deterministicEvidenceConfidence("pixel-measurement", locale),
        rule: "visual_similarity"
      })
    );
  }

  visual.regions.forEach((region, index) => {
    const visualOnly = evidence.kind === "screenshot" ||
      (evidence.kind === "hybrid" && evidence.effectiveMode === "screenshot");
    const inferredDesign = visualOnly
      ? designElements
          .map((element) => ({ element, overlap: overlapArea(element.box, region) }))
          .filter((candidate) => candidate.overlap > 0)
          .sort((a, b) => b.overlap - a.overlap || a.element.box.width * a.element.box.height - b.element.box.width * b.element.box.height)[0]
          ?.element
      : undefined;
    const owners = localRegions.filter(item => {
      const box = regionNodes.get(item.designParentFigmaNodeId)?.box;
      return box && region.x >= box.x && region.y >= box.y && region.x + region.width <= box.x + box.width && region.y + region.height <= box.y + box.height;
    });
    const owner = owners.length === 1 ? owners[0] : undefined;
    const absoluteActualBox = owner ? { ...region, x: region.x + owner.displacement!.x, y: region.y + owner.displacement!.y }
      : !localRegions.length ? region : undefined;
    issues.push(
      create({
        category: localText(locale, "视觉差异", "Visual difference"),
        severity: "pending",
        title: localText(locale, `高密度差异区域 ${index + 1}`, `High-density difference region ${index + 1}`),
        summary: localText(
          locale,
          `该区域包含 ${region.changedPixels.toLocaleString(locale)} 个变化像素，区域差异密度 ${(region.density * 100).toFixed(1)}%。`,
          `This region contains ${region.changedPixels.toLocaleString(locale)} changed pixels with a difference density of ${(region.density * 100).toFixed(1)}%.`
        ),
        suggestion: localText(locale, "在叠加视图中检查该区域，再结合元素级规则确认具体属性。", "Inspect this area in the overlay view, then use element-level rules to identify the affected properties."),
        figmaNodeId: inferredDesign?.id ?? owner?.designParentFigmaNodeId,
        designBox: region,
        actualBox: absoluteActualBox,
        evidenceConfidence: {
          score: visualOnly ? Math.min(0.78, evidence.confidenceCap) : 0.7,
          level: visualOnly ? "medium" : "low",
          basis: visualOnly
            ? ["visual-inference", "pixel-measurement"]
            : ["pixel-measurement", "visual-inference"],
          reasons: [
            localText(
              locale,
              "仅由单帧像素差异定位区域，缺少元素身份或结构佐证。",
              "The region is located from a single-frame pixel difference without element identity or structural support."
            )
          ]
        },
        box: absoluteActualBox,
        rule: "visual_region"
      })
    );
  });

  for (const outcome of detectedNormalization.agentHypotheses) {
    if (outcome.status !== "pending") continue;
    const match = matching.matches.find(
      (candidate) =>
        candidate.design.id === outcome.figmaNodeId &&
        candidate.actual.fingerprint.key === outcome.fingerprintKey
    );
    if (!match) continue;
    issues.push(
      create({
        category: localText(locale, "动态内容", "Dynamic content"),
        severity: "pending",
        title: localText(locale, "动态区域假设未通过验证", "Dynamic-region hypothesis was not verified"),
        summary: localText(
          locale,
          `Agent 假设在 ${outcome.attempts} 次尝试后仍与确定性证据冲突：${outcome.reason}。`,
          `The Agent hypothesis still conflicts with deterministic evidence after ${outcome.attempts} attempts: ${outcome.reason}.`
        ),
        suggestion: localText(locale, "人工确认该区域的动态类型和绑定关系。", "Confirm the region's dynamic type and binding manually."),
        selector: match.actual.selector,
        figmaNodeId: match.design.id,
        evidenceConfidence: {
          score: 0.7,
          level: "medium",
          basis: [
            ...(match.method === "exact-id"
              ? ["exact-id" as const]
              : ["structure-geometry" as const]),
            "temporal-consistency",
            "agent-hypothesis"
          ],
          reasons: [
            localText(
              locale,
              "多帧证明内容在变化，但 Agent 提出的绑定或策略未通过确定性验证。",
              "Multiple frames prove content changes, but the Agent-proposed binding or strategy failed deterministic verification."
            )
          ]
        },
        box: match.actual.box,
        rule: "dynamic_hypothesis"
      })
    );
  }

  for (const variantMatch of marketVariants.matches) {
    const expectedVariant = marketVariants.catalog.find(
      (variant) => variant.variantNodeId === variantMatch.expectedVariantNodeId
    );
    const actual = capture.elements.find(
      (element) => element.selector === variantMatch.selector
    );
    const expectedColor = expectedVariant?.style.color ?? expectedVariant?.style.backgroundColor;
    const actualColor = expectedVariant?.style.color
      ? actual?.style.color
      : actual?.style.backgroundColor;
    const delta = colorDeltaE(expectedColor, actualColor);
    if (delta !== undefined && delta > config.thresholds.colorDeltaE) {
      const severity = severityFor(config, "color", "warning");
      if (severity) {
        issues.push(
          create({
            category: localText(locale, "行情 Variant", "Market Variant"),
            severity,
            title: localText(locale, "行情状态颜色与设计稿不一致", "Market-state color does not match the design"),
            summary: localText(
              locale,
              `${variantMatch.semantic} 已映射到 Figma Variant“${variantMatch.originalPropertyValue}”，颜色差 ΔE ${round(delta)}。`,
              `${variantMatch.semantic} maps to Figma Variant “${variantMatch.originalPropertyValue}”; color delta is ${round(delta)}.`
            ),
            expected: expectedColor,
            actual: actualColor,
            suggestion: localText(locale, "使用目标 Figma Variant 的颜色，不要根据涨跌惯例硬编码。", "Use the target Figma Variant color instead of hard-coding a market-color convention."),
            selector: variantMatch.selector,
            figmaNodeId: variantMatch.figmaNodeId,
            evidenceConfidence: variantMatch.evidenceConfidence,
            box: actual?.box,
            rule: "market_variant_color"
          })
        );
      }
    }
    const expectedIconBox = variantMatch.icon?.expectedBox;
    const actualIconBox = variantMatch.icon?.actualBox;
    if (variantMatch.icon && !variantMatch.icon.actualSelector) {
      issues.push(create({
        category: localText(locale, "行情 Variant", "Market Variant"),
        severity: "error",
        title: localText(locale, "缺少行情状态图标", "Market-state icon is missing"),
        summary: localText(
          locale,
          `目标 Variant“${variantMatch.originalPropertyValue}”要求图标“${variantMatch.icon.expectedName}”。`,
          `Target Variant “${variantMatch.originalPropertyValue}” requires icon “${variantMatch.icon.expectedName}”.`
        ),
        expected: variantMatch.icon.expectedName,
        actual: localText(locale, "未找到", "Not found"),
        suggestion: localText(locale, "补充目标 Figma Variant 中定义的图标。", "Add the icon defined by the target Figma Variant."),
        selector: variantMatch.selector,
        figmaNodeId: variantMatch.figmaNodeId,
        evidenceConfidence: variantMatch.evidenceConfidence,
        box: actual?.box,
        rule: "market_variant_icon"
      }));
    }
    if (expectedIconBox && actualIconBox) {
      const iconPositionDelta = Math.hypot(
        expectedIconBox.x - actualIconBox.x,
        expectedIconBox.y - actualIconBox.y
      );
      if (iconPositionDelta > config.thresholds.positionTolerancePx) {
        issues.push(create({
          category: localText(locale, "行情 Variant", "Market Variant"),
          severity: severityFor(config, "position", "error") ?? "error",
          title: localText(locale, "行情状态图标位置不一致", "Market-state icon position does not match"),
          summary: localText(locale, "目标 Variant 图标在实例内的位置存在偏差。", "The target Variant icon is mispositioned inside the instance."),
          expected: JSON.stringify(expectedIconBox),
          actual: JSON.stringify(actualIconBox),
          suggestion: localText(locale, "按目标 Figma Variant 调整图标的相对位置。", "Match the icon's relative position to the target Figma Variant."),
          selector: variantMatch.icon?.actualSelector,
          figmaNodeId: variantMatch.figmaNodeId,
          evidenceConfidence: variantMatch.evidenceConfidence,
          box: actual?.box,
          rule: "market_variant_icon_position"
        }));
      }
      const iconSizeDelta = Math.max(
        Math.abs(expectedIconBox.width - actualIconBox.width),
        Math.abs(expectedIconBox.height - actualIconBox.height)
      );
      if (iconSizeDelta > config.thresholds.sizeTolerancePx) {
        issues.push(create({
          category: localText(locale, "行情 Variant", "Market Variant"),
          severity: severityFor(config, "size", "error") ?? "error",
          title: localText(locale, "行情状态图标尺寸不一致", "Market-state icon size does not match"),
          summary: localText(locale, "目标 Variant 图标在实例内的尺寸存在偏差。", "The target Variant icon has the wrong size inside the instance."),
          expected: JSON.stringify(expectedIconBox),
          actual: JSON.stringify(actualIconBox),
          suggestion: localText(locale, "按目标 Figma Variant 调整图标尺寸。", "Match the icon size to the target Figma Variant."),
          selector: variantMatch.icon?.actualSelector,
          figmaNodeId: variantMatch.figmaNodeId,
          evidenceConfidence: variantMatch.evidenceConfidence,
          box: actual?.box,
          rule: "market_variant_icon_size"
        }));
      }
    }
  }

  for (const unresolved of marketVariants.unresolved) {
    const actual = capture.elements.find(
      (element) => element.selector === unresolved.selector
    );
    issues.push(
      create({
        category: localText(locale, "行情状态", "Market state"),
        severity: "pending",
        title: localText(locale, "缺少设计侧行情 Variant 证据", "Design-side market Variant evidence is missing"),
        summary: unresolved.reason,
        expected: localText(locale, "有 Figma 证据支持的目标 Variant", "A target Variant backed by Figma evidence"),
        actual: unresolved.actualSemantic,
        suggestion: localText(locale, "在同一组件集中提供可区分的 Variant 属性、示例符号或方向图标。", "Provide distinguishable Variant properties, sample signs, or directional icons in the same component set."),
        selector: unresolved.selector,
        figmaNodeId: unresolved.figmaNodeId,
        evidenceConfidence: unresolved.evidenceConfidence,
        box: actual?.box,
        rule: "market_variant"
      })
    );
  }

  const collapsedRegions = matching.matches.filter(match => match.design.type !== "TEXT" &&
    match.confidence >= config.thresholds.matchConfidenceMin &&
    match.design.box.height - match.actual.box.height > config.thresholds.sizeTolerancePx && capture.elements.some(control =>
      control.expanded === false && (control.selector === match.actual.selector || actualAncestorSelectors(control).includes(match.actual.selector)) &&
      evidence.samples.length >= 3 && evidence.samples.every(sample => sample.elements.some(item => item.fingerprint.key === control.fingerprint.key && item.expanded === false))));
  const reviewChecks = reviewCheckRecorder(config);
  const templateStyleMatches: ElementMatch[] = verifiedTemplateBindings.flatMap(binding => {
    const expected = designElements.find(node => node.id === binding.design.id);
    if (!expected || matching.matches.some(match => match.design.id === expected.id && match.actual.selector === binding.actual.selector)) return [];
    return [{design: expected, actual: binding.actual, confidence: 0.9, method: "structure-geometry" as const, templateStyleOnly: true}];
  });
  for (const match of [...matching.matches, ...templateStyleMatches]) {
    const { design: expected, actual } = match;
    const evidenceConfidence = evidenceConfidenceForMatch(
      match,
      config,
      locale,
      evidence.kind === "hybrid" ? evidence.alignment : undefined
    );
    const normalization = normalizationPlan.decisionFor(
      expected.id,
      actual.fingerprint.key
    );
    const common = {
      selector: actual.selector,
      figmaNodeId: expected.id,
      actualElementFingerprint: actual.fingerprint.key,
      ...(!normalization.textComparable
        ? { dynamicStrategy: normalization.strategy }
        : {}),
      evidenceConfidence,
      designBox: expected.box,
      actualBox: actual.box,
      box: actual.box
    };
    const collapsedSelf = collapsedRegions.some(region => region.design.id === expected.id);
    const collapsedBefore = collapsedRegions.find(region => expected.box.y >= region.design.box.y + region.design.box.height &&
      actual.box.y >= region.actual.box.y + region.actual.box.height &&
      Math.min(expected.box.x + expected.box.width, region.design.box.x + region.design.box.width) > Math.max(expected.box.x, region.design.box.x));
    const stateReason = collapsedSelf || collapsedBefore ? "state-mismatch: captured collapsed region; verify expanded design state before vertical layout review" : undefined;
    const textContainer = expected.type === "TEXT" && actual.textInLayoutContainer === true;
    const textGeometryReason = textContainer ? "text-container: independent text layout bounds unavailable" : undefined;
    const localRegion = localRegionFor(match);
    const localBox = { ...actual.box, x: actual.box.x - (localRegion?.displacement?.x ?? 0), y: actual.box.y - (localRegion?.displacement?.y ?? 0) };
    const positionDelta = Math.hypot(expected.box.x - localBox.x, collapsedBefore ? 0 : expected.box.y - localBox.y);
    const intrinsicDynamicWidth = !normalization.textComparable && expected.type === "TEXT" &&
      (expected.node.layout?.sizingHorizontal === "HUG" || expected.node.layout?.textAutoResize === "WIDTH_AND_HEIGHT");
    const uncertainDynamicWidth = !normalization.textComparable && expected.type === "TEXT" && !intrinsicDynamicWidth &&
      !expected.node.layout?.sizingHorizontal && !expected.node.layout?.textAutoResize &&
      Math.abs(expected.box.width - actual.box.width) > config.thresholds.sizeTolerancePx;
    const dataWidth = detectedNormalization.geometry?.find(item => item.figmaNodeId === expected.id && item.selector === actual.selector);
    const templateRow = match.templateStyleOnly && marketListAnalysis.summary.matches.some(list => list.rowTemplate.figmaNodeId === expected.id);
    const sizeDelta = Math.max(
      dataWidth || intrinsicDynamicWidth || uncertainDynamicWidth ? 0 : Math.abs(expected.box.width - actual.box.width),
      collapsedSelf ? 0 : Math.abs(expected.box.height - actual.box.height)
    );

    if (!textContainer && !match.templateStyleOnly && positionDelta > config.thresholds.positionTolerancePx) {
      const severity = confidenceSeverity(
        severityFor(config, "position", "error"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "布局", "Layout"),
            severity,
            title: localText(locale, `${expected.name} 位置偏移`, `${expected.name} is mispositioned`),
            summary: localText(locale, `元素位置偏移 ${round(positionDelta)}px，超过允许值 ${config.thresholds.positionTolerancePx}px。`, `The element is offset by ${round(positionDelta)}px, exceeding the ${config.thresholds.positionTolerancePx}px tolerance.`),
            expected: `x ${formatPx(expected.box.x, locale)} · y ${formatPx(expected.box.y, locale)}`,
            actual: `x ${formatPx(localBox.x, locale)} · y ${formatPx(localBox.y, locale)}${localRegion ? " (regional coordinates)" : ""}`,
            suggestion: localText(locale, `检查 ${actual.selector} 的定位、容器 padding、margin 和对齐方式。`, `Check positioning, container padding, margins, and alignment for ${actual.selector}.`),
            rule: "position"
          })
        );
      }
    }

    if (!textContainer && (!match.templateStyleOnly || templateRow) && sizeDelta > config.thresholds.sizeTolerancePx) {
      const severity = confidenceSeverity(
        severityFor(config, "size", "error"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "布局", "Layout"),
            severity,
            title: localText(locale, `${expected.name} 尺寸不一致`, `${expected.name} has incorrect dimensions`),
            summary: localText(locale, `最大尺寸差 ${round(sizeDelta)}px，超过允许值 ${config.thresholds.sizeTolerancePx}px。`, `The largest dimension delta is ${round(sizeDelta)}px, exceeding the ${config.thresholds.sizeTolerancePx}px tolerance.`),
            expected: `${formatPx(expected.box.width, locale)} × ${formatPx(expected.box.height, locale)}`,
            actual: `${formatPx(actual.box.width, locale)} × ${formatPx(actual.box.height, locale)}`,
            suggestion: localText(locale, `调整 ${actual.selector} 的 width、height、padding 或 box-sizing。`, `Adjust width, height, padding, or box-sizing for ${actual.selector}.`),
            rule: "size"
          })
        );
      }
    }

    if (
      !match.templateStyleOnly && normalization.textComparable &&
      normalizeText(expected.text) &&
      normalizeText(expected.text) !== normalizeText(actual.text)
    ) {
      const severity = confidenceSeverity(
        severityFor(config, "content", "error"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "内容", "Content"),
            severity,
            title: localText(locale, `${expected.name} 文案不一致`, `${expected.name} text does not match`),
            summary: localText(locale, "映射元素的可见文本与设计稿不同。", "The mapped element's visible text differs from the design."),
            expected: expected.text,
            actual: actual.text || localText(locale, "空文本", "empty text"),
            suggestion: localText(locale, `核对 ${actual.selector} 的文案和国际化资源。`, `Check the copy and localization resources for ${actual.selector}.`),
            rule: "content"
          })
        );
      }
    }

    const checkContext = { figmaNodeId: expected.id, actualElement: actual, confidence: actual.visuallyObscured ? 0 : evidenceConfidence.score };
    for (const property of ["x", "y", "width", "height"] as const) {
      const position = property === "x" || property === "y";
      const tolerance = position ? config.thresholds.positionTolerancePx : config.thresholds.sizeTolerancePx;
      reviewChecks.record({ ...checkContext, property, rule: position ? "position" : "size", expected: expected.box[property], actual: localBox[property],
        tolerance, differs: Math.abs(expected.box[property] - localBox[property]) > tolerance,
        pendingReason: textGeometryReason ?? ((property === "y" && collapsedBefore || property === "height" && collapsedSelf) ? stateReason : undefined) ?? (property === "width" && uncertainDynamicWidth ? "dynamic-text: design sizing constraint unavailable" : undefined),
        exemption: match.templateStyleOnly && (!templateRow || position) ? "verified-template: geometry reviewed at row/column level"
          : property === "width" && dataWidth ? dataWidth.reason
          : property === "width" && intrinsicDynamicWidth ? "dynamic-text: design permits intrinsic width" : undefined });
    }
    reviewChecks.record({ ...checkContext, property: "text", rule: "content", expected: expected.text || undefined, actual: actual.text,
      differs: normalizeText(expected.text) !== normalizeText(actual.text),
      exemption: match.templateStyleOnly ? "verified-template: variable row content" : !normalization.textComparable ? normalization.strategy : undefined });
    reviewChecks.record({ ...checkContext, property: "fontSize", rule: "typography", expected: expected.style.fontSize,
      actual: actual.style.fontSize, tolerance: config.thresholds.fontSizeTolerancePx,
      differs: Math.abs((expected.style.fontSize ?? 0) - (actual.style.fontSize ?? 0)) > config.thresholds.fontSizeTolerancePx });
    reviewChecks.record({ ...checkContext, property: "fontFamily", rule: "typography", expected: expected.style.fontFamily,
      actual: actual.style.fontFamily, differs: primaryFontFamily(expected.style.fontFamily) !== primaryFontFamily(actual.style.fontFamily) });
    for (const [property, rule, tolerance] of [
      ["fontWeight", "typography", 99], ["lineHeight", "typography", 2], ["borderRadius", "decoration", 2],
      ["borderWidth", "decoration", 1], ["opacity", "decoration", 0.05]
    ] as const) {
      const expectedValue = expected.style[property], actualValue = actual.style[property];
      reviewChecks.record({ ...checkContext, property, rule, expected: expectedValue, actual: actualValue, tolerance,
        pendingReason: property === "lineHeight" ? textGeometryReason : undefined,
        differs: Math.abs((expectedValue ?? 0) - (actualValue ?? 0)) > tolerance ||
          (property === "borderWidth" && expectedValue !== undefined && actualValue !== undefined && (expectedValue === 0) !== (actualValue === 0)) });
    }
    reviewChecks.record({ ...checkContext, property: "textAlign", rule: "alignment", expected: expected.style.textAlign, actual: actual.style.textAlign,
      differs: canonicalLtrTextAlign(expected.style.textAlign) !== canonicalLtrTextAlign(actual.style.textAlign) });
    const statePending = marketVariants.unresolved.some(item => item.figmaNodeId === expected.id && item.selector === actual.selector);
    const stateMatch = marketVariants.matches.find(item => item.figmaNodeId === expected.id && item.selector === actual.selector);
    const stateStyle = marketVariants.catalog.find(item => item.variantNodeId === stateMatch?.expectedVariantNodeId)?.style;
    const colorStyle = stateStyle ?? expected.style;
    const checkExpectedColor = colorStyle.color ?? colorStyle.backgroundColor;
    const checkActualColor = colorStyle.color ? actual.style.color : actual.style.backgroundColor;
    reviewChecks.record({ ...checkContext, property: "color", rule: "color", expected: checkExpectedColor,
      actual: colorDeltaE(checkExpectedColor, checkActualColor) === undefined ? undefined : checkActualColor,
      pendingReason: statePending ? "state-conditioned: corresponding Figma variant unavailable" : undefined,
      tolerance: config.thresholds.colorDeltaE, differs: (colorDeltaE(checkExpectedColor, checkActualColor) ?? 0) > config.thresholds.colorDeltaE });
    const typographyDifferences: string[] = [];
    if (
      expected.style.fontFamily &&
      actual.style.fontFamily &&
      primaryFontFamily(expected.style.fontFamily) !== primaryFontFamily(actual.style.fontFamily)
    ) {
      typographyDifferences.push(
        `font-family ${actual.style.fontFamily} → ${expected.style.fontFamily}`
      );
    }
    if (
      expected.style.fontSize !== undefined &&
      actual.style.fontSize !== undefined &&
      Math.abs(expected.style.fontSize - actual.style.fontSize) > config.thresholds.fontSizeTolerancePx
    ) {
      typographyDifferences.push(
        `font-size ${formatPx(actual.style.fontSize, locale)} → ${formatPx(expected.style.fontSize, locale)}`
      );
    }
    if (
      expected.style.fontWeight !== undefined &&
      actual.style.fontWeight !== undefined &&
      Math.abs(expected.style.fontWeight - actual.style.fontWeight) >= 100
    ) {
      typographyDifferences.push(
        `font-weight ${actual.style.fontWeight} → ${expected.style.fontWeight}`
      );
    }
    if (
      !textContainer && expected.style.lineHeight !== undefined &&
      actual.style.lineHeight !== undefined &&
      Math.abs(expected.style.lineHeight - actual.style.lineHeight) > 2
    ) {
      typographyDifferences.push(
        `line-height ${formatPx(actual.style.lineHeight, locale)} → ${formatPx(expected.style.lineHeight, locale)}`
      );
    }
    if (typographyDifferences.length) {
      const severity = confidenceSeverity(
        severityFor(config, "typography", "error"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "排版", "Typography"),
            severity,
            title: localText(locale, `${expected.name} 排版属性不一致`, `${expected.name} typography does not match`),
            summary: typographyDifferences.join(locale === "en" ? "; " : "；"),
            suggestion: localText(locale, `按设计值调整 ${actual.selector} 的字体相关 CSS。`, `Update the typography CSS for ${actual.selector} to match the design.`),
            rule: "typography"
          })
        );
      }
    }

    if (
      expected.style.textAlign &&
      actual.style.textAlign &&
      canonicalLtrTextAlign(expected.style.textAlign) !== canonicalLtrTextAlign(actual.style.textAlign)
    ) {
      const severity = confidenceSeverity(
        severityFor(config, "alignment", "error"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "对齐", "Alignment"),
            severity,
            title: localText(
              locale,
              `${expected.name} 文字对齐不一致`,
              `${expected.name} text alignment does not match`
            ),
            summary: localText(
              locale,
              "动态内容已归一化，但文字对齐仍与设计稿不同。",
              "Dynamic content is normalized, but text alignment still differs from the design."
            ),
            expected: expected.style.textAlign,
            actual: actual.style.textAlign,
            suggestion: localText(
              locale,
              `将 ${actual.selector} 的 text-align 调整为设计值。`,
              `Set text-align on ${actual.selector} to the design value.`
            ),
            rule: "alignment"
          })
        );
      }
    }

    const expectedColor = expected.style.color ?? expected.style.backgroundColor;
    const actualColor = expected.style.color ? actual.style.color : actual.style.backgroundColor;
    const delta = colorDeltaE(expectedColor, actualColor);
    if (!statePending && !stateMatch && delta !== undefined && delta > config.thresholds.colorDeltaE) {
      const severity = confidenceSeverity(
        severityFor(config, "color", "warning"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "颜色", "Color"),
            severity,
            title: localText(locale, `${expected.name} 颜色存在差异`, `${expected.name} color does not match`),
            summary: localText(locale, `颜色差 ΔE ${round(delta)}，超过允许值 ${config.thresholds.colorDeltaE}。`, `The color delta ΔE is ${round(delta)}, exceeding the ${config.thresholds.colorDeltaE} tolerance.`),
            expected: expectedColor,
            actual: actualColor,
            suggestion: localText(locale, `将 ${actual.selector} 的颜色调整为设计值，并检查透明度与父层叠加。`, `Set ${actual.selector} to the design color and check opacity and parent-layer blending.`),
            rule: "color"
          })
        );
      }
    }

    const decorationDifferences: string[] = [];
    if (
      expected.style.borderRadius !== undefined &&
      actual.style.borderRadius !== undefined &&
      Math.abs(expected.style.borderRadius - actual.style.borderRadius) > 2
    ) {
      decorationDifferences.push(
        `border-radius ${formatPx(actual.style.borderRadius, locale)} → ${formatPx(expected.style.borderRadius, locale)}`
      );
    }
    if (
      expected.style.borderWidth !== undefined &&
      actual.style.borderWidth !== undefined &&
      (Math.abs(expected.style.borderWidth - actual.style.borderWidth) > 1 ||
        (expected.style.borderWidth === 0) !== (actual.style.borderWidth === 0))
    ) {
      decorationDifferences.push(
        `border-width ${formatPx(actual.style.borderWidth, locale)} → ${formatPx(expected.style.borderWidth, locale)}`
      );
    }
    if (
      expected.style.opacity !== undefined &&
      actual.style.opacity !== undefined &&
      Math.abs(expected.style.opacity - actual.style.opacity) > 0.05
    ) {
      decorationDifferences.push(`opacity ${actual.style.opacity} → ${expected.style.opacity}`);
    }
    if (decorationDifferences.length) {
      const severity = confidenceSeverity(
        severityFor(config, "decoration", "warning"),
        evidenceConfidence.score,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: localText(locale, "装饰", "Decoration"),
            severity,
            title: localText(locale, `${expected.name} 装饰属性不一致`, `${expected.name} decoration does not match`),
            summary: decorationDifferences.join(locale === "en" ? "; " : "；"),
            suggestion: localText(locale, `按设计值调整 ${actual.selector} 的边框、圆角或透明度。`, `Update the border, corner radius, or opacity for ${actual.selector} to match the design.`),
            rule: "decoration"
          })
        );
      }
    }
  }

  for (const audit of capture.audits) {
    const issue = issueForAudit(audit, config, create, locale);
    if (issue) issues.push(issue);
  }

  const unverifiedBindings = new Set(matching.matches.filter(match =>
    match.actual.visuallyObscured || (evidence.kind === "live" && !match.templateStyleOnly && ["structure-geometry", "visual-inference"].includes(match.method)))
    .map(match => `${match.design.id}\u0000${match.actual.selector}`));
  for (let index = issues.length - 1; index >= 0; index--) {
    const issue = issues[index];
    if (["position", "size", "content", "typography", "alignment", "color", "decoration"].includes(issue.rule) &&
      unverifiedBindings.has(`${issue.figmaNodeId}\u0000${issue.selector}`)) issues.splice(index, 1);
  }
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const reviewIssueResult = await aggregateReviewIssueResult(issues, locale, {
    rewriter: options.reviewIssueRewriter,
    moduleAlignment: {
      plan: matching.pageAlignment,
      ...(design.root.box ? { designPageBox: design.root.box } : {}),
      designRegions: designRegionBoxes(design),
      matches: matching.matches.map((match) => ({
        figmaNodeId: match.design.id,
        selector: match.actual.selector,
        designAncestorIds: match.design.ancestorIds,
        actualAncestorSelectors: actualAncestorSelectors(match.actual),
        ...(match.actual.parentSelector
          ? { actualParentSelector: match.actual.parentSelector }
          : {})
      })),
      positionTolerancePx: config.thresholds.positionTolerancePx,
      confidenceLevels: config.pageAlignment.confidence.levels,
      missingModuleThresholds: config.pageAlignment.missingModule
    }
  });
  const coverageResult = evaluateDesignCoverage({
    design, locale, evidence, issues: reviewIssueResult.issues,
    verifiedRegions: localRegions, positionTolerancePx: config.thresholds.positionTolerancePx,
    findings: issues,
    dynamicNodeIds: detectedNormalization.regions.map(region => region.figmaNodeId),
    matches: [...matching.matches.map(match => ({ figmaNodeId: match.design.id, selector: match.actual.selector,
      // The non-Agent visual-anchor path already enforces unique identical text.
      method: match.method === "visual-inference" && !match.agentAssisted &&
        normalizeText(match.design.text) && normalizeText(match.design.text) === normalizeText(match.actual.text)
        ? "stable-text" : match.method })),
      ...verifiedTemplateBindings.map(binding => ({ figmaNodeId: binding.design.id, selector: binding.actual.selector, method: "verified-template" }))]
  });
  const removedDisplacementIssues = new Set<string>();
  for (const item of coverageResult.coverage.items) {
    const region = localRegions.find(region => region.designParentFigmaNodeId === item.figmaNodeId);
    if (region?.displacement) {
      const causes = coverageResult.coverage.items.filter(cause => cause.absenceEvidence?.layoutGap?.affectedRegionIds.includes(item.figmaNodeId));
      const gaps = [...new Map(causes.map(cause => {
        const gap = cause.absenceEvidence!.layoutGap!; return [`${gap.precedingRegionId}:${gap.followingRegionId}`, gap] as const;
      })).values()];
      const causeIssueIds = [...new Set(causes.flatMap(cause => cause.issueIds))];
      const explainedY = -gaps.reduce((sum, gap) => sum + gap.measuredRemovalPx, 0);
      const unexplainedY = region.displacement.y - explainedY;
      const complete = causeIssueIds.length > 0 && Math.hypot(region.displacement.x, unexplainedY) <= config.thresholds.positionTolerancePx;
      item.displacement = { ...region.displacement, causeIssueIds, explainedY, unexplainedY, causeStatus: complete ? "verified" : causeIssueIds.length ? "partial" : "pending" };
      item.issueIds = [...new Set([...item.issueIds, ...causeIssueIds])];
      for (const issue of reviewIssueResult.issues.filter(issue => issue.rule === "region_displacement" && issue.figmaNodeId === item.figmaNodeId)) {
        if (complete) removedDisplacementIssues.add(issue.id);
        else if (causeIssueIds.length) {
          issue.summary = localText(locale, `总位移 y ${region.displacement.y}px；${causes.map(cause => cause.name).join("、")} 缺失链解释 ${explainedY}px，其余 ${unexplainedY}px 原因待核验。`,
            `Total y displacement ${region.displacement.y}px; the missing chain ${causes.map(cause => cause.name).join(", ")} explains ${explainedY}px. The remaining ${unexplainedY}px requires verification.`);
        }
      }
    }
    item.checks = reviewChecks.byDesign.get(item.figmaNodeId) ?? [];
    item.actualBox = item.checks[0]?.actualBox;
    item.reviewStatus = item.status === "missing" || item.checks.some(check => check.status === "difference") ? "difference"
      : item.status === "unverified" || item.status === "covered-by-parent" || (item.displacement && item.displacement.causeStatus !== "verified" && Math.hypot(item.displacement.x, item.displacement.y) > config.thresholds.positionTolerancePx) || item.checks.some(check => check.status === "pending") ? "pending"
      : item.checks.some(check => check.status === "passed") ? "passed" : "not-applicable";
  }
  const publishedIssues = [...reviewIssueResult.issues.filter(issue => !removedDisplacementIssues.has(issue.id)), ...coverageResult.issues];
  const publishedById = new Map(publishedIssues.map(issue => [issue.id, issue]));
  for (const item of coverageResult.coverage.items) {
    item.issueIds = item.issueIds.filter(id => !removedDisplacementIssues.has(id));
    const ownFindings = item.issueIds.flatMap(id => {
      const issue = publishedById.get(id);
      return issue?.figmaNodeId === item.figmaNodeId ? [issue] : [];
    });
    if (ownFindings.some(issue => issue.severity === "error" || issue.severity === "warning")) item.reviewStatus = "difference";
    else if (item.reviewStatus !== "difference" && ownFindings.some(issue => issue.severity === "pending")) item.reviewStatus = "pending";
  }
  return {
    referenceImage,
    actualImage,
    diffImage: visual.diff,
    similarity: visual.similarity,
    issues: [...reviewIssueResult.issues.filter(issue => !removedDisplacementIssues.has(issue.id)), ...coverageResult.issues],
    matching: {
      designCoverage: coverageResult.coverage,
      visualScope: visual.scope,
      matches: matching.matches.map((match) => ({
        figmaNodeId: match.design.id,
        selector: match.actual.selector,
        method: match.method,
        evidenceConfidence: evidenceConfidenceForMatch(
          match,
          config,
          locale,
          evidence.kind === "hybrid" ? evidence.alignment : undefined
        )
      })),
      unmatchedDesignCount: matching.unmatchedDesign.length,
      unmatchedActualCount: matching.unmatchedDom.length,
      pageAlignment: matching.pageAlignment,
      missingModules: reviewIssueResult.missingModules,
      semanticAgent: matching.semanticAgent,
      diagnostics: [
        ...matching.diagnostics,
        ...(matching.unmatchedDesign.length || matching.unmatchedDom.length
          ? [
              localText(
                locale,
                `设计覆盖：${matching.unmatchedDesign.length} 个设计节点未匹配，${matching.unmatchedDom.length} 个开发元素未匹配；设计项逐项记录，未验证项已归入待确认问题。`,
                `Design coverage: ${matching.unmatchedDesign.length} design nodes and ${matching.unmatchedDom.length} actual elements were unmatched; every design item is accounted for and unresolved items are grouped into pending findings.`
              )
            ]
          : [])
      ]
    },
    dynamicNormalization: {
      ...detectedNormalization,
      stableSimilarity: visual.similarity
    },
    marketVariants,
    marketLists: marketListAnalysis.summary,
    ...(evidence.kind === "hybrid" ? { alignment: evidence.alignment } : {})
  };
}
