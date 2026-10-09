export type Severity = "error" | "warning" | "pending" | "info";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ElementStyle {
  color?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  display?: string;
  direction?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  textBounds?: Box;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  boxShadow?: string;
}

export interface DesignLayout {
  textAutoResize?: string;
  mode?: string;
  sizingHorizontal?: string;
  sizingVertical?: string;
  wrap?: string;
  primaryAxisSizing?: string;
  counterAxisSizing?: string;
  primaryAxisAlign?: string;
  counterAxisAlign?: string;
  counterAxisAlignContent?: string;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  align?: string;
  grow?: number;
  positioning?: string;
  reverseZIndex?: boolean;
  strokesIncluded?: boolean;
}

export interface DesignStyleEvidence {
  styleIds?: Record<string, string>;
  fills?: Array<Record<string, unknown>>;
  strokes?: Array<Record<string, unknown>>;
  effects?: Array<Record<string, unknown>>;
}

export interface DesignComponentProperty {
  type: string;
  value: string | boolean;
  preferredValues?: Array<Record<string, string>>;
}

export interface DesignComponentPropertyDefinition {
  type: string;
  defaultValue: string | boolean;
  variantOptions?: string[];
  preferredValues?: Array<Record<string, string>>;
}

export interface DesignComponentEvidence {
  kind: "component-set" | "component" | "instance";
  componentId?: string;
  componentSetId?: string;
  variantProperties?: Record<string, string>;
  properties?: Record<string, DesignComponentProperty>;
  propertyDefinitions?: Record<string, DesignComponentPropertyDefinition>;
}

export interface DesignTruthNode {
  id: string;
  parentId?: string;
  name: string;
  type: string;
  text?: string;
  box?: Box;
  relativeBox?: Box;
  style: ElementStyle;
  styleEvidence?: DesignStyleEvidence;
  layout?: DesignLayout;
  component?: DesignComponentEvidence;
  children: DesignTruthNode[];
}

export interface DesignTruth {
  source:
    | {
        kind: "figma";
        fileKey: string;
        frameId: string;
        fileName?: string;
        frameName: string;
      }
    | {
        kind: "demo";
        name: string;
      };
  render: {
    image: Buffer;
    viewport: { width: number; height: number };
  };
  root: DesignTruthNode;
  diagnostics: string[];
}

export interface FigmaDesignTruth extends DesignTruth {
  source: {
    kind: "figma";
    fileKey: string;
    frameId: string;
    fileName?: string;
    frameName: string;
  };
  resources: {
    components: Record<string, Record<string, unknown>>;
    componentSets: Record<string, Record<string, unknown>>;
    styles: Record<string, Record<string, unknown>>;
  };
}

export interface DomElement {
  selector: string;
  parentSelector?: string;
  siblingIndex?: number;
  subtreeSignature?: string;
  tag: string;
  role?: string;
  dataFigmaId?: string;
  text?: string;
  declaredWidthPercent?: number;
  /** Text occupies a layout container whose box is not a comparable text box. */
  textInLayoutContainer?: boolean;
  expanded?: boolean;
  expansionEvidence?: "aria-expanded" | "clipped-content-control";
  visuallyObscured?: boolean;
  box: Box;
  style: ElementStyle;
}

export interface RuntimeElementFingerprint {
  key: string;
  identitySource: "figma-id" | "dom-structure" | "visual-anchor";
  tag: string;
  role?: string;
  selector: string;
  region: string;
  geometryBucket: string;
  styleSignature: string;
}

export interface ActualEvidenceElement extends DomElement {
  fingerprint: RuntimeElementFingerprint;
  visualConfidence?: number;
}

export interface StaticAudit {
  rule: "broken_image" | "horizontal_overflow" | "clipped_text";
  selector: string;
  summary: string;
  box?: Box;
}

export interface ActualEvidenceSample {
  coverage?: ActualCaptureCoverage;
  scroll?: ActualScrollPosition;
  index: number;
  capturedAtMs: number;
  image: Buffer;
  elements: ActualEvidenceElement[];
  audits: StaticAudit[];
}

export interface ActualScrollPosition {
  target: "document" | "element" | "unresolved";
  selector?: string;
  requestedY: number;
  actualY: number;
  scrollHeight: number;
  clientHeight: number;
}

