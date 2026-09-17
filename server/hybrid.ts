import type {
  ActualEvidenceElement,
  Box,
  EvidenceConfidence,
  HybridActualEvidence,
  LiveActualEvidence,
  ScreenshotActualEvidence,
  ScreenshotVisualAnchor
} from "../src/types";
import { localText, type Locale } from "./i18n";

export interface HybridActualEvidenceInput {
  screenshot: ScreenshotActualEvidence;
  live: LiveActualEvidence;
  locale: Locale;
}

interface AnchorPair {
  screenshot: ScreenshotVisualAnchor;
  live: ActualEvidenceElement;
}

function normalizedText(value?: string): string {
  return (value ?? "").replace(/\s+/g, "").toLocaleLowerCase();
}

function center(box: Box): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function pairsFor(
  anchors: ScreenshotVisualAnchor[],
  elements: ActualEvidenceElement[]
): AnchorPair[] {
  const unused = new Set(elements.map((_, index) => index));
  const pairs: AnchorPair[] = [];
  for (const anchor of anchors.filter((item) => item.confidence >= 0.8)) {
    const text = normalizedText(anchor.text);
    const index = [...unused].find((candidate) => {
      const element = elements[candidate];
      return (text && normalizedText(element.text) === text) ||
        (!text && anchor.role && element.role === anchor.role);
    });
    if (index !== undefined) {
      unused.delete(index);
      pairs.push({ screenshot: anchor, live: elements[index] });
    }
  }
  return pairs;
}

function fitAxis(source: number[], target: number[]): { scale: number; translate: number } {
  const sourceMean = source.reduce((sum, value) => sum + value, 0) / source.length;
  const targetMean = target.reduce((sum, value) => sum + value, 0) / target.length;
  const variance = source.reduce((sum, value) => sum + (value - sourceMean) ** 2, 0);
  const covariance = source.reduce(
    (sum, value, index) => sum + (value - sourceMean) * (target[index] - targetMean),
    0
  );
  const scale = variance > 0.001 ? covariance / variance : 1;
  return { scale, translate: targetMean - scale * sourceMean };
}

function projectBox(
  box: Box,
  transform: NonNullable<HybridActualEvidence["alignment"]["transform"]>
): Box {
  return {
    x: box.x * transform.scaleX + transform.translateX,
    y: box.y * transform.scaleY + transform.translateY,
    width: box.width * transform.scaleX,
    height: box.height * transform.scaleY
  };
}

function confidence(
  anchorCount: number,
  residualPx: number,
  validScale: boolean,
  locale: Locale
): EvidenceConfidence {
  const score = !validScale || anchorCount < 3
    ? 0.45
    : Math.max(0.45, Math.min(0.98, 0.98 - residualPx / 20));
  return {
    score,
    level: score >= 0.86 ? "high" : score >= 0.72 ? "medium" : "low",
    basis: ["visual-inference", "geometric-alignment"],
    reasons: [localText(
      locale,
      `${anchorCount} 个稳定锚点拟合截图与 H5 几何映射，残差 ${residualPx.toFixed(2)}px。`,
      `${anchorCount} stable anchors fit the screenshot-to-H5 geometry with ${residualPx.toFixed(2)}px residual.`
    )]
  };
}

export function buildHybridActualEvidence(
  input: HybridActualEvidenceInput
): HybridActualEvidence {
  const screenshotSample = input.screenshot.samples[input.screenshot.canonicalSampleIndex];
  const liveSample = input.live.samples[input.live.canonicalSampleIndex];
  if (!screenshotSample || !liveSample) {
    throw new Error(localText(input.locale, "Hybrid ActualEvidence 缺少 canonical sample。", "Hybrid ActualEvidence has no canonical sample."));
  }
  const pairs = pairsFor(screenshotSample.visualAnchors, liveSample.elements);
  const liveCenters = pairs.map((pair) => center(pair.live.box));
  const screenshotCenters = pairs.map((pair) => center(pair.screenshot.box));
  const xFit = pairs.length >= 2
    ? fitAxis(liveCenters.map((item) => item.x), screenshotCenters.map((item) => item.x))
    : { scale: 1, translate: 0 };
  const yFit = pairs.length >= 2
    ? fitAxis(liveCenters.map((item) => item.y), screenshotCenters.map((item) => item.y))
    : { scale: 1, translate: 0 };
  const transform = {
    scaleX: xFit.scale,
    scaleY: yFit.scale,
    translateX: xFit.translate,
    translateY: yFit.translate
  };
  const residualPx = pairs.length
    ? Math.sqrt(pairs.reduce((sum, pair) => {
        const expected = pair.screenshot.box;
        const projected = projectBox(pair.live.box, transform);
        const expectedCenter = center(expected);
        const projectedCenter = center(projected);
        return sum +
          (expectedCenter.x - projectedCenter.x) ** 2 +
          (expectedCenter.y - projectedCenter.y) ** 2 +
          (expected.width - projected.width) ** 2 +
          (expected.height - projected.height) ** 2;
      }, 0) / pairs.length)
    : Number.POSITIVE_INFINITY;
  const expectedScaleX = input.screenshot.viewport.width / input.live.viewport.width;
  const expectedScaleY = input.screenshot.viewport.height / input.live.viewport.height;
  const validScale =
    transform.scaleX / expectedScaleX >= 0.5 && transform.scaleX / expectedScaleX <= 2 &&
    transform.scaleY / expectedScaleY >= 0.5 && transform.scaleY / expectedScaleY <= 2;
  const evidenceConfidence = confidence(pairs.length, residualPx, validScale, input.locale);
  const aligned = evidenceConfidence.level === "high";
  const projectedLive = aligned
    ? {
        ...input.live,
        viewport: input.screenshot.viewport,
        samples: input.live.samples.map((sample) => ({
          ...sample,
          elements: sample.elements.map((element) => ({
            ...element,
            box: projectBox(element.box, transform)
          }))
        }))
      }
    : undefined;
  const projectedCanonical = projectedLive?.samples[projectedLive.canonicalSampleIndex];
  return {
    kind: "hybrid",
    effectiveMode: aligned ? "hybrid" : "screenshot",
    viewport: input.screenshot.viewport,
    samples: input.screenshot.samples.map((sample, index) => ({
      ...sample,
      elements: index === input.screenshot.canonicalSampleIndex
        ? projectedCanonical?.elements ?? []
        : []
    })),
    canonicalSampleIndex: input.screenshot.canonicalSampleIndex,
    elementChanges: projectedLive?.elementChanges ?? [],
    pixelVariance: input.screenshot.pixelVariance,
    confidenceCap: input.screenshot.confidenceCap,
    screenshot: input.screenshot,
    live: input.live,
    ...(projectedLive ? { projectedLive } : {}),
    alignment: {
      anchorCount: pairs.length,
      ...(pairs.length >= 2 ? { transform } : {}),
      residualPx,
      evidenceConfidence
    },
    diagnostics: [
      ...input.screenshot.diagnostics,
      ...input.live.diagnostics,
      aligned
        ? localText(input.locale, "Hybrid 锚点对齐可信，已投影 H5 DOM 区域。", "Hybrid anchor alignment is reliable; H5 DOM regions were projected.")
        : localText(input.locale, "Hybrid 锚点对齐不足，已安全降级为 Screenshot 模式。", "Hybrid anchor alignment is insufficient; safely degraded to Screenshot mode.")
    ]
  };
}
