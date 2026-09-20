import { reviewVerdict } from "../src/review-verdict";
import type { IssueRecheckTarget, IssueRecheckResult } from "../src/types";
import type {
  AcceptanceConfig,
  ActualEvidence,
  AgentHypothesisRequest,
  AgentElementBindingRequest,
  AgentElementBindingResult,
  AiAdvice,
  AiAdviceRejection,
  BatchReviewResult,
  CompareReport,
  DesignTruth,
  DesignTruthNode,
  LiveActualEvidence,
  ReviewPageResult,
  ReviewVerdict,
  ScreenshotActualEvidence
} from "../src/types";
import { generateAiAdvice, generateDynamicHypothesis, generateElementBindings, PartialAiAdviceError } from "./ai";
import {
  captureLiveActualEvidence,
  captureLiveActualEvidenceAtScrollOffsets,
  type BrowserCaptureCredential,
  type ScrolledLiveActualEvidence
} from "./capture";
import {
  compareDesignToPage,
  type CompareOptions,
  type ComparisonResult
} from "./compare";
import { parseAcceptanceYaml } from "./default-rules";
import { createDemoSources } from "./demo";
import { buildDesignTruthFromFigma } from "./design";
import { localText, type Locale } from "./i18n";
import { createReport } from "./report";
import {
  buildScreenshotActualEvidence,
  type ScreenshotActualEvidenceInput,
  type ScreenshotSource
} from "./screenshot";
import { buildHybridActualEvidence } from "./hybrid";
import { buildExcelReportArtifact } from "./excel-report";
import {
  aggregateLongScreenshotComparisons,
  buildLongScreenshotActualEvidence,
  designTruthForLongScreenshotTile,
  type LongScreenshotSource
} from "./long-screenshot";

export type PagePairDesignInput =
  {
    kind: "figma";
    frameUrl: string;
    accessToken?: string;
  };

export interface AiReviewOptions {
  requested?: boolean;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
}

export interface ReviewPagePairInput {
  locale: Locale;
  rulesYaml?: string;
  design?: PagePairDesignInput;
  h5Url: string;
  validateNavigationUrl?: (url: string) => Promise<void>;
  browserCredential?: BrowserCaptureCredential;
  ai?: AiReviewOptions;
}

export interface ReviewScreenshotPagePairInput {
  locale: Locale;
  rulesYaml?: string;
  design?: PagePairDesignInput;
  screenshots: ScreenshotSource[];
  ai?: AiReviewOptions;
}

export interface ReviewHybridPagePairInput extends ReviewScreenshotPagePairInput {
  h5Url: string;
  validateNavigationUrl?: (url: string) => Promise<void>;
  browserCredential?: BrowserCaptureCredential;
}

export interface ReviewLongScreenshotPagePairInput {
  locale: Locale;
  rulesYaml?: string;
  design?: PagePairDesignInput;
  screenshot: LongScreenshotSource;
  h5Url?: string;
  validateNavigationUrl?: (url: string) => Promise<void>;
  browserCredential?: BrowserCaptureCredential;
  ai?: AiReviewOptions;
}

export interface ReviewDemoInput {
  locale: Locale;
  rulesYaml?: string;
  baseUrl: string;
  ai?: AiReviewOptions;
}

export type ReviewBatchPagePairInput = {
  recheck?: IssueRecheckTarget;
  clientPageId: string;
  pageName: string;
  design?: PagePairDesignInput;
  rulesYaml?: string;
  ai?: AiReviewOptions;
} & (
  | { actual: { kind: "live"; url: string; validateNavigationUrl?: (url: string) => Promise<void>; browserCredential?: BrowserCaptureCredential } }
  | { actual: { kind: "screenshot"; screenshots: ScreenshotSource[] } }
  | { actual: { kind: "long_screenshot"; screenshot: LongScreenshotSource; url?: string; validateNavigationUrl?: (url: string) => Promise<void>; browserCredential?: BrowserCaptureCredential } }
  | { actual: { kind: "hybrid"; url: string; screenshots: ScreenshotSource[]; validateNavigationUrl?: (url: string) => Promise<void>; browserCredential?: BrowserCaptureCredential } }
);