export interface ActualCaptureCoverage {
  documentBoundsComplete?: boolean;
  limitations?: Array<{ reason: "text-clipping" | "scroll-container"; selector: string; box: Box }>;
  fullDocument: boolean;
  elementLimitReached: boolean;
  opaqueContent: boolean;
  excludedContent: boolean;
}

export interface ElementChangeSummary {
  fingerprintKey: string;
  selector: string;
  observedSampleIndexes: number[];
  presentInAllSamples: boolean;
  textChanged: boolean;
  geometryChanged: boolean;
  styleChanged: boolean;
  observedTexts: string[];
}

export interface PixelVarianceEvidence {
  image: Buffer;
  changedPixelCount: number;
  changedPixelRatio: number;
  threshold: number;
}

export interface LiveActualEvidence {
  kind: "live";
  sourceUrl: string;
  finalUrl: string;
  viewport: { width: number; height: number };
  samples: ActualEvidenceSample[];
  canonicalSampleIndex: number;
  elementChanges: ElementChangeSummary[];
  pixelVariance: PixelVarianceEvidence;
  diagnostics: string[];
}

export type ScreenshotImageFormat = "png" | "jpeg" | "webp";

export interface ScreenshotDeviceMetadata {
  platform: string;
  model?: string;
  osVersion?: string;
  dpr: number;
  orientation: "portrait" | "landscape";
  viewport: { width: number; height: number };
}

export interface ScreenshotCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotVisualAnchor {
  text?: string;
  role?: string;
  box: Box;
  confidence: number;
}

export interface ScreenshotSample extends ActualEvidenceSample {
  visualAnchors: ScreenshotVisualAnchor[];
  metadata: {
    name: string;
    format: ScreenshotImageFormat;
    sourcePixels: { width: number; height: number };
    crop?: ScreenshotCrop;
    device: ScreenshotDeviceMetadata;
  };
}

export interface ScreenshotActualEvidence {
  kind: "screenshot";
  viewport: { width: number; height: number };
  samples: ScreenshotSample[];
  canonicalSampleIndex: number;
  elementChanges: ElementChangeSummary[];
  pixelVariance: PixelVarianceEvidence;
  confidenceCap: number;
  diagnostics: string[];
}

export interface LongScreenshotTile {
  index: number;
  scrollY: number;
  contentHeight: number;
  viewport: { width: number; height: number };
  designImage: Buffer;
  actualImage: Buffer;
  anchors: ScreenshotVisualAnchor[];
  absoluteBox: Box;
}

export interface LongScreenshotAnomaly {
  kind: "lazy-load-blank" | "stitch-seam";
  box: Box;
  confidencePenalty: number;
  description: string;
}

export interface LongScreenshotActualEvidence {
  kind: "long_screenshot";
  viewport: { width: number; height: number };
  fullPage: {
    designImage: Buffer;
    actualImage: Buffer;
    width: number;
    height: number;
  };
  tiles: LongScreenshotTile[];
  stickyRegions: Array<{
    key: string;
    canonicalBox: Box;
    duplicateBoxes: Box[];
  }>;
  anomalies: LongScreenshotAnomaly[];
  confidenceCap: number;
  diagnostics: string[];
}

export interface HybridAlignment {
  anchorCount: number;
  transform?: {
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
  };
  residualPx: number;
  evidenceConfidence: EvidenceConfidence;
}

export interface HybridActualEvidence {
  kind: "hybrid";
  effectiveMode: "hybrid" | "screenshot";
  viewport: { width: number; height: number };
  samples: ScreenshotSample[];
  canonicalSampleIndex: number;
  elementChanges: ElementChangeSummary[];
  pixelVariance: PixelVarianceEvidence;
  confidenceCap: number;
  screenshot: ScreenshotActualEvidence;
  live: LiveActualEvidence;
  projectedLive?: LiveActualEvidence;
  alignment: HybridAlignment;
  diagnostics: string[];
}

export type ActualEvidence = LiveActualEvidence | ScreenshotActualEvidence | HybridActualEvidence;

