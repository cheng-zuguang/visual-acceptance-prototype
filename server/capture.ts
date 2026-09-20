import { chromium, type Browser } from "playwright";
import sharp from "sharp";
import type {
  AcceptanceConfig,
  ActualEvidenceElement,
  ActualScrollPosition,
  Box,
  DomElement,
  ElementStyle,
  LiveActualEvidence,
  StaticAudit
} from "../src/types";
import { localText, type Locale } from "./i18n";

export interface PageCapture {
  coverage?: import("../src/types").ActualCaptureCoverage;
  scroll?: ActualScrollPosition;
  image: Buffer;
  elements: DomElement[];
  audits: StaticAudit[];
  diagnostics: string[];
  finalUrl: string;
}

export interface LiveCaptureSession {
  finalUrl: string;
  diagnostics: string[];
  captureSample: (scrollY?: number) => Promise<Pick<PageCapture, "image" | "elements" | "audits" | "coverage" | "scroll">>;
  close: () => Promise<void>;
}

export interface ScrolledLiveActualEvidence {
  scrollY: number;
  evidence: LiveActualEvidence;
}

export interface BrowserCaptureCredential {
  extraHTTPHeaders?: Record<string, string>;
  cookies?: Array<{
    name: string;
    value: string;
    url?: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  }>;
}

export interface LiveCaptureDependencies {
  openSession: (input: {
    url: string;
    viewport: { width: number; height: number };
    config: AcceptanceConfig;
    locale: Locale;
    validateUrl?: (url: string) => Promise<void>;
    browserCredential?: BrowserCaptureCredential;
  }) => Promise<LiveCaptureSession>;
  wait: (durationMs: number) => Promise<void>;
  now: () => number;
  validateUrl?: (url: string) => Promise<void>;
  browserCredential?: BrowserCaptureCredential;
}

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

function fingerprintFor(
  element: DomElement,
  viewport: { width: number; height: number }
): ActualEvidenceElement["fingerprint"] {
  const percent = (value: number, total: number): number =>
    Math.round((value / Math.max(total, 1)) * 100);
  const horizontal =
    element.box.x < viewport.width / 3
      ? "left"
      : element.box.x < (viewport.width * 2) / 3
        ? "center"
        : "right";
  const vertical =
    element.box.y < viewport.height / 3
      ? "top"
      : element.box.y < (viewport.height * 2) / 3
        ? "middle"
        : "bottom";
  const styleFields: Array<[string, unknown]> = [
    ["color", element.style.color],
    ["background", element.style.backgroundColor],
    ["font-family", element.style.fontFamily],
    ["font-size", element.style.fontSize],
    ["font-weight", element.style.fontWeight],
    ["line-height", element.style.lineHeight],
    ["letter-spacing", element.style.letterSpacing],
    ["text-align", element.style.textAlign],
    ["border", element.style.borderColor],
    ["border-width", element.style.borderWidth],
    ["radius", element.style.borderRadius],
    ["opacity", element.style.opacity],
    ["shadow", element.style.boxShadow]
  ];

  return {
    key: element.dataFigmaId
      ? `figma:${element.dataFigmaId.replace(/-/g, ":")}`
      : `dom:${element.tag}:${element.selector}`,
    identitySource: element.dataFigmaId ? "figma-id" : "dom-structure",
    tag: element.tag,
    ...(element.role ? { role: element.role } : {}),
    selector: element.selector,
    region: `${vertical}-${horizontal}`,
    geometryBucket: [
      percent(element.box.x, viewport.width),
      percent(element.box.y, viewport.height),
      percent(element.box.width, viewport.width),
      percent(element.box.height, viewport.height)
    ].join(":"),
    styleSignature: styleFields
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => `${name}=${String(value)}`)
      .join(";")
  };
}