export interface ReviewPagePairsInput {
  reviewName: string;
  locale: Locale;
  rulesYaml?: string;
  ai?: AiReviewOptions;
  pagePairs: ReviewBatchPagePairInput[];
}

export interface ReviewBatchExecutionOptions {
  maxConcurrency?: number;
  signal?: AbortSignal;
  onPageUpdate?: (update: {
    clientPageId: string;
    status: "running" | "succeeded" | "failed";
    stage: "review" | "complete";
    verdict?: ReviewVerdict;
    error?: { code: string; message: string; retryable: boolean };
  }) => void;
}

interface ReviewDependencies {
  captureLiveActualEvidence: (
    url: string,
    viewport: { width: number; height: number },
    config: AcceptanceConfig,
    locale: Locale,
    dependencies?: { validateUrl?: (url: string) => Promise<void>; browserCredential?: BrowserCaptureCredential }
  ) => Promise<LiveActualEvidence>;
  captureLiveActualEvidenceAtScrollOffsets: (
    url: string,
    viewport: { width: number; height: number },
    scrollYs: number[],
    config: AcceptanceConfig,
    locale: Locale,
    dependencies?: { validateUrl?: (url: string) => Promise<void>; browserCredential?: BrowserCaptureCredential }
  ) => Promise<ScrolledLiveActualEvidence[]>;
  compareDesignToPage: (
    design: DesignTruth,
    evidence: ActualEvidence,
    config: AcceptanceConfig,
    locale: Locale,
    options?: CompareOptions
  ) => Promise<ComparisonResult>;
  createDemoSources: typeof createDemoSources;
  createReport: typeof createReport;
  buildDesignTruthFromFigma: typeof buildDesignTruthFromFigma;
  parseAcceptanceYaml: typeof parseAcceptanceYaml;
  generateAiAdvice: typeof generateAiAdvice;
  generateDynamicHypothesis: typeof generateDynamicHypothesis;
  generateElementBindings: typeof generateElementBindings;
  buildScreenshotActualEvidence: (
    input: ScreenshotActualEvidenceInput
  ) => Promise<ScreenshotActualEvidence>;
  buildHybridActualEvidence: typeof buildHybridActualEvidence;
  buildLongScreenshotActualEvidence: typeof buildLongScreenshotActualEvidence;
  aggregateLongScreenshotComparisons: typeof aggregateLongScreenshotComparisons;
  buildExcelReportArtifact: typeof buildExcelReportArtifact;
}

export interface ReviewServiceOptions {
  dependencies?: Partial<ReviewDependencies>;
  environment?: {
    FIGMA_TOKEN?: string;
    OPENAI_API_KEY?: string;
    OPENAI_BASE_URL?: string;
  };
  now?: () => number;
}

interface AiAdviceOutcome {
  advice?: AiAdvice;
  rejection?: AiAdviceRejection;
}

function classifyAiAdviceRejection(error: unknown): AiAdviceRejection["code"] {
  const message = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "";
  if (
    errorName === "TimeoutError" ||
    errorName === "AbortError" ||
    /(?:time[ -]?out|timed out|超时)/i.test(message)
  ) {
    return "ai_timeout";
  }
  if (
    error instanceof SyntaxError ||
    /^(?:AI advice|Every AI advice)/i.test(message) ||
    /(?:Unexpected token|invalid JSON|no readable (?:advice )?content|格式|未返回可读取)/i.test(message)
  ) {
    return "ai_format_error";
  }
  return "ai_generation_failed";
}

const defaultDependencies: ReviewDependencies = {
  captureLiveActualEvidence,
  captureLiveActualEvidenceAtScrollOffsets,
  compareDesignToPage,
  createDemoSources,
  createReport,
  buildDesignTruthFromFigma,
  parseAcceptanceYaml,
  generateAiAdvice,
  generateDynamicHypothesis,
  generateElementBindings,
  buildScreenshotActualEvidence,
  buildHybridActualEvidence,
  buildLongScreenshotActualEvidence,
  aggregateLongScreenshotComparisons,
  buildExcelReportArtifact
};