export type EvidenceBasis =
  | "verified-region"
  | "verified-template"
  | "exact-id"
  | "stable-text"
  | "structure-geometry"
  | "temporal-consistency"
  | "market-format"
  | "repeated-structure"
  | "geometric-alignment"
  | "agent-hypothesis"
  | "semantic-format"
  | "visual-inference"
  | "pixel-measurement"
  | "dom-audit";

export interface EvidenceConfidence {
  score: number;
  level: "high" | "medium" | "low";
  basis: EvidenceBasis[];
  reasons: string[];
}

export interface ElementMatchEvidence {
  figmaNodeId: string;
  selector: string;
  method: "exact-id" | "stable-text" | "structure-geometry" | "visual-inference" | "verified-region" | "verified-template";
  evidenceConfidence: EvidenceConfidence;
}

export type PageAlignmentRegionStatus = "matched" | "missing-in-actual" | "uncertain";

export interface AgentPageAlignmentRegionDecision {
  designParentFigmaNodeId: string;
  designPath: string[];
  status: PageAlignmentRegionStatus;
  actualParentSelector: string | null;
  displacement: { x: number; y: number } | null;
  confidence: number;
  reason: string;
}

export interface PageAlignmentAnchorStats {
  candidateCount: number;
  stableCount: number;
  dynamicExcludedCount: number;
  structuralAnchorCount: number;
  inlierCount: number;
  residualPx: number | null;
}

export interface PageAlignmentScoreComponent {
  value: number;
  weight: number;
  contribution: number;
}

export interface PageAlignmentConfidenceLevels {
  highMin: number;
  mediumMin: number;
  lowMin: number;
}

export interface PageAlignmentConfidenceWeights {
  stabilityCoverage: number;
  anchorSufficiency: number;
  inlierRatio: number;
  residualQuality: number;
  dynamicCleanliness: number;
  structuralSupport: number;
}

export interface PageAlignmentScoreBreakdown {
  anchorEvidenceApplied: boolean;
  baseScoreCap: number;
  weightedScore: number;
  finalScore: number;
  components: Record<keyof PageAlignmentConfidenceWeights, PageAlignmentScoreComponent>;
  levelThresholds: PageAlignmentConfidenceLevels;
}

export interface PageAlignmentRegionDecision extends Omit<
  AgentPageAlignmentRegionDecision,
  "actualParentSelector" | "displacement"
> {
  actualParentSelector?: string;
  displacement?: { x: number; y: number };
  source: "deterministic" | "agent-verified";
  alignmentRole?: "missing-module-following-fallback" | "missing-module-preceding-fallback";
  anchorStats: PageAlignmentAnchorStats;
  scoreBreakdown: PageAlignmentScoreBreakdown;
  evidenceConfidence: EvidenceConfidence;
}

export interface PageAlignmentPlan {
  summary: string;
  regions: PageAlignmentRegionDecision[];
  rejectedRegionCount: number;
}

export type MissingModuleRejectionReason =
  | "missing-design-box"
  | "missing-preceding-anchor"
  | "missing-following-anchor"
  | "insufficient-horizontal-overlap"
  | "insufficient-design-gap"
  | "insufficient-displacement-step"
  | "residual-too-high";

export interface MissingModuleEvaluation {
  candidateId: string;
  regionIndex: number;
  figmaNodeId: string;
  designPath: string[];
  topology: "interior" | "leading" | "unsupported";
  precedingRegionId?: string;
  followingRegionId?: string;
  followingAnchorSource?: "page-alignment-region" | "temporal-stable-structure-fallback";
  followingAnchorStats?: PageAlignmentAnchorStats;
  designBox?: Box;
  designFlowGapPx?: number;
  displacementStepPx?: number;
  residualPx?: number;
  residualRatio?: number;
  horizontalOverlapRatio?: number;
  published: boolean;
  rejectionReasons: MissingModuleRejectionReason[];
  thresholds: {
    positionTolerancePx: number;
    minimumHorizontalOverlapRatio: number;
    maximumResidualRatio: number;
  };
}

export interface MissingModuleSummary {
  evaluatedCount: number;
  publishedCount: number;
  candidates: MissingModuleEvaluation[];
}