function summarizeElementChanges(
  samples: LiveActualEvidence["samples"]
): LiveActualEvidence["elementChanges"] {
  const observations = new Map<
    string,
    Array<{ sampleIndex: number; element: ActualEvidenceElement }>
  >();

  for (const sample of samples) {
    for (const element of sample.elements) {
      const existing = observations.get(element.fingerprint.key) ?? [];
      existing.push({ sampleIndex: sample.index, element });
      observations.set(element.fingerprint.key, existing);
    }
  }

  return Array.from(observations.entries()).map(([fingerprintKey, entries]) => {
    const distinctTexts = new Set(entries.map(({ element }) => element.text ?? ""));
    const distinctGeometry = new Set(
      entries.map(({ element }) =>
        [element.box.x, element.box.y, element.box.width, element.box.height]
          .map((value) => value.toFixed(2))
          .join(":")
      )
    );
    const distinctStyles = new Set(
      entries.map(({ element }) => element.fingerprint.styleSignature)
    );

    return {
      fingerprintKey,
      selector: entries[0].element.selector,
      observedSampleIndexes: entries.map(({ sampleIndex }) => sampleIndex),
      presentInAllSamples: entries.length === samples.length,
      textChanged: distinctTexts.size > 1,
      geometryChanged: distinctGeometry.size > 1,
      styleChanged: distinctStyles.size > 1,
      observedTexts: Array.from(
        new Set(
          entries
            .map(({ element }) => element.text)
            .filter((text): text is string => text !== undefined)
        )
      )
    };
  });
}

async function buildPixelVariance(
  samples: LiveActualEvidence["samples"],
  viewport: { width: number; height: number },
  threshold: number
): Promise<LiveActualEvidence["pixelVariance"]> {
  const width = Math.max(1, Math.round(viewport.width));
  const height = Math.max(1, Math.round(viewport.height));
  const frames = await Promise.all(
    samples.map((sample) =>
      sharp(sample.image)
        .resize(width, height, { fit: "fill" })
        .ensureAlpha()
        .raw()
        .toBuffer()
    )
  );
  const variance = Buffer.alloc(width * height * 4);
  let changedPixelCount = 0;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    let largestChannelRange = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const values = frames.map((frame) => frame[offset + channel]);
      largestChannelRange = Math.max(
        largestChannelRange,
        Math.max(...values) - Math.min(...values)
      );
    }
    if (largestChannelRange / 255 > threshold) {
      changedPixelCount += 1;
      variance[offset] = 255;
      variance[offset + 1] = 0;
      variance[offset + 2] = 128;
      variance[offset + 3] = Math.max(96, largestChannelRange);
    }
  }

  return {
    image: await sharp(variance, {
      raw: { width, height, channels: 4 }
    })
      .png()
      .toBuffer(),
    changedPixelCount,
    changedPixelRatio: changedPixelCount / (width * height),
    threshold
  };
}

async function collectLiveEvidence(input: {
  session: LiveCaptureSession;
  inputUrl: string;
  viewport: { width: number; height: number };
  config: AcceptanceConfig;
  locale: Locale;
  waitForInterval: (durationMs: number) => Promise<void>;
  now: () => number;
  scrollY?: number;
}): Promise<LiveActualEvidence> {
  const samples: LiveActualEvidence["samples"] = [];
  for (let index = 0; index < input.config.capture.samples; index += 1) {
    const sample = await input.session.captureSample(input.scrollY);
    samples.push({
      ...sample,
      elements: sample.elements.map((element) => ({
        ...element,
        fingerprint: fingerprintFor(element, input.viewport)
      })),
      index,
      capturedAtMs: input.now()
    });
    if (index < input.config.capture.samples - 1) {
      await input.waitForInterval(input.config.capture.sampleIntervalMs);
    }
  }
  return {
    kind: "live",
    sourceUrl: input.inputUrl,
    finalUrl: input.session.finalUrl,
    viewport: input.viewport,
    samples,
    canonicalSampleIndex: samples.length - 1,
    elementChanges: summarizeElementChanges(samples),
    pixelVariance: await buildPixelVariance(samples, input.viewport, input.config.thresholds.pixelThreshold),
    diagnostics: [
      ...input.session.diagnostics,
      input.scrollY === undefined
        ? localText(
            input.locale,
            `已在同一页面会话中采集 ${samples.length} 个样本。`,
            `Captured ${samples.length} samples in the same page session.`
          )
        : localText(
            input.locale,
            `已在滚动位置 ${input.scrollY}px 采集 ${samples.length} 个 H5 样本。`,
            `Captured ${samples.length} H5 samples at scroll offset ${input.scrollY}px.`
          )
    ]
  };
}