function scaleNode(node: DesignTruthNode, scaleX: number, scaleY: number): DesignTruthNode {
  const scaleBox = (box: DesignTruthNode["box"]): DesignTruthNode["box"] => box && ({
    x: box.x * scaleX,
    y: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY
  });
  return {
    ...node,
    box: scaleBox(node.box),
    relativeBox: scaleBox(node.relativeBox),
    children: node.children.map((child) => scaleNode(child, scaleX, scaleY))
  };
}

function scaledDesign(design: DesignTruth, config: AcceptanceConfig, locale: Locale): DesignTruth {
  if (config.viewport === "auto") return design;

  const scaleX = config.viewport.width / design.render.viewport.width;
  const scaleY = config.viewport.height / design.render.viewport.height;

  return {
    ...design,
    render: { ...design.render, viewport: config.viewport },
    root: scaleNode(design.root, scaleX, scaleY),
    diagnostics: [
      ...design.diagnostics,
      localText(
        locale,
        `规则覆盖视口为 ${config.viewport.width} × ${config.viewport.height}。`,
        `The rules override the viewport to ${config.viewport.width} × ${config.viewport.height}.`
      )
    ]
  };
}

export class ReviewService {
  private readonly dependencies: ReviewDependencies;
  private readonly environment: ReviewServiceOptions["environment"];
  private readonly now: () => number;

  constructor(options: ReviewServiceOptions = {}) {
    this.dependencies = { ...defaultDependencies, ...options.dependencies };
    this.environment = options.environment ?? process.env;
    this.now = options.now ?? Date.now;
  }

  async reviewPagePair(input: ReviewPagePairInput): Promise<CompareReport> {
    const startedAt = this.now();
    const config = this.dependencies.parseAcceptanceYaml(input.rulesYaml);
    const designInput = input.design;

    if (!designInput) {
      throw new Error(
        localText(
          input.locale,
          "请提供 Figma Frame 设计来源。",
          "Provide a Figma Frame design source."
        )
      );
    }

    const accessToken = designInput.accessToken?.trim() || this.environment?.FIGMA_TOKEN || "";
    let design: DesignTruth = await this.dependencies.buildDesignTruthFromFigma({
      frameUrl: designInput.frameUrl.trim(),
      accessToken,
      locale: input.locale
    });

    design = scaledDesign(design, config, input.locale);
    const h5Url = input.h5Url.trim();
    if (!h5Url) {
      throw new Error(localText(input.locale, "请输入 H5 页面地址。", "Enter the H5 page URL."));
    }
    const evidence = await this.dependencies.captureLiveActualEvidence(
      h5Url,
      design.render.viewport,
      config,
      input.locale,
      { validateUrl: input.validateNavigationUrl, browserCredential: input.browserCredential }
    );

    return this.completeReview({
      locale: input.locale,
      config,
      design,
      evidence,
      startedAt,
      ai: input.ai
    });
  }