export type DynamicFallbackReasonCode =
  | "date_selector_unverified"
  | "temporal_dynamic_verified"
  | "agent_unavailable_dynamic_semantics"
  | "module_has_valid_agent_binding"
  | "design_semantics_not_dynamic"
  | "insufficient_temporal_samples"
  | "temporal_evidence_missing"
  | "incomplete_temporal_presence"
  | "text_unchanged"
  | "geometry_changed"
  | "style_changed"
  | "verified_module_boundary"
  | "geometry_confidence_below_threshold"
  | "one_to_one_conflict";

export interface DynamicFallbackDecision {
  figmaNodeId: string;
  selector: string;
  actualParentSelector?: string;
  result: "accepted" | "rejected";
  reasonCode: DynamicFallbackReasonCode;
  matched: boolean;
}

export interface SemanticAgentModuleState {
  designModuleId: string;
  acceptedBindingCount: number;
  actualParentSelectors: string[];
  dynamicFallback: {
    evaluatedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    decisions: DynamicFallbackDecision[];
  };
}

export interface SemanticAgentMatchingEvidence {
  invoked: boolean;
  responded: boolean;
  acceptedBindingCount: number;
  modules: SemanticAgentModuleState[];
  execution?: {
    status: "recovered" | "failed";
    attempts: Array<{
      round: number;
      durationMs: number;
      code: "success" | "transport_error" | "timeout" | "format_error" | "generation_error";
      causeCode?: string;
    }>;
  };
}

export interface ElementMatchingEvidence {
  visualScope?: { reviewedPixels: number; changedPixels: number; excludedPixels: number; canvasPixels: number };
  designCoverage?: DesignCoverage;
  matches: ElementMatchEvidence[];
  unmatchedDesignCount: number;
  unmatchedActualCount: number;
  diagnostics: string[];
  pageAlignment: PageAlignmentPlan;
  missingModules?: MissingModuleSummary;
  semanticAgent?: SemanticAgentMatchingEvidence;
}

export interface PropertyReviewCheck {
  property: string;
  rule: string;
  selector: string;
  actualBox: Box;
  expected?: string | number;
  actual?: string | number;
  tolerance?: number;
  status: "passed" | "difference" | "pending" | "exempt" | "not-applicable" | "not-run";
  reason: string;
}

export interface DesignCoverage {
  policy: "design-driven" | "actual-driven";
  actualItems?: Array<{
    selector: string; name: string; actualBox: Box;
    status: "unverified" | "covered-by-parent"; reasonCode: string; issueIds: string[]; coveredBy?: string; tileIndex?: number;
  }>;
  captureSamples?: Array<{ index: number; coverage?: ActualCaptureCoverage }>;
  items: Array<{
    figmaNodeId: string;
    parentFigmaNodeId?: string;
    nodeType?: string;
    originalName?: string;
    groupedParentFigmaNodeId?: string;
    name: string;
    designBox?: Box;
    actualBox?: Box;
    checks?: PropertyReviewCheck[];
    displacement?: { x: number; y: number; causeIssueIds: string[]; causeStatus: "verified" | "partial" | "pending"; explainedY: number; unexplainedY: number };
    reviewStatus?: "passed" | "difference" | "pending" | "not-applicable";
    status: "matched" | "missing" | "unverified" | "covered-by-parent" | "structural-only" | "outside-scope";
    reasonCode: "outside-actual-scope" | "verified-binding" | "scope-incomplete" | "correspondence-unresolved" | "static-module-absent" | "parent-finding" | "descendant-bindings";
    selector?: string;
    issueIds: string[];
    coveredBy?: string;
    absenceEvidence?: { staticLabels: string[]; sampleIndexes: number[]; layoutGap?: {
      precedingRegionId: string; followingRegionId: string; missingRegionIds: string[]; affectedRegionIds: string[];
      expectedRemovalPx: number; measuredRemovalPx: number; residualPx: number;
    } };
    tileIndex?: number;
  }>;
}

