import pixelmatch from "pixelmatch";
import sharp from "sharp";
import type {
  AcceptanceConfig,
  Box,
  DesignElement,
  DomElement,
  Issue,
  Severity
} from "../src/types";
import type { PageCapture, StaticAudit } from "./capture";
import type { DesignSource } from "./design";
import { severityFor } from "./default-rules";

interface VisualComparison {
  diff: Buffer;
  similarity: number;
  regions: Array<Box & { changedPixels: number; density: number }>;
}

interface ElementMatch {
  design: DesignElement;
  actual: DomElement;
  confidence: number;
  method: "figma-id" | "text" | "geometry";
}

export interface ComparisonResult {
  referenceImage: Buffer;
  actualImage: Buffer;
  diffImage: Buffer;
  similarity: number;
  issues: Issue[];
  matchedElements: number;
}

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

function formatPx(value: number | undefined): string {
  return typeof value === "number" ? `${round(value)}px` : "未设置";
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

function compatibleType(design: DesignElement, actual: DomElement): boolean {
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

function elementMatches(
  designElements: DesignElement[],
  domElements: DomElement[],
  viewport: { width: number; height: number },
  minConfidence: number
): { matches: ElementMatch[]; unmatchedDesign: DesignElement[]; unmatchedDom: DomElement[] } {
  const unusedDesign = new Set(designElements.map((_, index) => index));
  const unusedDom = new Set(domElements.map((_, index) => index));
  const matches: ElementMatch[] = [];

  const accept = (
    designIndex: number,
    domIndex: number,
    confidence: number,
    method: ElementMatch["method"]
  ) => {
    unusedDesign.delete(designIndex);
    unusedDom.delete(domIndex);
    matches.push({
      design: designElements[designIndex],
      actual: domElements[domIndex],
      confidence,
      method
    });
  };

  for (const designIndex of [...unusedDesign]) {
    const design = designElements[designIndex];
    const domIndex = [...unusedDom].find(
      (index) => domElements[index].dataFigmaId?.replace(/-/g, ":") === design.id.replace(/-/g, ":")
    );
    if (domIndex !== undefined) accept(designIndex, domIndex, 1, "figma-id");
  }

  const diagonal = Math.hypot(viewport.width, viewport.height);
  for (const designIndex of [...unusedDesign]) {
    const design = designElements[designIndex];
    const text = normalizeText(design.text);
    if (!text) continue;
    let best: { domIndex: number; score: number } | undefined;
    for (const domIndex of unusedDom) {
      const actual = domElements[domIndex];
      if (normalizeText(actual.text) !== text) continue;
      const distanceScore = 1 - Math.min(1, centerDistance(design.box, actual.box) / diagonal);
      const score = 0.72 + distanceScore * 0.16 + sizeSimilarity(design.box, actual.box) * 0.1 +
        (compatibleType(design, actual) ? 0.02 : 0);
      if (!best || score > best.score) best = { domIndex, score };
    }
    if (best) accept(designIndex, best.domIndex, Math.min(0.99, best.score), "text");
  }

  for (const designIndex of [...unusedDesign]) {
    const design = designElements[designIndex];
    let best: { domIndex: number; score: number } | undefined;
    for (const domIndex of unusedDom) {
      const actual = domElements[domIndex];
      const distanceScore = 1 - Math.min(1, centerDistance(design.box, actual.box) / diagonal);
      const score = distanceScore * 0.48 + sizeSimilarity(design.box, actual.box) * 0.22 +
        (compatibleType(design, actual) ? 0.08 : 0);
      if (!best || score > best.score) best = { domIndex, score };
    }
    if (best && best.score >= minConfidence) {
      accept(designIndex, best.domIndex, best.score, "geometry");
    }
  }

  return {
    matches,
    unmatchedDesign: [...unusedDesign].map((index) => designElements[index]),
    unmatchedDom: [...unusedDom].map((index) => domElements[index])
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
  threshold: number
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
  const diffData = Buffer.alloc(width * height * 4);
  const changedPixels = pixelmatch(
    referenceRaw.data,
    actualRaw.data,
    diffData,
    width,
    height,
    { threshold, includeAA: false, diffMask: true }
  );
  const diff = await sharp(diffData, { raw: { width, height, channels: 4 } }).png().toBuffer();

  const cellSize = Math.max(24, Math.min(64, Math.round(Math.min(width, height) / 14)));
  const changedCells = new Map<string, number>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (diffData[(y * width + x) * 4 + 3] === 0) continue;
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
    similarity: 1 - changedPixels / (width * height),
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
  return severity === "error" && confidence < highConfidence ? "pending" : severity;
}

function issueForAudit(
  audit: StaticAudit,
  config: AcceptanceConfig,
  create: ReturnType<typeof addIssueFactory>
): Issue | undefined {
  const severity = severityFor(config, audit.rule);
  if (!severity) return undefined;
  const suggestions: Record<StaticAudit["rule"], string> = {
    broken_image: "检查资源地址、构建产物路径和跨域访问策略。",
    horizontal_overflow: "定位超出视口的元素，修正固定宽度、负边距或未换行内容。",
    clipped_text: "检查容器尺寸、line-height、overflow 和文本换行规则。"
  };
  return create({
    category: "静态规则",
    severity,
    title: audit.rule === "broken_image" ? "图片加载失败" : audit.rule === "horizontal_overflow" ? "页面横向溢出" : "文本可能被截断",
    summary: audit.summary,
    suggestion: suggestions[audit.rule],
    selector: audit.selector,
    box: audit.box,
    rule: audit.rule
  });
}

export async function compareDesignToPage(
  design: DesignSource,
  capture: PageCapture,
  config: AcceptanceConfig
): Promise<ComparisonResult> {
  const width = Math.round(design.viewport.width);
  const height = Math.round(design.viewport.height);
  const referenceImage = await sharp(design.image).resize(width, height, { fit: "fill" }).png().toBuffer();
  const actualImage = await sharp(capture.image).resize(width, height, { fit: "fill" }).png().toBuffer();
  const visual = await compareVisual(
    referenceImage,
    actualImage,
    width,
    height,
    config.thresholds.pixelThreshold
  );
  const create = addIssueFactory();
  const issues: Issue[] = [];

  const visualSeverity = severityFor(config, "visual_similarity", "error");
  if (visualSeverity && visual.similarity < config.thresholds.visualSimilarityMin) {
    issues.push(
      create({
        category: "视觉相似度",
        severity: visualSeverity,
        title: "整体视觉相似度未达标",
        summary: `当前相似度 ${(visual.similarity * 100).toFixed(2)}%，低于最低要求 ${(config.thresholds.visualSimilarityMin * 100).toFixed(2)}%。`,
        expected: `≥ ${(config.thresholds.visualSimilarityMin * 100).toFixed(2)}%`,
        actual: `${(visual.similarity * 100).toFixed(2)}%`,
        suggestion: "先处理报告中变化像素最多的区域，再重新运行验收。",
        rule: "visual_similarity"
      })
    );
  }

  visual.regions.forEach((region, index) => {
    issues.push(
      create({
        category: "视觉差异",
        severity: "warning",
        title: `高密度差异区域 ${index + 1}`,
        summary: `该区域包含 ${region.changedPixels.toLocaleString()} 个变化像素，区域差异密度 ${(region.density * 100).toFixed(1)}%。`,
        suggestion: "在叠加视图中检查该区域，再结合元素级规则确认具体属性。",
        box: region,
        rule: "visual_region"
      })
    );
  });

  const matching = elementMatches(
    design.elements,
    capture.elements,
    design.viewport,
    config.thresholds.matchConfidenceMin
  );

  for (const match of matching.matches) {
    const { design: expected, actual, confidence } = match;
    const common = {
      selector: actual.selector,
      figmaNodeId: expected.id,
      confidence,
      box: actual.box
    };
    const positionDelta = Math.hypot(expected.box.x - actual.box.x, expected.box.y - actual.box.y);
    const sizeDelta = Math.max(
      Math.abs(expected.box.width - actual.box.width),
      Math.abs(expected.box.height - actual.box.height)
    );

    if (positionDelta > config.thresholds.positionTolerancePx) {
      const severity = confidenceSeverity(
        severityFor(config, "position", "error"),
        confidence,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: "布局",
            severity,
            title: `${expected.name} 位置偏移`,
            summary: `元素位置偏移 ${round(positionDelta)}px，超过允许值 ${config.thresholds.positionTolerancePx}px。`,
            expected: `x ${formatPx(expected.box.x)} · y ${formatPx(expected.box.y)}`,
            actual: `x ${formatPx(actual.box.x)} · y ${formatPx(actual.box.y)}`,
            suggestion: `检查 ${actual.selector} 的定位、容器 padding、margin 和对齐方式。`,
            rule: "position"
          })
        );
      }
    }

    if (sizeDelta > config.thresholds.sizeTolerancePx) {
      const severity = confidenceSeverity(
        severityFor(config, "size", "error"),
        confidence,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: "布局",
            severity,
            title: `${expected.name} 尺寸不一致`,
            summary: `最大尺寸差 ${round(sizeDelta)}px，超过允许值 ${config.thresholds.sizeTolerancePx}px。`,
            expected: `${formatPx(expected.box.width)} × ${formatPx(expected.box.height)}`,
            actual: `${formatPx(actual.box.width)} × ${formatPx(actual.box.height)}`,
            suggestion: `调整 ${actual.selector} 的 width、height、padding 或 box-sizing。`,
            rule: "size"
          })
        );
      }
    }

    if (normalizeText(expected.text) && normalizeText(expected.text) !== normalizeText(actual.text)) {
      const severity = confidenceSeverity(
        severityFor(config, "content", "error"),
        confidence,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: "内容",
            severity,
            title: `${expected.name} 文案不一致`,
            summary: "映射元素的可见文本与设计稿不同。",
            expected: expected.text,
            actual: actual.text || "空文本",
            suggestion: `核对 ${actual.selector} 的文案和国际化资源。`,
            rule: "content"
          })
        );
      }
    }

    const typographyDifferences: string[] = [];
    if (
      expected.style.fontSize !== undefined &&
      actual.style.fontSize !== undefined &&
      Math.abs(expected.style.fontSize - actual.style.fontSize) > config.thresholds.fontSizeTolerancePx
    ) {
      typographyDifferences.push(
        `font-size ${formatPx(actual.style.fontSize)} → ${formatPx(expected.style.fontSize)}`
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
      expected.style.lineHeight !== undefined &&
      actual.style.lineHeight !== undefined &&
      Math.abs(expected.style.lineHeight - actual.style.lineHeight) > 2
    ) {
      typographyDifferences.push(
        `line-height ${formatPx(actual.style.lineHeight)} → ${formatPx(expected.style.lineHeight)}`
      );
    }
    if (typographyDifferences.length) {
      const severity = confidenceSeverity(
        severityFor(config, "typography", "error"),
        confidence,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: "排版",
            severity,
            title: `${expected.name} 排版属性不一致`,
            summary: typographyDifferences.join("；"),
            suggestion: `按设计值调整 ${actual.selector} 的字体相关 CSS。`,
            rule: "typography"
          })
        );
      }
    }

    const expectedColor = expected.style.color ?? expected.style.backgroundColor;
    const actualColor = expected.style.color ? actual.style.color : actual.style.backgroundColor;
    const delta = colorDeltaE(expectedColor, actualColor);
    if (delta !== undefined && delta > config.thresholds.colorDeltaE) {
      const severity = confidenceSeverity(
        severityFor(config, "color", "warning"),
        confidence,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: "颜色",
            severity,
            title: `${expected.name} 颜色存在差异`,
            summary: `颜色差 ΔE ${round(delta)}，超过允许值 ${config.thresholds.colorDeltaE}。`,
            expected: expectedColor,
            actual: actualColor,
            suggestion: `将 ${actual.selector} 的颜色调整为设计值，并检查透明度与父层叠加。`,
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
        `border-radius ${formatPx(actual.style.borderRadius)} → ${formatPx(expected.style.borderRadius)}`
      );
    }
    if (
      expected.style.borderWidth !== undefined &&
      actual.style.borderWidth !== undefined &&
      Math.abs(expected.style.borderWidth - actual.style.borderWidth) > 1
    ) {
      decorationDifferences.push(
        `border-width ${formatPx(actual.style.borderWidth)} → ${formatPx(expected.style.borderWidth)}`
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
        confidence,
        config.thresholds.highConfidenceMin
      );
      if (severity) {
        issues.push(
          create({
            ...common,
            category: "装饰",
            severity,
            title: `${expected.name} 装饰属性不一致`,
            summary: decorationDifferences.join("；"),
            suggestion: `按设计值调整 ${actual.selector} 的边框、圆角或透明度。`,
            rule: "decoration"
          })
        );
      }
    }
  }

  const missingSeverity = severityFor(config, "missing_element", "error");
  for (const element of matching.unmatchedDesign.slice(0, 40)) {
    if (!missingSeverity) break;
    const isCritical =
      config.criticalFigmaNodes.includes(element.id) ||
      Boolean(element.text) ||
      /button|cta|logo|input|按钮|输入|图标/i.test(element.name);
    issues.push(
      create({
        category: "元素匹配",
        severity: isCritical ? missingSeverity : "pending",
        title: `${element.name} 未在 H5 中匹配`,
        summary: isCritical
          ? "关键设计元素无法在实际页面中找到。"
          : "该视觉节点没有可靠的 DOM 映射，需要人工确认。",
        expected: element.text || `${round(element.box.width)} × ${round(element.box.height)}px`,
        actual: "未匹配",
        suggestion: `确认元素是否缺失；必要时为对应 DOM 增加 data-figma-id="${element.id}"。`,
        figmaNodeId: element.id,
        box: element.box,
        rule: "missing_element"
      })
    );
  }

  const extraSeverity = severityFor(config, "extra_element", "warning");
  if (extraSeverity && design.elements.length > 0) {
    const meaningfulExtras = matching.unmatchedDom.filter(
      (element) =>
        element.dataFigmaId ||
        ["button", "a", "img", "input", "textarea", "select", "h1", "h2", "h3", "h4", "p"].includes(element.tag)
    );
    for (const element of meaningfulExtras.slice(0, 20)) {
      issues.push(
        create({
          category: "元素匹配",
          severity: extraSeverity,
          title: "H5 中可能存在额外元素",
          summary: `${element.selector}${element.text ? ` 显示“${element.text.slice(0, 50)}”` : ""}，未匹配到设计节点。`,
          suggestion: "确认它是否为设计稿未包含的新增内容；若是误判，可增加 data-figma-id 或忽略选择器。",
          selector: element.selector,
          box: element.box,
          rule: "extra_element"
        })
      );
    }
  }

  for (const audit of capture.audits) {
    const issue = issueForAudit(audit, config, create);
    if (issue) issues.push(issue);
  }

  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return {
    referenceImage,
    actualImage,
    diffImage: visual.diff,
    similarity: visual.similarity,
    issues,
    matchedElements: matching.matches.length
  };
}