export async function captureLiveActualEvidence(
  inputUrl: string,
  viewport: { width: number; height: number },
  config: AcceptanceConfig,
  locale: Locale,
  dependencies: Partial<LiveCaptureDependencies> = {}
): Promise<LiveActualEvidence> {
  const openSession = dependencies.openSession ?? openPlaywrightCaptureSession;
  const waitForInterval = dependencies.wait ?? wait;
  const now = dependencies.now ?? Date.now;
  let session: LiveCaptureSession | undefined;
  let expired = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutError = (): Error =>
    new Error(
      localText(
        locale,
        `Live 页面采集总超时（${config.capture.timeoutMs}ms）。`,
        `Live page capture exceeded the total timeout of ${config.capture.timeoutMs}ms.`
      )
    );

  try {
    const capture = async (): Promise<LiveActualEvidence> => {
      const openedSession = await openSession({
        url: inputUrl,
        viewport,
        config,
        locale,
        validateUrl: dependencies.validateUrl,
        browserCredential: dependencies.browserCredential
      });
      if (expired) {
        await openedSession.close();
        throw timeoutError();
      }
      session = openedSession;
      return collectLiveEvidence({
        session: openedSession,
        inputUrl,
        viewport,
        config,
        locale,
        waitForInterval,
        now
      });
    };

    const timedOut = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () => {
          expired = true;
          reject(timeoutError());
        },
        config.capture.timeoutMs
      );
    });
    return await Promise.race([capture(), timedOut]);
  } finally {
    expired = true;
    if (timeout) clearTimeout(timeout);
    if (session) {
      const openedSession = session;
      session = undefined;
      await openedSession.close();
    }
  }
}

export async function captureLiveActualEvidenceAtScrollOffsets(
  inputUrl: string,
  viewport: { width: number; height: number },
  scrollYs: number[],
  config: AcceptanceConfig,
  locale: Locale,
  dependencies: Partial<LiveCaptureDependencies> = {}
): Promise<ScrolledLiveActualEvidence[]> {
  if (!scrollYs.length || scrollYs.some((scrollY) => !Number.isFinite(scrollY) || scrollY < 0)) {
    throw new Error(localText(locale, "长页面滚动位置必须是非负数。", "Long-page scroll offsets must be non-negative numbers."));
  }
  const openSession = dependencies.openSession ?? openPlaywrightCaptureSession;
  const waitForInterval = dependencies.wait ?? wait;
  const now = dependencies.now ?? Date.now;
  const session = await openSession({
    url: inputUrl,
    viewport,
    config,
    locale,
    validateUrl: dependencies.validateUrl,
    browserCredential: dependencies.browserCredential
  });
  try {
    const results: ScrolledLiveActualEvidence[] = [];
    for (const scrollY of scrollYs) {
      results.push({
        scrollY,
        evidence: await collectLiveEvidence({
          session,
          inputUrl,
          viewport,
          config,
          locale,
          waitForInterval,
          now,
          scrollY
        })
      });
    }
    return results;
  } finally {
    await session.close();
  }
}

interface BrowserElement {
  textInLayoutContainer?: boolean;
  expanded?: boolean;
  expansionEvidence?: "aria-expanded" | "clipped-content-control";
  visuallyObscured?: boolean;
  selector: string;
  parentSelector?: string;
  siblingIndex?: number;
  subtreeSignature?: string;
  tag: string;
  role?: string;
  dataFigmaId?: string;
  text?: string;
  box: Box;
  style: ElementStyle;
}

async function launchBrowser(): Promise<Browser> {
  const args = process.env.CHROMIUM_FLAGS
    ? process.env.CHROMIUM_FLAGS.split(/\s+/).filter(Boolean)
    : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
  try {
    return await chromium.launch({ headless: true, channel: "chrome", args });
  } catch {
    return chromium.launch({ headless: true, args });
  }
}

function validatePageUrl(input: string, locale: Locale): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(localText(locale, "H5 地址格式无效。", "The H5 URL is invalid."));
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(localText(locale, "H5 地址只支持 http 或 https 协议。", "The H5 URL must use HTTP or HTTPS."));
  }
  return url;
}