export interface AgentElementBindingRequest {
  locale: "zh-CN" | "en";
  designRegions?: Array<{
    figmaNodeId: string;
    parentFigmaNodeId?: string;
    designPath: string[];
    box: Box;
    contextTexts: string[];
  }>;
  designCandidates: Array<{
    figmaNodeId: string;
    parentFigmaNodeId?: string;
    ancestorPath?: string[];
    name: string;
    type: string;
    text?: string;
    box: Box;
  }>;
  actualCandidates: Array<{
    fingerprintKey: string;
    selector: string;
    parentSelector?: string;
    contextTexts?: string[];
    tag: string;
    role?: string;
    text?: string;
    box: Box;
  }>;
  regionHints?: Array<{
    designParentFigmaNodeId: string;
    designPath: string[];
    actualParentSelector: string;
    evidence: "exact-id" | "stable-text";
  }>;
  feedback?: {
    rejectedBindings: Array<{
      figmaNodeId: string;
      fingerprintKey: string;
      reason: string;
    }>;
    instruction: string;
  };
}

export interface AgentElementBindingResult {
  pageSummary: string;
  alignmentPlan: {
    regions: AgentPageAlignmentRegionDecision[];
  };
  bindings: Array<{
    figmaNodeId: string;
    fingerprintKey: string;
    confidence: number;
    reason: string;
  }>;
}

export type DynamicRegionKind = "market-value" | "date-time" | "countdown" | "probability";

export type NormalizationStrategy =
  | "normalize-market-value-text"
  | "normalize-date-time-text"
  | "normalize-countdown-text"
  | "normalize-probability-text";

export interface AgentHypothesis {
  candidateType: DynamicRegionKind;
  binding: {
    figmaNodeId: string;
    fingerprintKey: string;
  };
  strategy: NormalizationStrategy;
  normalizedProperties: ["text"];
  reasons: string[];
}

export interface AgentHypothesisRequest {
  locale: "zh-CN" | "en";
  candidate: {
    design: {
      figmaNodeId: string;
      name: string;
      text?: string;
      contextTexts?: string[];
      box: Box;
    };
    actual: {
      fingerprintKey: string;
      selector: string;
      observedTexts: string[];
      contextTexts?: string[];
      box: Box;
    };
    observations: {
      sampleCount: number;
      presentInAllSamples: boolean;
      textChanged: boolean;
      geometryChanged: boolean;
      styleChanged: boolean;
    };
  };
  conflict?: string;
}

export interface AgentHypothesisOutcome {
  figmaNodeId: string;
  fingerprintKey: string;
  status: "verified" | "corrected" | "pending";
  attempts: number;
  hypothesis?: AgentHypothesis;
  reason: string;
}

export interface DynamicRegion {
  kind: DynamicRegionKind;
  strategy: NormalizationStrategy;
  source: "deterministic" | "agent-verified";
  normalizedProperties: ["text"];
  figmaNodeId: string;
  fingerprintKey: string;
  selector: string;
  designBox: Box;
  actualBox: Box;
  sampleCount: number;
  evidenceConfidence: EvidenceConfidence;
}

export interface DynamicNormalizationSummary {
  stableSimilarity: number;
  dynamicRegionAreaRatio: number;
  strategies: NormalizationStrategy[];
  regions: DynamicRegion[];
  agentHypotheses: AgentHypothesisOutcome[];
  geometry?: Array<{
    figmaNodeId: string; selector: string; property: "width"; source: "declared-percentage";
    trackFigmaNodeId: string; trackSelector: string; valueFigmaNodeId: string; valueSelector: string;
    designBox: Box; actualBox: Box; sampleCount: number; reason: string;
  }>;
}

export type MarketSemantic = "market.up" | "market.down" | "market.flat";
export type MarketVariantLabel = MarketSemantic | `variant-${string}`;
export type MarketVariantSignal =
  | "property-name"
  | "color"
  | "icon-direction"
  | "text-sign";

export interface MarketVariantDefinition {
  componentSetId: string;
  variantNodeId: string;
  originalProperties: Record<string, string>;
  originalPropertyValue: string;
  semantic: MarketVariantLabel;
  style: ElementStyle;
  box?: Box;
  icon?: {
    name: string;
    box?: Box;
  };
  evidence: {
    signals: MarketVariantSignal[];
    reasons: string[];
  };
}

export interface MarketVariantMatch {
  figmaNodeId: string;
  selector: string;
  componentSetId: string;
  expectedVariantNodeId: string;
  originalPropertyValue: string;
  semantic: MarketVariantLabel;
  evidence: MarketVariantDefinition["evidence"];
  evidenceConfidence: EvidenceConfidence;
  icon?: {
    expectedName: string;
    expectedBox?: Box;
    actualSelector?: string;
    actualBox?: Box;
  };
}