  async reviewPagePairs(
    input: ReviewPagePairsInput,
    options: ReviewBatchExecutionOptions = {}
  ): Promise<BatchReviewResult> {
    const pages: ReviewPageResult[] = new Array(input.pagePairs.length);
    let nextIndex = 0;
    const runPage = async (index: number): Promise<void> => {
      const pagePair = input.pagePairs[index];
      options.onPageUpdate?.({
        clientPageId: pagePair.clientPageId,
        status: "running",
        stage: "review"
      });
      try {
        if (options.signal?.aborted) throw new Error("Review was cancelled.");
        const common = {
          locale: input.locale,
          rulesYaml: pagePair.rulesYaml ?? input.rulesYaml,
          design: pagePair.design,
          ai: pagePair.ai ?? input.ai
        };
        const report = pagePair.actual.kind === "live"
          ? await this.reviewPagePair({
              ...common,
              h5Url: pagePair.actual.url,
              validateNavigationUrl: pagePair.actual.validateNavigationUrl,
              browserCredential: pagePair.actual.browserCredential
            })
          : pagePair.actual.kind === "screenshot"
            ? await this.reviewScreenshotPagePair({ ...common, screenshots: pagePair.actual.screenshots })
            : pagePair.actual.kind === "long_screenshot"
              ? await this.reviewLongScreenshotPagePair({
                  ...common,
                  screenshot: pagePair.actual.screenshot,
                  h5Url: pagePair.actual.url,
                  validateNavigationUrl: pagePair.actual.validateNavigationUrl,
                  browserCredential: pagePair.actual.browserCredential
                })
              : await this.reviewHybridPagePair({
                ...common,
                h5Url: pagePair.actual.url,
                screenshots: pagePair.actual.screenshots,
                validateNavigationUrl: pagePair.actual.validateNavigationUrl,
                browserCredential: pagePair.actual.browserCredential
                });
        const recheck = pagePair.recheck ? this.recheckIssue(report, pagePair.recheck) : undefined;
        const page: ReviewPageResult = {
          clientPageId: pagePair.clientPageId,
          pageName: pagePair.pageName,
          executionStatus: "succeeded" as const,
          verdict: recheck?.verdict ?? reviewVerdict(report),
          ...(recheck ? { recheck } : {}),
          report
        };
        pages[index] = page;
        options.onPageUpdate?.({
          clientPageId: page.clientPageId,
          status: "succeeded",
          stage: "complete",
          verdict: page.verdict
        });
      } catch (error) {
        const page: ReviewPageResult = {
          clientPageId: pagePair.clientPageId,
          pageName: pagePair.pageName,
          executionStatus: "failed" as const,
          ...(pagePair.recheck ? { recheck: { ...pagePair.recheck, verdict: "needs_review" as const,
            reasonCode: "EXECUTION_FAILED", message: "The review could not produce target evidence.", checks: [], evidenceRefs: [], evidence: [] } } : {}),
          error: {
            code: "PAGE_REVIEW_FAILED",
            message: error instanceof Error ? error.message : String(error),
            retryable: true
          }
        };
        pages[index] = page;
        options.onPageUpdate?.({
          clientPageId: page.clientPageId,
          status: "failed",
          stage: "complete",
          error: page.error
        });
      }
    };
    const requestedConcurrency = Math.floor(options.maxConcurrency ?? (input.pagePairs.length || 1));
    const concurrency = Math.max(1, Math.min(input.pagePairs.length || 1, requestedConcurrency));
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (nextIndex < input.pagePairs.length) {
        const index = nextIndex;
        nextIndex += 1;
        await runPage(index);
      }
    }));
    const executionFailedPages = pages.filter((page) => page.executionStatus === "failed").length;
    const passedPages = pages.filter((page) => page.verdict === "passed").length;
    const failedPages = pages.filter((page) => page.verdict === "failed").length;
    const needsReviewPages = pages.filter((page) => page.verdict === "needs_review").length;
    const succeededPages = pages.filter((page) => page.report);
    const verdict = failedPages > 0
      ? "failed" as const
      : needsReviewPages > 0
        ? "needs_review" as const
        : succeededPages.length > 0
          ? "passed" as const
          : undefined;
    const excel = await this.dependencies.buildExcelReportArtifact({
      reviewName: input.reviewName,
      locale: input.locale,
      pages
    });
    return {
      reviewName: input.reviewName,
      executionStatus: executionFailedPages > 0 ? "failed" : "succeeded",
      ...(verdict ? { verdict } : {}),
      summary: {
        totalPages: pages.length,
        completedPages: pages.length,
        executionFailedPages,
        passedPages,
        failedPages,
        needsReviewPages,
        issues: {
          p0: succeededPages.filter(page => !page.recheck).flatMap((page) => page.report!.issues).filter((issue) => issue.priority === "P0").length,
          p1: succeededPages.filter(page => !page.recheck).flatMap((page) => page.report!.issues).filter((issue) => issue.priority === "P1").length + succeededPages.filter(page => page.recheck?.verdict === "failed").length,
          p2: succeededPages.filter(page => !page.recheck).flatMap((page) => page.report!.issues).filter((issue) => issue.priority === "P2").length,
          pending: succeededPages.filter(page => !page.recheck).flatMap((page) => page.report!.issues).filter((issue) => issue.priority === "Pending").length + succeededPages.filter(page => page.recheck?.verdict === "needs_review").length
        }
      },
      pages,
      excel
    };
  }

  private recheckIssue(report: CompareReport, target: IssueRecheckTarget): IssueRecheckResult {
    const items = report.matching.designCoverage?.items.filter(item => item.figmaNodeId === target.figmaNodeId) ?? [];
    const item = items.length === 1 ? items[0] : undefined;
    const checks = item?.checks?.filter(check => check.rule === target.rule && (!target.property || check.property === target.property)) ?? [];
    const result: IssueRecheckResult = { ...target, verdict: "needs_review", reasonCode: "TARGET_NOT_VERIFIED",
      message: "The target correspondence could not be verified in the current evidence.", checks: [], evidenceRefs: [], evidence: [],
      ...(item ? { coverage: { figmaNodeId: item.figmaNodeId, status: item.status, reasonCode: item.reasonCode, selector: item.selector } } : {}),
      ...(item?.designBox ? { designBox: item.designBox } : {}) };
    if (item && target.rule === "missing_module" && !target.property) {
      const absent = report.issues.filter(issue => issue.rule === "missing_module" && issue.severity === "error" &&
        (issue.figmaNodeId === target.figmaNodeId || item.issueIds.includes(issue.id) || item.coveredBy === issue.id));
      if (absent.length) return { ...result, verdict: "failed", reasonCode: "VERIFIED_ABSENT",
        message: "Current deterministic evidence confirms the target is still absent.", evidence: absent, evidenceRefs: absent.map(issue => `review-issue:${issue.id}`) };
    }
    if (!item || item.status !== "matched") return result;
    result.actualBox = item.actualBox;
    result.selector = item.selector;
    if (target.rule === "missing_module" && !target.property) {
      return { ...result, verdict: "passed", reasonCode: "VERIFIED_PRESENT", message: "The design target has a verified counterpart in the current evidence.",
        evidenceRefs: [`design-coverage:${item.figmaNodeId}`] };
    }
    result.checks = checks;
    if (!checks.length || checks.every(check => check.status === "not-applicable")) {
      return { ...result, reasonCode: "RULE_NOT_VERIFIED", message: "No applicable measurement exists for the requested rule/property." };
    }
    if (checks.some(check => check.status === "difference")) {
      const evidence = report.issues.filter(issue => issue.figmaNodeId === target.figmaNodeId && issue.rule === target.rule);
      return { ...result, verdict: "failed", reasonCode: "DIFFERENCE_REMAINS", message: "Current measurements still differ from the design.",
        evidence, evidenceRefs: evidence.map(issue => `review-issue:${issue.id}`) };
    }
    if (checks.some(check => !["passed", "not-applicable"].includes(check.status))) {
      return { ...result, reasonCode: "EVIDENCE_INSUFFICIENT", message: "The requested checks include unverified, disabled or exempt measurements." };
    }
    return { ...result, verdict: "passed", reasonCode: "VERIFIED_FIXED", message: "The target was verified and all applicable requested measurements passed." };
  }

  async reviewScreenshotPagePair(input: ReviewScreenshotPagePairInput): Promise<CompareReport> {
    const startedAt = this.now();
    const config = this.dependencies.parseAcceptanceYaml(input.rulesYaml);
    let design = await this.buildFigmaDesign(input.design, input.locale);
    design = scaledDesign(design, config, input.locale);
    const evidence = await this.dependencies.buildScreenshotActualEvidence({
      screenshots: input.screenshots,
      targetViewport: design.render.viewport,
      pixelThreshold: config.thresholds.pixelThreshold,
      locale: input.locale
    });
    return this.completeReview({
      locale: input.locale,
      config,
      design,
      evidence,
      startedAt,
      ai: input.ai
    });
  }

  async reviewHybridPagePair(input: ReviewHybridPagePairInput): Promise<CompareReport> {
    const startedAt = this.now();
    const config = this.dependencies.parseAcceptanceYaml(input.rulesYaml);
    let design = await this.buildFigmaDesign(input.design, input.locale);
    design = scaledDesign(design, config, input.locale);
    const firstScreenshot = input.screenshots[0];
    if (!firstScreenshot) {
      throw new Error(localText(input.locale, "Hybrid 模式至少需要一张实际截图。", "Hybrid mode requires at least one actual screenshot."));
    }
    const h5Url = input.h5Url.trim();
    if (!h5Url) {
      throw new Error(localText(input.locale, "Hybrid 模式需要 H5 页面地址。", "Hybrid mode requires an H5 page URL."));
    }
    const [screenshot, live] = await Promise.all([
      this.dependencies.buildScreenshotActualEvidence({
        screenshots: input.screenshots,
        targetViewport: design.render.viewport,
        pixelThreshold: config.thresholds.pixelThreshold,
        locale: input.locale
      }),
      this.dependencies.captureLiveActualEvidence(
        h5Url,
        firstScreenshot.device.viewport,
        config,
        input.locale,
        { validateUrl: input.validateNavigationUrl, browserCredential: input.browserCredential }
      )
    ]);
    const evidence = this.dependencies.buildHybridActualEvidence({
      screenshot,
      live,
      locale: input.locale
    });
    return this.completeReview({
      locale: input.locale,
      config,
      design,
      evidence,
      startedAt,
      ai: input.ai
    });
  }

  async reviewLongScreenshotPagePair(input: ReviewLongScreenshotPagePairInput): Promise<CompareReport> {
    const startedAt = this.now();
    const config = this.dependencies.parseAcceptanceYaml(input.rulesYaml);
    const design = await this.buildFigmaDesign(input.design, input.locale);
    if (
      config.viewport !== "auto" &&
      (config.viewport.width !== input.screenshot.device.viewport.width ||
        config.viewport.height !== input.screenshot.device.viewport.height)
    ) {
      throw new Error(localText(
        input.locale,
        "长截图设备 viewport 与规则指定 viewport 不一致。",
        "The long-screenshot device viewport does not match the configured viewport."
      ));
    }
    const evidence = await this.dependencies.buildLongScreenshotActualEvidence({
      design,
      screenshot: input.screenshot,
      locale: input.locale
    });
    const h5Url = input.h5Url?.trim();
    const liveTiles = h5Url
      ? await this.dependencies.captureLiveActualEvidenceAtScrollOffsets(
          h5Url,
          evidence.viewport,
          evidence.tiles.map((tile) => tile.scrollY),
          config,
          input.locale,
          { validateUrl: input.validateNavigationUrl, browserCredential: input.browserCredential }
        )
      : [];
    const liveByScrollY = new Map(liveTiles.map((item) => [item.scrollY, item.evidence]));
    const comparisons = [];
    const tileAlignments: NonNullable<CompareReport["longScreenshot"]>["tileAlignments"] = [];
    const liveTileDiagnostics: string[] = [];
    for (const tile of evidence.tiles) {
      const tileDesign = designTruthForLongScreenshotTile(design, evidence, tile.index);
      const tileEvidence = await this.dependencies.buildScreenshotActualEvidence({
        screenshots: [{
          name: `${input.screenshot.name}#tile-${tile.index}`,
          image: tile.actualImage,
          device: {
            ...input.screenshot.device,
            dpr: 1,
            viewport: tile.viewport
          },
          anchors: tile.anchors
        }],
        targetViewport: tile.viewport,
        pixelThreshold: config.thresholds.pixelThreshold,
        locale: input.locale
      });
      const live = liveByScrollY.get(tile.scrollY);
      const usableLive = live && live.samples.every((sample) => !sample.scroll || (
        sample.scroll.target !== "unresolved" &&
        Math.abs(sample.scroll.requestedY - tile.scrollY) <= 1 &&
        Math.abs(sample.scroll.actualY - tile.scrollY) <= 1
      )) ? live : undefined;
      if (live && !usableLive) {
        liveTileDiagnostics.push(localText(
          input.locale,
          `Live 证据未到达滚动位置 ${tile.scrollY}px，该分片已降级为 Screenshot。`,
          `Live evidence did not reach scroll offset ${tile.scrollY}px; this tile was downgraded to Screenshot.`
        ));
      }
      const tileActual: ActualEvidence = usableLive
        ? this.dependencies.buildHybridActualEvidence({ screenshot: tileEvidence, live: usableLive, locale: input.locale })
        : tileEvidence;
      if (tileActual.kind === "hybrid") {
        tileAlignments.push({
          tileIndex: tile.index,
          effectiveMode: tileActual.effectiveMode,
          alignment: tileActual.alignment
        });
      }
      comparisons.push(await this.dependencies.compareDesignToPage(
        tileDesign,
        tileActual,
        config,
        input.locale,
        {
          dynamicHypothesisAgent: this.dynamicHypothesisAgent(input.ai),
          elementBindingAgent: this.elementBindingAgent(input.ai)
        }
      ));
    }
    const aggregated = await this.dependencies.aggregateLongScreenshotComparisons({
      evidence,
      comparisons,
      locale: input.locale
    });
    const diagnostics = [
      ...design.diagnostics,
      ...evidence.diagnostics,
      ...liveTiles.flatMap((item) => item.evidence.diagnostics),
      ...liveTileDiagnostics
    ];
    const aiAdvice = await this.maybeGenerateAiAdvice({
      options: input.ai,
      comparison: aggregated.comparison,
      diagnostics,
      locale: input.locale
    });
    const report = this.dependencies.createReport({
      locale: input.locale,
      comparison: aggregated.comparison,
      source: {
        design: design.source.kind === "figma"
          ? `Figma · ${design.source.fileName ?? design.source.fileKey} · ${design.source.frameId}`
          : design.source.name,
        actual: h5Url
          ? `Long Screenshot · ${input.screenshot.name} + H5 · ${liveTiles[0]?.evidence.finalUrl ?? h5Url}`
          : `Long Screenshot · ${input.screenshot.name}`
      },
      evidenceMode: "long_screenshot",
      viewport: { width: evidence.fullPage.width, height: evidence.fullPage.height },
      rules: config,
      diagnostics,
      durationMs: this.now() - startedAt,
      aiAdvice: aiAdvice.advice,
      aiAdviceRejection: aiAdvice.rejection
    });
    const hybridTileCount = tileAlignments.filter((item) => item.effectiveMode === "hybrid").length;
    report.longScreenshot = {
      ...aggregated.metadata,
      effectiveMode: hybridTileCount > 0 ? "hybrid" : "screenshot",
      hybridTileCount,
      ...(tileAlignments.length ? { tileAlignments } : {})
    };
    return report;
  }

  async reviewDemo(input: ReviewDemoInput): Promise<CompareReport> {
    const startedAt = this.now();
    const config = this.dependencies.parseAcceptanceYaml(input.rulesYaml);
    const { design, actual } = await this.dependencies.createDemoSources(
      input.baseUrl,
      config,
      input.locale
    );

    return this.completeReview({
      locale: input.locale,
      config,
      design,
      evidence: actual,
      startedAt,
      ai: input.ai
    });
  }

  private async completeReview(input: {
    locale: Locale;
    config: AcceptanceConfig;
    design: DesignTruth;
    evidence: ActualEvidence;
    startedAt: number;
    ai?: AiReviewOptions;
  }): Promise<CompareReport> {
    const comparison = await this.dependencies.compareDesignToPage(
      input.design,
      input.evidence,
      input.config,
      input.locale,
      {
        dynamicHypothesisAgent: this.dynamicHypothesisAgent(input.ai),
        elementBindingAgent: this.elementBindingAgent(input.ai)
      }
    );
    const diagnostics = [...input.design.diagnostics, ...input.evidence.diagnostics];
    const aiAdvice = await this.maybeGenerateAiAdvice({
      options: input.ai,
      comparison,
      diagnostics,
      locale: input.locale
    });

    return this.dependencies.createReport({
      locale: input.locale,
      comparison,
      source: {
        design: input.design.source.kind === "figma"
          ? `Figma · ${input.design.source.fileName ?? input.design.source.fileKey} · ${input.design.source.frameId}`
          : input.design.source.name,
        actual: input.evidence.kind === "live"
          ? input.evidence.finalUrl
          : input.evidence.kind === "screenshot"
            ? `Screenshot · ${input.evidence.samples.map((sample) => sample.metadata.name).join(", ")}`
            : `Screenshot · ${input.evidence.screenshot.samples.map((sample) => sample.metadata.name).join(", ")} + H5 · ${input.evidence.live.finalUrl}`
      },
      evidenceMode: input.evidence.kind === "hybrid" ? input.evidence.effectiveMode : input.evidence.kind,
      viewport: input.design.render.viewport,
      rules: input.config,
      diagnostics,
      durationMs: this.now() - input.startedAt,
      aiAdvice: aiAdvice.advice,
      aiAdviceRejection: aiAdvice.rejection
    });
  }

  private async buildFigmaDesign(
    designInput: PagePairDesignInput | undefined,
    locale: Locale
  ): Promise<DesignTruth> {
    if (!designInput) {
      throw new Error(localText(locale, "请提供 Figma Frame 设计来源。", "Provide a Figma Frame design source."));
    }
    const accessToken = designInput.accessToken?.trim() || this.environment?.FIGMA_TOKEN || "";
    return this.dependencies.buildDesignTruthFromFigma({
      frameUrl: designInput.frameUrl.trim(),
      accessToken,
      locale
    });
  }

  private dynamicHypothesisAgent(
    options?: AiReviewOptions
  ): ((request: AgentHypothesisRequest) => Promise<unknown>) | undefined {
    if (!options?.requested) return undefined;
    const apiKey = options.apiKey?.trim() || this.environment?.OPENAI_API_KEY;
    const apiUrl = options.apiUrl?.trim() || this.environment?.OPENAI_BASE_URL;
    if (!apiKey && !apiUrl) return undefined;
    return (request) => this.dependencies.generateDynamicHypothesis({
      apiKey,
      apiUrl,
      model: options.model,
      request
    });
  }

  private elementBindingAgent(
    options?: AiReviewOptions
  ): ((input: {
    request: AgentElementBindingRequest;
    referenceImage: Buffer;
    actualImage: Buffer;
  }) => Promise<AgentElementBindingResult>) | undefined {
    if (!options?.requested) return undefined;
    const apiKey = options.apiKey?.trim() || this.environment?.OPENAI_API_KEY;
    const apiUrl = options.apiUrl?.trim() || this.environment?.OPENAI_BASE_URL;
    if (!apiKey && !apiUrl) return undefined;
    return (input) => this.dependencies.generateElementBindings({
      apiKey,
      apiUrl,
      model: options.model,
      ...input
    });
  }

  private async maybeGenerateAiAdvice(input: {
    options?: AiReviewOptions;
    comparison: ComparisonResult;
    diagnostics: string[];
    locale: Locale;
  }): Promise<AiAdviceOutcome> {
    if (!input.options?.requested) return {};

    const pageAlignment = {
      summary: "",
      regions: input.comparison.matching.pageAlignment.regions.filter((region) =>
        region.status === "matched" && Boolean(region.actualParentSelector)
      ),
      rejectedRegionCount: 0
    };
    if (input.comparison.issues.length === 0 && pageAlignment.regions.length === 0) {
      input.diagnostics.push(localText(
        input.locale,
        "没有最终发布问题或已验证的匹配模块，已跳过 AI 汇总。",
        "AI advice was skipped because there are no final published issues or verified matched modules."
      ));
      return {};
    }

    const apiKey = input.options.apiKey?.trim() || this.environment?.OPENAI_API_KEY;
    const apiUrl = input.options.apiUrl?.trim() || this.environment?.OPENAI_BASE_URL;
    if (!apiKey && !apiUrl) {
      input.diagnostics.push(
        localText(
          input.locale,
          "已请求 AI 建议，但未配置 OpenAI API Key；已跳过。",
          "AI advice was requested but no OpenAI API key was configured, so it was skipped."
        )
      );
      return {};
    }

    try {
      return { advice: await this.dependencies.generateAiAdvice({
        apiKey,
        apiUrl,
        model: input.options.model,
        issues: input.comparison.issues,
        pageAlignment,
        locale: input.locale
      }) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ...(error instanceof PartialAiAdviceError ? { advice: error.partialAdvice } : {}),
        rejection: {
          code: classifyAiAdviceRejection(error),
          message: localText(
            input.locale,
            `AI 建议生成失败：${message}`,
            `Failed to generate AI advice: ${message}`
          ),
          danglingRefs: [],
          locations: []
        }
      };
    }
  }
}
