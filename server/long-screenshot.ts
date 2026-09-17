import sharp from "sharp";
import type {
  DesignTruth,
  DesignTruthNode,
  LongScreenshotActualEvidence,
  ReviewIssue,
  SemanticAgentMatchingEvidence,
  SemanticAgentModuleState,
  ScreenshotCrop,
  ScreenshotDeviceMetadata,
  ScreenshotVisualAnchor
} from "../src/types";
import { localText, type Locale } from "./i18n";
import type { ComparisonResult } from "./compare";

export interface LongScreenshotSource {
  name: string;
  image: Buffer;
  device: ScreenshotDeviceMetadata;
  crop?: ScreenshotCrop;
  anchors?: ScreenshotVisualAnchor[];
}

export interface LongScreenshotActualEvidenceInput {
  design: DesignTruth;
  screenshot: LongScreenshotSource;
  locale: Locale;
}

export interface LongScreenshotComparisonResult {
  comparison: ComparisonResult;
  metadata: NonNullable<import("../src/types").CompareReport["longScreenshot"]>;
}

function aggregateSemanticAgentEvidence(
  comparisons: ComparisonResult[]
): SemanticAgentMatchingEvidence {
  const evidence = comparisons
    .map((comparison) => comparison.matching.semanticAgent)
    .filter((item): item is SemanticAgentMatchingEvidence => Boolean(item));
  const modules = new Map<string, {
    acceptedBindingCount: number;
    actualParentSelectors: Set<string>;
    decisions: Map<string, SemanticAgentModuleState["dynamicFallback"]["decisions"][number]>;
  }>();
  for (const item of evidence) {
    for (const module of item.modules) {
      const aggregate = modules.get(module.designModuleId) ?? {
        acceptedBindingCount: 0,
        actualParentSelectors: new Set<string>(),
        decisions: new Map()
      };
      aggregate.acceptedBindingCount += module.acceptedBindingCount;
      module.actualParentSelectors.forEach((selector) => aggregate.actualParentSelectors.add(selector));
      for (const decision of module.dynamicFallback.decisions) {
        const key = [
          decision.figmaNodeId,
          decision.selector,
          decision.result,
          decision.reasonCode,
          decision.matched
        ].join("\u0000");
        aggregate.decisions.set(key, decision);
      }
      modules.set(module.designModuleId, aggregate);
    }
  }
  return {
    invoked: evidence.some((item) => item.invoked),
    responded: evidence.some((item) => item.responded),
    acceptedBindingCount: evidence.reduce((sum, item) => sum + item.acceptedBindingCount, 0),
    modules: [...modules]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([designModuleId, aggregate]) => {
        const decisions = [...aggregate.decisions.values()].sort((left, right) =>
          left.figmaNodeId.localeCompare(right.figmaNodeId) ||
          left.selector.localeCompare(right.selector)
        );
        return {
          designModuleId,
          acceptedBindingCount: aggregate.acceptedBindingCount,
          actualParentSelectors: [...aggregate.actualParentSelectors]
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
}

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function checkedCrop(
  crop: ScreenshotCrop | undefined,
  source: { width: number; height: number },
  locale: Locale
): ScreenshotCrop | undefined {
  if (!crop) return undefined;
  if (
    ![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) ||
    crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0 ||
    crop.x + crop.width > source.width || crop.y + crop.height > source.height
  ) {
    throw new Error(localText(locale, "长截图有效内容裁剪超出图像边界。", "The long-screenshot content crop is outside the image bounds."));
  }
  return crop;
}

async function viewportTile(
  image: Buffer,
  y: number,
  contentHeight: number,
  viewport: { width: number; height: number }
): Promise<Buffer> {
  const extracted = await sharp(image).extract({
    left: 0,
    top: y,
    width: viewport.width,
    height: contentHeight
  }).png().toBuffer();
  if (contentHeight === viewport.height) return extracted;
  return sharp(extracted).extend({
    top: 0,
    bottom: viewport.height - contentHeight,
    left: 0,
    right: 0,
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  }).png().toBuffer();
}

async function detectBlankBands(
  designImage: Buffer,
  actualImage: Buffer,
  width: number,
  height: number,
  locale: Locale
): Promise<LongScreenshotActualEvidence["anomalies"]> {
  const [design, actual] = await Promise.all([
    sharp(designImage).extract({ left: 0, top: 0, width, height }).removeAlpha().raw().toBuffer(),
    sharp(actualImage).extract({ left: 0, top: 0, width, height }).removeAlpha().raw().toBuffer()
  ]);
  const blankRows: boolean[] = [];
  for (let y = 0; y < height; y += 1) {
    let actualBlank = 0;
    let designBlank = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      if (actual[offset] >= 248 && actual[offset + 1] >= 248 && actual[offset + 2] >= 248) actualBlank += 1;
      if (design[offset] >= 248 && design[offset + 1] >= 248 && design[offset + 2] >= 248) designBlank += 1;
    }
    blankRows.push(actualBlank / width >= 0.98 && designBlank / width < 0.9);
  }
  const anomalies: LongScreenshotActualEvidence["anomalies"] = [];
  for (let start = 0; start < height;) {
    if (!blankRows[start]) {
      start += 1;
      continue;
    }
    let end = start + 1;
    while (end < height && blankRows[end]) end += 1;
    if (end - start >= 12 && start > 0 && end < height) {
      anomalies.push({
        kind: "lazy-load-blank",
        box: { x: 0, y: start, width, height: end - start },
        confidencePenalty: 0.2,
        description: localText(
          locale,
          `实际长截图在 y=${start} 处存在 ${end - start}px 连续空白，疑似懒加载未完成。`,
          `The actual long screenshot has a ${end - start}px blank band at y=${start}, suggesting incomplete lazy loading.`
        )
      });
    }
    start = end;
  }
  return anomalies;
}

async function detectStitchSeams(
  actualImage: Buffer,
  width: number,
  height: number,
  viewportHeight: number,
  locale: Locale
): Promise<LongScreenshotActualEvidence["anomalies"]> {
  const pixels = await sharp(actualImage)
    .extract({ left: 0, top: 0, width, height })
    .removeAlpha()
    .raw()
    .toBuffer();
  const bandHeight = Math.max(4, Math.min(12, Math.round(viewportHeight * 0.08)));
  const anomalies: LongScreenshotActualEvidence["anomalies"] = [];
  for (let boundary = viewportHeight; boundary < height; boundary += viewportHeight) {
    if (boundary < bandHeight || boundary + bandHeight > height) continue;
    let matchingChannels = 0;
    let channelCount = 0;
    const minimum = [255, 255, 255];
    const maximum = [0, 0, 0];
    for (let y = 0; y < bandHeight; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const before = ((boundary - bandHeight + y) * width + x) * 3;
        const after = ((boundary + y) * width + x) * 3;
        for (let channel = 0; channel < 3; channel += 1) {
          const value = pixels[before + channel];
          minimum[channel] = Math.min(minimum[channel], value);
          maximum[channel] = Math.max(maximum[channel], value);
          if (Math.abs(value - pixels[after + channel]) <= 2) matchingChannels += 1;
          channelCount += 1;
        }
      }
    }
    const spatialRange = Math.max(...maximum.map((value, channel) => value - minimum[channel]));
    if (matchingChannels / channelCount >= 0.98 && spatialRange >= 24) {
      anomalies.push({
        kind: "stitch-seam",
        box: { x: 0, y: boundary - bandHeight, width, height: bandHeight * 2 },
        confidencePenalty: 0.2,
        description: localText(
          locale,
          `实际长截图在 viewport 边界 y=${boundary} 两侧存在重复条带，疑似截图拼接异常。`,
          `The actual long screenshot has a repeated strip around viewport boundary y=${boundary}, suggesting a stitching anomaly.`
        )
      });
    }
  }
  return anomalies;
}

function detectStickyRegions(
  anchors: ScreenshotVisualAnchor[],
  viewportHeight: number
): LongScreenshotActualEvidence["stickyRegions"] {
  const groups = new Map<string, ScreenshotVisualAnchor[]>();
  for (const anchor of anchors) {
    const semantic = `${anchor.role ?? ""} ${anchor.text ?? ""}`;
    const localY = anchor.box.y % viewportHeight;
    if (
      anchor.confidence < 0.8 ||
      localY > Math.max(80, viewportHeight * 0.2) ||
      !/nav|navigation|header|columnheader|banner|导航|表头|标题/i.test(semantic)
    ) continue;
    const key = `${anchor.role ?? ""}|${anchor.text ?? ""}`;
    const group = groups.get(key) ?? [];
    group.push(anchor);
    groups.set(key, group);
  }
  return [...groups.entries()].flatMap(([key, group]) => {
    const ordered = [...group].sort((a, b) => a.box.y - b.box.y);
    const first = ordered[0];
    const duplicates = ordered.slice(1).filter((anchor) =>
      Math.abs((anchor.box.y % viewportHeight) - (first.box.y % viewportHeight)) <= 3 &&
      Math.floor(anchor.box.y / viewportHeight) !== Math.floor(first.box.y / viewportHeight)
    );
    return duplicates.length
      ? [{ key, canonicalBox: first.box, duplicateBoxes: duplicates.map((anchor) => anchor.box) }]
      : [];
  });
}

export async function buildLongScreenshotActualEvidence(
  input: LongScreenshotActualEvidenceInput
): Promise<LongScreenshotActualEvidence> {
  const viewport = input.screenshot.device.viewport;
  if (
    !positive(viewport.width) || !positive(viewport.height) ||
    !positive(input.screenshot.device.dpr)
  ) {
    throw new Error(localText(input.locale, "长截图 viewport 和 DPR 必须有效。", "Long-screenshot viewport and DPR must be valid."));
  }
  const viewportWidth = Math.round(viewport.width);
  const viewportHeight = Math.round(viewport.height);
  const sourceMetadata = await sharp(input.screenshot.image).metadata();
  const sourceWidth = sourceMetadata.width ?? 0;
  const sourceHeight = sourceMetadata.height ?? 0;
  if (!sourceWidth || !sourceHeight || !["png", "jpeg", "webp"].includes(sourceMetadata.format ?? "")) {
    throw new Error(localText(input.locale, "长截图仅支持 PNG、JPEG 或 WebP。", "Long screenshots must be PNG, JPEG, or WebP."));
  }
  const crop = checkedCrop(input.screenshot.crop, { width: sourceWidth, height: sourceHeight }, input.locale);
  const visibleWidth = crop?.width ?? sourceWidth;
  const visibleHeight = crop?.height ?? sourceHeight;
  const expectedPixelWidth = viewport.width * input.screenshot.device.dpr;
  if (Math.abs(visibleWidth - expectedPixelWidth) > 2 || visibleHeight < viewport.height * input.screenshot.device.dpr) {
    throw new Error(localText(
      input.locale,
      "长截图宽度或高度与目标 viewport × DPR 不一致。",
      "The long-screenshot width or height does not match the target viewport × DPR."
    ));
  }
  const expectedOrientation = viewport.width > viewport.height ? "landscape" : "portrait";
  if (input.screenshot.device.orientation !== expectedOrientation) {
    throw new Error(localText(input.locale, "长截图方向与目标 viewport 不一致。", "Long-screenshot orientation does not match the target viewport."));
  }

  let actualPipeline = sharp(input.screenshot.image);
  if (crop) {
    actualPipeline = actualPipeline.extract({
      left: Math.round(crop.x),
      top: Math.round(crop.y),
      width: Math.round(crop.width),
      height: Math.round(crop.height)
    });
  }
  const actualHeight = Math.max(1, Math.round(visibleHeight * viewportWidth / visibleWidth));
  const designMetadata = await sharp(input.design.render.image).metadata();
  const designWidth = designMetadata.width ?? input.design.render.viewport.width;
  const designHeight = designMetadata.height ?? input.design.render.viewport.height;
  if (!positive(designWidth) || !positive(designHeight) || designHeight <= designWidth) {
    throw new Error(localText(input.locale, "Figma Frame 不是有效的纵向长图。", "The Figma Frame is not a valid portrait long image."));
  }
  const normalizedDesignHeight = Math.max(1, Math.round(designHeight * viewportWidth / designWidth));
  const heightDelta = Math.abs(normalizedDesignHeight - actualHeight);
  const maximumUnanchoredDelta = Math.max(viewportHeight / 2, normalizedDesignHeight * 0.15);
  if (heightDelta > maximumUnanchoredDelta) {
    throw new Error(localText(
      input.locale,
      "长截图与 Figma Frame 的有效内容高度无法对齐。",
      "The effective long-screenshot height cannot be aligned with the Figma Frame."
    ));
  }
  const [designImage, actualImage] = await Promise.all([
    sharp(input.design.render.image).resize(viewportWidth, normalizedDesignHeight, { fit: "fill" }).png().toBuffer(),
    actualPipeline.resize(viewportWidth, actualHeight, { fit: "fill" }).png().toBuffer()
  ]);
  const pageHeight = Math.min(normalizedDesignHeight, actualHeight);
  const [fullDesignImage, fullActualImage] = await Promise.all([
    normalizedDesignHeight === pageHeight
      ? designImage
      : sharp(designImage).extract({ left: 0, top: 0, width: viewportWidth, height: pageHeight }).png().toBuffer(),
    actualHeight === pageHeight
      ? actualImage
      : sharp(actualImage).extract({ left: 0, top: 0, width: viewportWidth, height: pageHeight }).png().toBuffer()
  ]);
  const anchorScale = viewportWidth / visibleWidth;
  const normalizedAnchors = (input.screenshot.anchors ?? []).map((anchor) => ({
    ...anchor,
    box: {
      x: (anchor.box.x - (crop?.x ?? 0)) * anchorScale,
      y: (anchor.box.y - (crop?.y ?? 0)) * anchorScale,
      width: anchor.box.width * anchorScale,
      height: anchor.box.height * anchorScale
    }
  }));
  const stickyRegions = detectStickyRegions(normalizedAnchors, viewportHeight);
  const anomalies = [
    ...await detectBlankBands(
      designImage,
      actualImage,
      viewportWidth,
      pageHeight,
      input.locale
    ),
    ...await detectStitchSeams(
      actualImage,
      viewportWidth,
      pageHeight,
      viewportHeight,
      input.locale
    )
  ];
  const tiles: LongScreenshotActualEvidence["tiles"] = [];
  for (let scrollY = 0, index = 0; scrollY < pageHeight; scrollY += viewportHeight, index += 1) {
    const contentHeight = Math.min(viewportHeight, pageHeight - scrollY);
    const [designTile, actualTile] = await Promise.all([
      viewportTile(designImage, scrollY, contentHeight, { width: viewportWidth, height: viewportHeight }),
      viewportTile(actualImage, scrollY, contentHeight, { width: viewportWidth, height: viewportHeight })
    ]);
    tiles.push({
      index,
      scrollY,
      contentHeight,
      viewport: { width: viewportWidth, height: viewportHeight },
      designImage: designTile,
      actualImage: actualTile,
      anchors: normalizedAnchors
        .filter((anchor) =>
          anchor.box.y < scrollY + contentHeight &&
          anchor.box.y + anchor.box.height > scrollY
        )
        .map((anchor) => ({
          ...anchor,
          box: { ...anchor.box, y: anchor.box.y - scrollY }
        })),
      absoluteBox: { x: 0, y: scrollY, width: viewportWidth, height: contentHeight }
    });
  }

  return {
    kind: "long_screenshot",
    viewport: { width: viewportWidth, height: viewportHeight },
    fullPage: { designImage: fullDesignImage, actualImage: fullActualImage, width: viewportWidth, height: pageHeight },
    tiles,
    stickyRegions,
    anomalies,
    confidenceCap: anomalies.length ? 0.62 : 0.82,
    diagnostics: [
      localText(
        input.locale,
        `长截图已按 ${viewportWidth} × ${viewportHeight} viewport 分为 ${tiles.length} 片。`,
        `The long screenshot was split into ${tiles.length} tiles at a ${viewportWidth} × ${viewportHeight} viewport.`
      ),
      ...anomalies.map((anomaly) => anomaly.description)
    ]
  };
}

function shiftedBox<T extends { x: number; y: number; width: number; height: number }>(
  box: T | undefined,
  offsetY: number
): T | undefined {
  return box ? { ...box, y: box.y + offsetY } : undefined;
}

function tileNode(
  node: DesignTruthNode,
  scale: number,
  scrollY: number,
  tileHeight: number,
  isRoot = false
): DesignTruthNode | undefined {
  const absolute = node.box && {
    x: node.box.x * scale,
    y: node.box.y * scale,
    width: node.box.width * scale,
    height: node.box.height * scale
  };
  if (!isRoot && absolute && (absolute.y >= scrollY + tileHeight || absolute.y + absolute.height <= scrollY)) {
    return undefined;
  }
  const children = node.children
    .map((child) => tileNode(child, scale, scrollY, tileHeight))
    .filter((child): child is DesignTruthNode => Boolean(child));
  const localBox = isRoot
    ? { x: 0, y: 0, width: absolute?.width ?? 0, height: tileHeight }
    : absolute && { ...absolute, y: absolute.y - scrollY };
  return {
    ...node,
    ...(localBox ? { box: localBox, relativeBox: localBox } : {}),
    children
  };
}

export function designTruthForLongScreenshotTile(
  design: DesignTruth,
  evidence: LongScreenshotActualEvidence,
  tileIndex: number
): DesignTruth {
  const tile = evidence.tiles[tileIndex];
  if (!tile) throw new Error(`Long-screenshot tile ${tileIndex} does not exist.`);
  const scale = evidence.fullPage.width / design.render.viewport.width;
  return {
    ...design,
    render: { image: tile.designImage, viewport: tile.viewport },
    root: tileNode(design.root, scale, tile.scrollY, tile.viewport.height, true)!,
    diagnostics: []
  };
}

function confidenceLevel(score: number): "high" | "medium" | "low" {
  return score >= 0.86 ? "high" : score >= 0.72 ? "medium" : "low";
}

function overlapRatio(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}

function tracedIssue(
  issue: ReviewIssue,
  tile: LongScreenshotActualEvidence["tiles"][number],
  confidenceCap: number,
  anomalyReason?: string
): ReviewIssue {
  const absoluteBox = shiftedBox(issue.location.box ?? issue.box, tile.scrollY);
  const score = Math.min(issue.evidenceConfidence.score, confidenceCap);
  return {
    ...issue,
    id: `tile-${tile.index}:${issue.id}`,
    ...(shiftedBox(issue.designBox, tile.scrollY) ? { designBox: shiftedBox(issue.designBox, tile.scrollY) } : {}),
    ...(shiftedBox(issue.actualBox, tile.scrollY) ? { actualBox: shiftedBox(issue.actualBox, tile.scrollY) } : {}),
    ...(shiftedBox(issue.box, tile.scrollY) ? { box: shiftedBox(issue.box, tile.scrollY) } : {}),
    evidenceConfidence: {
      ...issue.evidenceConfidence,
      score,
      level: confidenceLevel(score),
      reasons: anomalyReason
        ? [...issue.evidenceConfidence.reasons, anomalyReason]
        : issue.evidenceConfidence.reasons
    },
    evidence: issue.evidence.map((item) => ({
      ...item,
      ...(shiftedBox(item.designBox, tile.scrollY) ? { designBox: shiftedBox(item.designBox, tile.scrollY) } : {}),
      ...(shiftedBox(item.actualBox, tile.scrollY) ? { actualBox: shiftedBox(item.actualBox, tile.scrollY) } : {}),
      ...(shiftedBox(item.box, tile.scrollY) ? { box: shiftedBox(item.box, tile.scrollY) } : {}),
      evidenceConfidence: {
        ...item.evidenceConfidence,
        score: Math.min(item.evidenceConfidence.score, confidenceCap),
        level: confidenceLevel(Math.min(item.evidenceConfidence.score, confidenceCap))
      }
    })),
    location: {
      ...issue.location,
      ...(shiftedBox(issue.location.designBox, tile.scrollY) ? { designBox: shiftedBox(issue.location.designBox, tile.scrollY) } : {}),
      ...(shiftedBox(issue.location.actualBox, tile.scrollY) ? { actualBox: shiftedBox(issue.location.actualBox, tile.scrollY) } : {}),
      ...(absoluteBox ? { box: absoluteBox } : {}),
      longScreenshot: {
        tileIndex: tile.index,
        scrollY: tile.scrollY,
        ...(absoluteBox ? { absoluteBox } : {})
      }
    }
  };
}

function anomalyIssue(
  anomaly: LongScreenshotActualEvidence["anomalies"][number],
  evidence: LongScreenshotActualEvidence,
  locale: Locale,
  index: number
): ReviewIssue {
  const tile = evidence.tiles.find((candidate) =>
    anomaly.box.y < candidate.scrollY + candidate.contentHeight &&
    anomaly.box.y + anomaly.box.height > candidate.scrollY
  ) ?? evidence.tiles[0];
  const title = anomaly.kind === "lazy-load-blank"
    ? localText(locale, "长截图存在懒加载空白", "Long screenshot contains a lazy-load blank")
    : localText(locale, "长截图存在拼接异常", "Long screenshot contains a stitching anomaly");
  const suggestion = localText(locale, "等待页面内容加载稳定后重新采集长截图。", "Recapture the long screenshot after page content has settled.");
  const confidence = {
    score: evidence.confidenceCap,
    level: confidenceLevel(evidence.confidenceCap),
    basis: ["pixel-measurement" as const, "visual-inference" as const],
    reasons: [anomaly.description]
  };
  return {
    id: `long-quality-${index + 1}`,
    category: localText(locale, "长截图质量", "Long-screenshot quality"),
    severity: "pending",
    priority: "Pending",
    title,
    summary: anomaly.description,
    suggestion,
    primaryAction: suggestion,
    evidenceConfidence: confidence,
    box: anomaly.box,
    rule: "long_screenshot_quality",
    location: {
      box: anomaly.box,
      description: localText(locale, `长图 y=${anomaly.box.y}`, `Long page y=${anomaly.box.y}`),
      longScreenshot: {
        tileIndex: tile?.index ?? 0,
        scrollY: tile?.scrollY ?? 0,
        absoluteBox: anomaly.box
      }
    },
    evidence: [{
      sourceIssueId: `long-quality-${index + 1}`,
      rule: "long_screenshot_quality",
      category: localText(locale, "长截图质量", "Long-screenshot quality"),
      summary: anomaly.description,
      box: anomaly.box,
      evidenceConfidence: confidence
    }]
  };
}

export async function aggregateLongScreenshotComparisons(input: {
  evidence: LongScreenshotActualEvidence;
  comparisons: ComparisonResult[];
  locale: Locale;
}): Promise<LongScreenshotComparisonResult> {
  const { evidence, comparisons } = input;
  const anomalyReason = evidence.anomalies.length
    ? localText(input.locale, "长截图采集质量异常限制了结论置信度。", "Long-screenshot capture anomalies cap conclusion confidence.")
    : undefined;
  const duplicateStickyBoxes = evidence.stickyRegions.flatMap((region) => region.duplicateBoxes);
  const inStickyDuplicate = (issue: ReviewIssue): boolean => Boolean(
    issue.location.box && duplicateStickyBoxes.some((box) => overlapRatio(issue.location.box!, box) >= 0.6)
  );
  const issues = comparisons.flatMap((comparison, index) => {
    const traced = comparison.issues.map((issue) =>
      tracedIssue(issue, evidence.tiles[index], evidence.confidenceCap, anomalyReason)
    );
    const localizedVisualIssues = traced.filter((issue) => issue.rule === "visual_region" && issue.location.box);
    const visualDifferenceIsOnlySticky = localizedVisualIssues.length > 0 && localizedVisualIssues.every(inStickyDuplicate);
    return traced.filter((issue) =>
      !inStickyDuplicate(issue) && !(issue.rule === "visual_similarity" && visualDifferenceIsOnlySticky)
    );
  });
  issues.push(...evidence.anomalies.map((anomaly, index) => anomalyIssue(anomaly, evidence, input.locale, index)));
  const totalArea = evidence.tiles.reduce((sum, tile) => sum + tile.viewport.width * tile.contentHeight, 0);
  const weighted = (value: (comparison: ComparisonResult) => number): number =>
    comparisons.reduce((sum, comparison, index) =>
      sum + value(comparison) * evidence.tiles[index].viewport.width * evidence.tiles[index].contentHeight,
    0) / Math.max(1, totalArea);
  const diffCanvas = sharp({
    create: {
      width: evidence.fullPage.width,
      height: evidence.fullPage.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });
  const diffParts = await Promise.all(comparisons.map(async (comparison, index) => {
    const tile = evidence.tiles[index];
    return {
      input: await sharp(comparison.diffImage).extract({
        left: 0,
        top: 0,
        width: tile.viewport.width,
        height: tile.contentHeight
      }).png().toBuffer(),
      left: 0,
      top: tile.scrollY
    };
  }));
  const diffImage = await diffCanvas.composite(diffParts).png().toBuffer();
  const matching = {
    ...(comparisons.some(comparison => comparison.matching.designCoverage) ? {
      designCoverage: {
        policy: "design-driven" as const,
        items: comparisons.flatMap((comparison, index) => (comparison.matching.designCoverage?.items ?? []).flatMap(item => {
          const tile = evidence.tiles[index];
          const issueIds = item.issueIds.map(id => `tile-${tile.index}:${id}`).filter(id => issues.some(issue => issue.id === id));
          // Sticky-copy suppression removes duplicate findings; do not emit dangling refs.
          if (item.issueIds.length && !issueIds.length) return [];
          return [{ ...item, tileIndex: tile.index, designBox: shiftedBox(item.designBox, tile.scrollY), actualBox: shiftedBox(item.actualBox, tile.scrollY), issueIds,
            ...(item.checks ? { checks: item.checks.map(check => ({ ...check, actualBox: shiftedBox(check.actualBox, tile.scrollY)!,
              ...(check.property === "y" ? { expected: typeof check.expected === "number" ? check.expected + tile.scrollY : check.expected,
                actual: typeof check.actual === "number" ? check.actual + tile.scrollY : check.actual } : {}) })) } : {}),
            ...(item.displacement ? { displacement: { ...item.displacement, causeIssueIds: item.displacement.causeIssueIds.map(id => `tile-${tile.index}:${id}`).filter(id => issues.some(issue => issue.id === id)) } } : {}),
            ...(item.coveredBy ? { coveredBy: `tile-${tile.index}:${item.coveredBy}` } : {}) }];
        })),
        actualItems: comparisons.flatMap((comparison, index) => (comparison.matching.designCoverage?.actualItems ?? []).map(item => ({
          ...item, tileIndex: evidence.tiles[index].index, actualBox: shiftedBox(item.actualBox, evidence.tiles[index].scrollY)!,
          issueIds: item.issueIds.map(id => `tile-${evidence.tiles[index].index}:${id}`).filter(id => issues.some(issue => issue.id === id)),
          ...(item.coveredBy ? { coveredBy: `tile-${evidence.tiles[index].index}:${item.coveredBy}` } : {})
        })))
      }
    } : {}),
    ...(comparisons.every(item => item.matching.visualScope) ? { visualScope: comparisons.reduce((sum, item) => ({
      reviewedPixels: sum.reviewedPixels + item.matching.visualScope!.reviewedPixels,
      changedPixels: sum.changedPixels + item.matching.visualScope!.changedPixels,
      excludedPixels: sum.excludedPixels + item.matching.visualScope!.excludedPixels,
      canvasPixels: sum.canvasPixels + item.matching.visualScope!.canvasPixels
    }), { reviewedPixels: 0, changedPixels: 0, excludedPixels: 0, canvasPixels: 0 }) } : {}),
    matches: comparisons.flatMap((comparison, index) => comparison.matching.matches.map((match) => ({
      ...match,
      figmaNodeId: match.figmaNodeId,
      selector: match.selector
    }))),
    unmatchedDesignCount: comparisons.reduce((sum, item) => sum + item.matching.unmatchedDesignCount, 0),
    unmatchedActualCount: comparisons.reduce((sum, item) => sum + item.matching.unmatchedActualCount, 0),
    pageAlignment: {
      summary: [...new Set(comparisons
        .map((item) => item.matching.pageAlignment.summary.trim())
        .filter(Boolean))].join(" "),
      regions: comparisons.flatMap((item) => item.matching.pageAlignment.regions),
      rejectedRegionCount: comparisons.reduce(
        (sum, item) => sum + item.matching.pageAlignment.rejectedRegionCount,
        0
      )
    },
    semanticAgent: aggregateSemanticAgentEvidence(comparisons),
    diagnostics: comparisons.flatMap((item) => item.matching.diagnostics)
  };
  const dynamicRegions = comparisons.flatMap((comparison, index) =>
    comparison.dynamicNormalization.regions.map((region) => ({
      ...region,
      designBox: shiftedBox(region.designBox, evidence.tiles[index].scrollY)!,
      actualBox: shiftedBox(region.actualBox, evidence.tiles[index].scrollY)!
    }))
  );
  return {
    comparison: {
      referenceImage: evidence.fullPage.designImage,
      actualImage: evidence.fullPage.actualImage,
      diffImage,
      similarity: weighted((item) => item.similarity),
      issues,
      matching,
      dynamicNormalization: {
        stableSimilarity: weighted((item) => item.dynamicNormalization.stableSimilarity),
        dynamicRegionAreaRatio: weighted((item) => item.dynamicNormalization.dynamicRegionAreaRatio),
        strategies: [...new Set(comparisons.flatMap((item) => item.dynamicNormalization.strategies))],
        regions: dynamicRegions,
        geometry: comparisons.flatMap((comparison, index) => (comparison.dynamicNormalization.geometry ?? []).map(item => ({ ...item,
          designBox: shiftedBox(item.designBox, evidence.tiles[index].scrollY)!, actualBox: shiftedBox(item.actualBox, evidence.tiles[index].scrollY)! }))),
        agentHypotheses: comparisons.flatMap((item) => item.dynamicNormalization.agentHypotheses)
      },
      marketVariants: {
        catalog: comparisons.flatMap((item) => item.marketVariants.catalog),
        matches: comparisons.flatMap((item) => item.marketVariants.matches),
        unresolved: comparisons.flatMap((item) => item.marketVariants.unresolved)
      },
      marketLists: {
        matches: comparisons.flatMap((item) => item.marketLists.matches),
        unresolved: comparisons.flatMap((item) => item.marketLists.unresolved)
      }
    },
    metadata: {
      tiles: evidence.tiles.map(({ index, scrollY, contentHeight }) => ({ index, scrollY, contentHeight })),
      stickyRegions: evidence.stickyRegions,
      anomalies: evidence.anomalies,
      evidenceConfidence: {
        score: evidence.confidenceCap,
        level: confidenceLevel(evidence.confidenceCap),
        basis: ["pixel-measurement", "visual-inference"],
        reasons: evidence.anomalies.length
          ? evidence.anomalies.map((item) => item.description)
          : [localText(input.locale, "长图尺寸与分片边界校验通过。", "Long-page dimensions and tile boundaries were validated.")]
      }
    }
  };
}