export interface MarketVariantSummary {
  catalog: MarketVariantDefinition[];
  matches: MarketVariantMatch[];
  unresolved: Array<{
    figmaNodeId: string;
    selector: string;
    actualSemantic: MarketSemantic;
    reason: string;
    evidenceConfidence: EvidenceConfidence;
  }>;
}

export interface MarketListColumnEvidence {
  index: number;
  figmaNodeId: string;
  name: string;
  expectedWidth: number;
  actualWidth: number;
  expectedAlignment?: string;
  actualAlignment?: string;
}

export interface MarketListMatch {
  kind?: "news";
  figmaNodeId: string;
  selector: string;
  header: {
    figmaNodeId: string;
    selector?: string;
    expectedHeight: number;
    actualHeight?: number;
  };
  rowTemplate: {
    figmaNodeId: string;
    expectedHeight: number;
    actualHeight: number;
    expectedGap: number;
    actualGap: number;
    expectedDividerWidth?: number;
    actualDividerWidth?: number;
    expectedDividerColor?: string;
    actualDividerColor?: string;
  };
  columns: MarketListColumnEvidence[];
  expectedColumnCount: number;
  actualColumnCount: number;
  rowSelectors: string[];
  actualRowCount: number;
  evidenceConfidence: EvidenceConfidence;
}

export interface MarketListSummary {
  matches: MarketListMatch[];
  unresolved: Array<{
    figmaNodeId: string;
    selector?: string;
    reason: string;
    evidenceConfidence: EvidenceConfidence;
  }>;
}

export interface AcceptanceConfig {
  viewport: "auto" | { width: number; height: number };
  thresholds: {
    visualSimilarityMin: number;
    pixelThreshold: number;
    positionTolerancePx: number;
    sizeTolerancePx: number;
    fontSizeTolerancePx: number;
    colorDeltaE: number;
    matchConfidenceMin: number;
    highConfidenceMin: number;
  };
  rules: Record<string, Severity | "ignore">;
  pageAlignment: {
    confidence: {
      weights: PageAlignmentConfidenceWeights;
      levels: PageAlignmentConfidenceLevels;
    };
    missingModule: {
      minimumHorizontalOverlapRatio: number;
      maximumResidualRatio: number;
    };
  };
  ignore: string[];
  capture: {
    timeoutMs: number;
    settleMs: number;
    samples: number;
    sampleIntervalMs: number;
    waitForSelector?: string;
  };
}

export interface Issue {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  summary: string;
  expected?: string;
  actual?: string;
  suggestion: string;
  selector?: string;
  figmaNodeId?: string;
  actualElementFingerprint?: string;
  dynamicStrategy?: NormalizationStrategy;
  evidenceConfidence: EvidenceConfidence;
  designBox?: Box;
  actualBox?: Box;
  box?: Box;
  rule: string;
}

export type ReviewPriority = "P0" | "P1" | "P2" | "Pending";

export interface ReviewIssueEvidence {
  severity?: Severity;
  sourceIssueId: string;
  rule: string;
  category: string;
  summary: string;
  expected?: string;
  actual?: string;
  designBox?: Box;
  actualBox?: Box;
  box?: Box;
  evidenceConfidence: EvidenceConfidence;
}

export interface ReviewIssue extends Issue {
  coverageModule?: { id: string; name: string; nodeIds: string[] };
  priority: ReviewPriority;
  location: {
    selector?: string;
    figmaNodeId?: string;
    designBox?: Box;
    actualBox?: Box;
    box?: Box;
    description: string;
    longScreenshot?: {
      tileIndex: number;
      scrollY: number;
      absoluteBox?: Box;
    };
  };
  primaryAction: string;
  evidence: ReviewIssueEvidence[];
}

export type ReviewVerdict = "passed" | "failed" | "needs_review";

/** Stable target supplied by a caller; historical prose/coordinates are not proof. */
export interface IssueRecheckTarget {
  issueId: string | number;
  rule: string;
  figmaNodeId: string;
  property?: string;
  selector?: string;
}