async function stableLayout(page: import("playwright").Page, settleMs: number): Promise<boolean> {
  if (settleMs <= 0) return true;
  let previous = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const snapshot = await page.evaluate(() => {
      const rects = Array.from(document.body.querySelectorAll("*"))
        .slice(0, 180)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)];
        });
      return JSON.stringify([
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
        rects
      ]);
    });
    if (snapshot === previous) return true;
    previous = snapshot;
    await page.waitForTimeout(settleMs);
  }
  return false;
}

async function capturePreparedPage(
  page: import("playwright").Page,
  validIgnoreSelectors: string[],
  viewport: { width: number; height: number },
  locale: Locale
): Promise<Pick<PageCapture, "image" | "elements" | "audits" | "coverage">> {
  const analysis = await page.evaluate(
    ({ ignored, viewportWidth, viewportHeight, isEnglish }) => {
      const ignoredElements = new Set<Element>();
      for (const selector of ignored) {
        document.querySelectorAll(selector).forEach((element) => ignoredElements.add(element));
      }

      const number = (value: string): number | undefined => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      const directText = (element: Element): string =>
        Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 300);
      const figmaIdCounts = new Map<string, number>();
      document.querySelectorAll("[data-figma-id]").forEach((element) => {
        const id = element.getAttribute("data-figma-id")!.replace(/-/g, ":");
        figmaIdCounts.set(id, (figmaIdCounts.get(id) ?? 0) + 1);
      });
      const uniqueFigmaId = (element: Element): string | undefined => {
        const id = element.getAttribute("data-figma-id");
        return id && figmaIdCounts.get(id.replace(/-/g, ":")) === 1 ? id : undefined;
      };
      const selectorCache = new Map<Element, string>();
      const selectorFor = (element: Element): string => {
        const cached = selectorCache.get(element);
        if (cached) return cached;
        const html = element as HTMLElement;
        if (html.id && document.querySelectorAll(`#${CSS.escape(html.id)}`).length === 1) {
          return `#${CSS.escape(html.id)}`;
        }
        const figmaId = uniqueFigmaId(element);
        if (figmaId) return `[data-figma-id="${CSS.escape(figmaId)}"]`;
        const parts: string[] = [];
        let cursor: Element | null = element;
        // A body-rooted selector must retain the complete ancestry. Truncating
        // it aliases deep containers and leaves and corrupts temporal identity.
        while (cursor && cursor !== document.body) {
          let part = cursor.tagName.toLowerCase();
          const parentElement: Element | null = cursor.parentElement;
          if (parentElement) {
            const siblings = (Array.from(parentElement.children) as Element[]).filter(
              (sibling) => sibling.tagName === cursor!.tagName
            );
            if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(cursor) + 1})`;
          }
          parts.unshift(part);
          cursor = parentElement;
        }
        const selector = `body > ${parts.join(" > ")}`;
        selectorCache.set(element, selector);
        return selector;
      };
      const subtreeSignatureFor = (element: Element, depth = 0): string => {
        const tag = element.tagName.toLowerCase();
        const classes = Array.from(element.classList)
          .sort()
          .slice(0, 3)
          .map((className) => `.${className}`)
          .join("");
        const role = element.getAttribute("role");
        const marker = `${tag}${classes}${role ? `[role=${role}]` : ""}`;
        if (depth >= 2) return marker;
        const children = Array.from(element.children).slice(0, 12);
        return children.length
          ? `${marker}>${children.map((child) => subtreeSignatureFor(child, depth + 1)).join("+")}`
          : marker;
      };

      const elements: BrowserElement[] = [];
      const capturedSelectors = new Map<Element, string>();
      const audits: StaticAudit[] = [];
      const semanticTags = new Set([
        "A", "BUTTON", "IMG", "SVG", "INPUT", "TEXTAREA", "SELECT", "LABEL",
        "H1", "H2", "H3", "H4", "H5", "H6", "P"
      ]);

      for (const element of Array.from(document.body.querySelectorAll("*"))) {
        if (ignoredElements.has(element) || element.closest(ignored.join(",") || ":not(*)")) {
          continue;
        }
        const html = element as HTMLElement;
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        if (
          computed.display === "none" ||
          computed.visibility === "hidden" ||
          Number(computed.opacity) === 0 ||
          rect.width <= 1 ||
          rect.height <= 1 ||
          rect.right <= 0 ||
          rect.bottom <= 0 ||
          rect.left >= viewportWidth ||
          rect.top >= viewportHeight
        ) {
          continue;
        }

        let visuallyObscured = false;
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
          const filter = getComputedStyle(ancestor).filter;
          const blur = filter.match(/blur\(([\d.]+)px\)/);
          if (blur && Number(blur[1]) > 0) { visuallyObscured = true; break; }
        }
        const text = directText(element);
        let clippedExpansion = false;
        if (/^(展开|展开更多|expand|show more)$/i.test(text.trim())) {
          let owner = element.parentElement;
          for (let depth = 0; owner && depth < 3; depth++, owner = owner.parentElement) {
            if (Array.from(owner.children).some(child => !child.contains(element) &&
              /hidden|clip/.test(getComputedStyle(child).overflowY) && child.scrollHeight > child.clientHeight + 4)) {
              clippedExpansion = true; break;
            }
          }
        }
        let textInLayoutContainer = false;
        if (text && computed.display !== "inline") {
          const range = document.createRange();
          range.selectNodeContents(element);
          const textRect = range.getBoundingClientRect();
          textInLayoutContainer = element.children.length > 0 ||
            Math.abs(rect.width - textRect.width) > 4 || rect.height - textRect.height > 8;
        }
        const borderWidth = Math.max(
          number(computed.borderTopWidth) ?? 0,
          number(computed.borderRightWidth) ?? 0,
          number(computed.borderBottomWidth) ?? 0,
          number(computed.borderLeftWidth) ?? 0
        );
        const hasBackground = !["rgba(0, 0, 0, 0)", "transparent"].includes(
          computed.backgroundColor
        );
        const useful =
          Boolean(html.dataset.figmaId) ||
          semanticTags.has(element.tagName) ||
          Boolean(text) ||
          hasBackground ||
          borderWidth > 0 ||
          element.children.length > 0;

        if (useful && elements.length < 1500) {
          // Parent links describe the captured tree, skipping wrappers with no
          // visual box. Never publish a link to an absent observation.
          let parentElement = element.parentElement;
          while (parentElement && parentElement !== document.body && !capturedSelectors.has(parentElement)) {
            parentElement = parentElement.parentElement;
          }
          const selector = selectorFor(element);
          capturedSelectors.set(element, selector);
          elements.push({
            selector,
            parentSelector: parentElement ? capturedSelectors.get(parentElement) : undefined,
            siblingIndex: element.parentElement
              ? Array.from(element.parentElement.children).indexOf(element)
              : undefined,
            subtreeSignature: subtreeSignatureFor(element),
            tag: element.tagName.toLowerCase(),
            role: html.getAttribute("role") || undefined,
            // Repeated component annotations are not unique correspondence IDs.
            dataFigmaId: uniqueFigmaId(element),
            text: text || undefined,
            textInLayoutContainer,
            visuallyObscured,
            ...(["true", "false"].includes(html.getAttribute("aria-expanded") ?? "")
              ? { expanded: html.getAttribute("aria-expanded") === "true", expansionEvidence: "aria-expanded" as const }
              : clippedExpansion ? { expanded: false, expansionEvidence: "clipped-content-control" as const } : {}),
            ...(/^\d+(?:\.\d+)?%$/.test(html.style.width) ? { declaredWidthPercent: Number.parseFloat(html.style.width) } : {}),
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            style: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontFamily: computed.fontFamily,
              fontSize: number(computed.fontSize),
              fontWeight: number(computed.fontWeight),
              lineHeight: number(computed.lineHeight),
              letterSpacing: number(computed.letterSpacing),
              textAlign: computed.textAlign,
              borderColor: computed.borderTopColor,
              borderWidth,
              borderRadius: number(computed.borderTopLeftRadius),
              opacity: number(computed.opacity),
              boxShadow: computed.boxShadow === "none" ? undefined : computed.boxShadow
            }
          });
        }

        if (element instanceof HTMLImageElement && element.complete && element.naturalWidth === 0) {
          audits.push({
            rule: "broken_image",
            selector: selectorFor(element),
            summary: isEnglish ? "The image asset failed to load." : "图片资源加载失败。",
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          });
        }
        const clipsContent =
          ["hidden", "clip"].includes(computed.overflow) ||
          ["hidden", "clip"].includes(computed.overflowX) ||
          ["hidden", "clip"].includes(computed.overflowY);
        if (
          text &&
          clipsContent &&
          (html.scrollWidth > html.clientWidth + 1 || html.scrollHeight > html.clientHeight + 1)
        ) {
          audits.push({
            rule: "clipped_text",
            selector: selectorFor(element),
            summary: isEnglish
              ? `Text may be clipped: “${text.slice(0, 60)}”`
              : `文本可能被截断：“${text.slice(0, 60)}”`,
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          });
        }
      }

      if (document.documentElement.scrollWidth > viewportWidth + 1) {
        audits.push({
          rule: "horizontal_overflow",
          selector: "html",
          summary: isEnglish
            ? `The page width of ${document.documentElement.scrollWidth}px exceeds the ${viewportWidth}px viewport.`
            : `页面横向宽度 ${document.documentElement.scrollWidth}px 超出视口 ${viewportWidth}px。`
        });
      }

      const visible = (element: Element): boolean => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 1 && rect.height > 1 && style.display !== "none" &&
          style.visibility !== "hidden" && Number(style.opacity) !== 0;
      };
      const visibleElements = Array.from(document.body.querySelectorAll("*")).filter(visible);
      const clippedElements = visibleElements.filter(element => {
        const style = getComputedStyle(element);
        return ((element.scrollHeight > element.clientHeight + 1 && /auto|scroll|hidden|clip/.test(style.overflowY)) ||
          (element.scrollWidth > element.clientWidth + 1 && /auto|scroll|hidden|clip/.test(style.overflowX)));
      });
      const limitations = clippedElements.map(element => {
        const rect = element.getBoundingClientRect();
        return { selector: selectorFor(element),
          reason: element.children.length === 0 && Boolean(element.textContent?.trim()) ? "text-clipping" as const : "scroll-container" as const,
          box: { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height }
        };
      });
      const documentBoundsComplete = window.scrollY === 0 && window.scrollX === 0 &&
        document.documentElement.scrollHeight <= viewportHeight + 1 && document.documentElement.scrollWidth <= viewportWidth + 1;
      return { elements, audits, coverage: {
        fullDocument: documentBoundsComplete && limitations.length === 0,
        ...(limitations.length ? { documentBoundsComplete, limitations } : {}),
        elementLimitReached: elements.length >= 1500,
        opaqueContent: visibleElements.some(element => element.matches("canvas,iframe,object,embed") || Boolean(element.shadowRoot)),
        excludedContent: ignoredElements.size > 0
      } };
    },
    {
      ignored: validIgnoreSelectors,
      viewportWidth: Math.round(viewport.width),
      viewportHeight: Math.round(viewport.height),
      isEnglish: locale === "en"
    }
  );
  const screenshot = await page.screenshot({
    type: "png",
    fullPage: false,
    animations: "disabled",
    caret: "hide",
    scale: "css"
  });
  return {
    image: Buffer.from(screenshot),
    elements: analysis.elements,
    audits: analysis.audits,
    coverage: analysis.coverage
  };
}

async function scrollPageToOffset(
  page: import("playwright").Page,
  targetY: number,
  viewport: { width: number; height: number }
): Promise<ActualScrollPosition> {
  return page.evaluate(({ targetY, viewportWidth, viewportHeight }) => {
    const requiredHeight = targetY + viewportHeight;
    const currentHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    const innerScrollers = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return /auto|scroll/.test(style.overflowY) &&
          element.scrollHeight > element.clientHeight + 1 &&
          element.scrollHeight - element.clientHeight >= targetY &&
          rect.width >= viewportWidth * 0.7 &&
          rect.height >= viewportHeight * 0.5 &&
          rect.right > 0 && rect.bottom > 0 &&
          rect.left < viewportWidth && rect.top < viewportHeight;
      })
      .sort((left, right) => {
        const leftBox = left.getBoundingClientRect();
        const rightBox = right.getBoundingClientRect();
        return rightBox.width * rightBox.height - leftBox.width * leftBox.height;
      });
    const requiresInnerScroller = currentHeight <= viewportHeight + 1 || requiredHeight > currentHeight;
    if (requiresInnerScroller && innerScrollers.length > 1) {
      return {
        target: "unresolved" as const,
        requestedY: targetY,
        actualY: window.scrollY,
        scrollHeight: currentHeight,
        clientHeight: document.documentElement.clientHeight
      };
    }
    if (requiresInnerScroller && innerScrollers.length === 1) {
      const target = innerScrollers[0];
      target.scrollTo(0, targetY);
      const selector = (() => {
        if (target.id && document.querySelectorAll(`#${CSS.escape(target.id)}`).length === 1) {
          return `#${CSS.escape(target.id)}`;
        }
        const parts: string[] = [];
        let cursor: Element | null = target;
        while (cursor && cursor !== document.body) {
          let part = cursor.tagName.toLowerCase();
          const parentElement: Element | null = cursor.parentElement;
          if (parentElement) {
            const siblings = (Array.from(parentElement.children) as Element[])
              .filter(sibling => sibling.tagName === cursor!.tagName);
            if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(cursor) + 1})`;
          }
          parts.unshift(part);
          cursor = parentElement;
        }
        return `body > ${parts.join(" > ")}`;
      })();
      return {
        target: "element" as const,
        selector,
        requestedY: targetY,
        actualY: target.scrollTop,
        scrollHeight: target.scrollHeight,
        clientHeight: target.clientHeight
      };
    }
    let spacer = document.querySelector<HTMLElement>("[data-difflab-scroll-spacer]");
    if (requiredHeight > currentHeight) {
      if (!spacer) {
        spacer = document.createElement("div");
        spacer.dataset.difflabScrollSpacer = "true";
        spacer.dataset.difflabBaseHeight = String(currentHeight);
        spacer.setAttribute("aria-hidden", "true");
        spacer.style.cssText = `position:absolute;left:0;top:${currentHeight}px;width:1px;pointer-events:none;visibility:hidden`;
        document.body.append(spacer);
      }
      const baseHeight = Number(spacer.dataset.difflabBaseHeight ?? currentHeight);
      spacer.style.height = `${Math.max(0, requiredHeight - baseHeight)}px`;
    }
    window.scrollTo(0, targetY);
    return {
      target: "document" as const,
      selector: "html",
      requestedY: targetY,
      actualY: window.scrollY,
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      clientHeight: document.documentElement.clientHeight
    };
  }, {
    targetY,
    viewportWidth: Math.round(viewport.width),
    viewportHeight: Math.round(viewport.height)
  });
}

async function openPlaywrightCaptureSession(input: {
  url: string;
  viewport: { width: number; height: number };
  config: AcceptanceConfig;
  locale: Locale;
  validateUrl?: (url: string) => Promise<void>;
  browserCredential?: BrowserCaptureCredential;
}, providedBrowser?: Browser): Promise<LiveCaptureSession> {
  const url = validatePageUrl(input.url, input.locale);
  await input.validateUrl?.(url.toString());
  const browser = providedBrowser ?? (await launchBrowser());
  const context = await browser.newContext({
    viewport: {
      width: Math.round(input.viewport.width),
      height: Math.round(input.viewport.height)
    },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
    ...(input.browserCredential?.extraHTTPHeaders
      ? { extraHTTPHeaders: input.browserCredential.extraHTTPHeaders }
      : {})
  });
  if (input.browserCredential?.cookies?.length) {
    await context.addCookies(input.browserCredential.cookies as Parameters<typeof context.addCookies>[0]);
  }
  const page = await context.newPage();
  const diagnostics: string[] = [];
  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await context.close();
    if (!providedBrowser) await browser.close();
  };

  try {
    await page.addInitScript({ content: "globalThis.__name = (target) => target;" });
    if (input.validateUrl) {
      await page.route("**/*", async (route) => {
        const requestUrl = route.request().url();
        if (!/^https?:/i.test(requestUrl)) {
          await route.continue();
          return;
        }
        try {
          await input.validateUrl!(requestUrl);
          await route.continue();
        } catch {
          await route.abort("blockedbyclient");
        }
      });
    }
    await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: input.config.capture.timeoutMs
    });
    await input.validateUrl?.(page.url());
    if (input.config.capture.waitForSelector) {
      await page.waitForSelector(input.config.capture.waitForSelector, {
        state: "visible",
        timeout: input.config.capture.timeoutMs
      });
      diagnostics.push(
        localText(
          input.locale,
          `已等待选择器：${input.config.capture.waitForSelector}`,
          `Waited for selector: ${input.config.capture.waitForSelector}`
        )
      );
    }
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: 0s !important;
          animation-duration: 0s !important;
          animation-iteration-count: 1 !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
          transition-delay: 0s !important;
          transition-duration: 0s !important;
        }
      `
    });
    await page.evaluate(async () => {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images).map(async (image) => {
          if (image.complete) {
            await image.decode?.().catch(() => undefined);
            return;
          }
          await Promise.race([
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            }),
            new Promise<void>((resolve) => window.setTimeout(resolve, 2500))
          ]);
        })
      );
    });

    const validIgnoreSelectors: string[] = [];
    for (const selector of input.config.ignore) {
      const isValid = await page.evaluate((candidate) => {
        try {
          document.querySelector(candidate);
          return true;
        } catch {
          return false;
        }
      }, selector);
      if (isValid) validIgnoreSelectors.push(selector);
      else {
        diagnostics.push(
          localText(
            input.locale,
            `忽略了无效 CSS 选择器：${selector}`,
            `Ignored invalid CSS selector: ${selector}`
          )
        );
      }
    }
    if (validIgnoreSelectors.length) {
      await page.addStyleTag({
        content: `${validIgnoreSelectors.join(",")} { visibility: hidden !important; }`
      });
    }
    const isStable = await stableLayout(page, input.config.capture.settleMs);
    diagnostics.push(
      isStable
        ? localText(input.locale, "页面布局已稳定。", "The page layout stabilized.")
        : localText(
            input.locale,
            "页面在等待窗口内仍有布局变化，继续按采样预算采集。",
            "The layout kept changing during the settle window; capture continues within the sampling budget."
          )
    );

    return {
      finalUrl: page.url(),
      diagnostics,
      captureSample: async (scrollY = 0) => {
        const scroll = await scrollPageToOffset(page, scrollY, input.viewport);
        if (scroll.target === "unresolved") {
          const message = localText(
            input.locale,
            "检测到多个主滚动容器，未猜测长页面滚动目标。",
            "Multiple dominant scroll containers were detected; the long-page scroll target was left unresolved."
          );
          if (!diagnostics.includes(message)) diagnostics.push(message);
        }
        if (scrollY > 0 && input.config.capture.settleMs > 0) {
          await page.waitForTimeout(input.config.capture.settleMs);
        }
        return {
          ...(await capturePreparedPage(page, validIgnoreSelectors, input.viewport, input.locale)),
          scroll
        };
      },
      close
    };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function capturePage(
  inputUrl: string,
  viewport: { width: number; height: number },
  config: AcceptanceConfig,
  locale: Locale,
  providedBrowser?: Browser
): Promise<PageCapture> {
  const session = await openPlaywrightCaptureSession(
    { url: inputUrl, viewport, config, locale },
    providedBrowser
  );
  try {
    const sample = await session.captureSample();
    return {
      ...sample,
      diagnostics: [
        ...session.diagnostics,
        localText(
          locale,
          `已提取 ${sample.elements.length} 个可见 H5 元素。`,
          `Extracted ${sample.elements.length} visible H5 elements.`
        )
      ],
      finalUrl: session.finalUrl
    };
  } finally {
    await session.close();
  }
}
export async function withBrowser<T>(callback: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await launchBrowser();
  try {
    return await callback(browser);
  } finally {
    await browser.close();
  }
}