export interface IssueRecheckResult extends IssueRecheckTarget {
  verdict: ReviewVerdict;
  reasonCode: string;
  message: string;
  checks: PropertyReviewCheck[];
  evidenceRefs: string[];
  evidence: ReviewIssue[];
  coverage?: Pick<DesignCoverage["items"][number], "figmaNodeId" | "status" | "reasonCode" | "selector">;
  designBox?: Box;
  actualBox?: Box;
}

export interface ReviewPageResult {
  recheck?: IssueRecheckResult;
  clientPageId: string;
  pageName: string;
  executionStatus: "succeeded" | "failed";
  verdict?: ReviewVerdict;
  report?: CompareReport;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface BatchReviewResult {
  reviewName: string;
  executionStatus: "succeeded" | "failed";
  verdict?: ReviewVerdict;
  summary: {
    totalPages: number;
    completedPages: number;
    executionFailedPages: number;
    passedPages: number;
    failedPages: number;
    needsReviewPages: number;
    issues: {
      p0: number;
      p1: number;
      p2: number;
      pending: number;
    };
  };
  pages: ReviewPageResult[];
  excel: ExcelArtifact;
}

export interface ExcelArtifact {
  kind: "excel";
  filename: string;
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  buffer: Buffer;
}

export type AiAdviceEvidenceRef =
  | `review-issue:${string}`
  | `page-alignment:${string}`;

export interface AiAdvice {
  model?: string;
  summary: string;
  summaryEvidenceRefs: AiAdviceEvidenceRef[];
  priorities: Array<{
    title: string;
    reason: string;
    action: string;
    evidenceRefs: AiAdviceEvidenceRef[];
  }>;
}

export type AiAdviceRejectionCode =
  | "ai_timeout"
  | "ai_format_error"
  | "ai_generation_failed"
  | "evidence_integrity_failed";

export interface AiAdviceRejection {
  code: AiAdviceRejectionCode;
  message: string;
  danglingRefs: AiAdviceEvidenceRef[];
  locations: Array<{
    scope: "summary" | "priority";
    priorityNumber?: number;
    reason: "missing" | "unresolved";
    refs: AiAdviceEvidenceRef[];
  }>;
}

export interface CompareReport {
  phaseTimings?: { preparationMs: number; comparisonMs: number; adviceMs: number };
  id: string;
  createdAt: string;
  durationMs: number;
  status: ReviewVerdict;
  evidenceMode: "live" | "screenshot" | "hybrid" | "long_screenshot";
  longScreenshot?: {
    tiles: Array<{ index: number; scrollY: number; contentHeight: number }>;
    stickyRegions: LongScreenshotActualEvidence["stickyRegions"];
    anomalies: LongScreenshotAnomaly[];
    evidenceConfidence: EvidenceConfidence;
    effectiveMode?: "screenshot" | "hybrid";
    hybridTileCount?: number;
    tileAlignments?: Array<{
      tileIndex: number;
      effectiveMode: "screenshot" | "hybrid";
      alignment: HybridAlignment;
    }>;
  };
  alignment?: HybridAlignment;
  summary: {
    errors: number;
    warnings: number;
    pending: number;
    similarity: number;
    stableSimilarity: number;
    dynamicRegionAreaRatio: number;
    matchedElements: number;
    unmatchedDesignElements: number;
    unmatchedActualElements: number;
  };
  dynamicNormalization: DynamicNormalizationSummary;
  marketVariants: MarketVariantSummary;
  marketLists: MarketListSummary;
  matching: ElementMatchingEvidence;
  viewport: { width: number; height: number };
  source: {
    design: string;
    actual: string;
  };
  images: {
    reference: string;
    actual: string;
    diff: string;
  };
  issues: ReviewIssue[];
  rules: AcceptanceConfig;
  diagnostics: string[];
  aiAdvice?: AiAdvice;
  aiAdviceRejection?: AiAdviceRejection;
  artifacts?: {
    xlsx?: {
      filename: string;
      contentType: ExcelArtifact["contentType"];
      sizeBytes: number;
      downloadUrl: string;
    };
    zip?: {
      filename: string;
      contentType: "application/zip";
      sizeBytes?: number;
      downloadUrl: string;
    };
  };
  markdown: string;
  reportHtml: string;
}

export interface CompareError {
  error: string;
  details?: string;
}
