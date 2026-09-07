import { chromium, type Browser } from "playwright";
import type { AcceptanceConfig, Box, DomElement, ElementStyle } from "../src/types";
import { localText, type Locale } from "./i18n";

export interface StaticAudit {
  rule: "broken_image" | "horizontal_overflow" | "clipped_text";
  selector: string;
  summary: string;
  box?: Box;
}

export interface PageCapture {
  image: Buffer;
  elements: DomElement[];
  audits: StaticAudit[];
  diagnostics: string[];
  finalUrl: string;
}

interface BrowserElement {
  selector: string;
  tag: string;
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

export async function capturePage(
  inputUrl: string,
  viewport: { width: number; height: number },
  config: AcceptanceConfig,
  locale: Locale,
  providedBrowser?: Browser
): Promise<PageCapture> {
  const url = validatePageUrl(inputUrl, locale);
  const browser = providedBrowser ?? (await launchBrowser());
  const context = await browser.newContext({
    viewport: {
      width: Math.round(viewport.width),
      height: Math.round(viewport.height)
    },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  // tsx/esbuild preserves inner function names with a tiny __name helper. Playwright
  // serializes page callbacks without that module helper, so expose a no-op equivalent
  // in the isolated browser document used by this throwaway prototype.
  await page.addInitScript({ content: "globalThis.__name = (target) => target;" });
  const diagnostics: string[] = [];

  try {
    await page.goto(url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: config.capture.timeoutMs
    });

    if (config.capture.waitForSelector) {
      await page.waitForSelector(config.capture.waitForSelector, {
        state: "visible",
        timeout: config.capture.timeoutMs
      });
      diagnostics.push(localText(locale, `已等待选择器：${config.capture.waitForSelector}`, `Waited for selector: ${config.capture.waitForSelector}`));
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
      const images = Array.from(document.images);
      await Promise.all(
        images.map(async (image) => {
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
    for (const selector of config.ignore) {
      const isValid = await page.evaluate((candidate) => {
        try {
          document.querySelector(candidate);
          return true;
        } catch {
          return false;
        }
      }, selector);
      if (isValid) validIgnoreSelectors.push(selector);
      else diagnostics.push(localText(locale, `忽略了无效 CSS 选择器：${selector}`, `Ignored invalid CSS selector: ${selector}`));
    }
    if (validIgnoreSelectors.length) {
      await page.addStyleTag({
        content: `${validIgnoreSelectors.join(",")} { visibility: hidden !important; }`
      });
    }

    const isStable = await stableLayout(page, config.capture.settleMs);
    diagnostics.push(isStable
      ? localText(locale, "页面布局已稳定。", "The page layout stabilized.")
      : localText(locale, "页面在等待窗口内仍有布局变化，结果可能含动态噪声。", "The layout was still changing after the wait window, so the result may contain dynamic noise."));

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
        const selectorFor = (element: Element): string => {
          const html = element as HTMLElement;
          if (html.id) return `#${CSS.escape(html.id)}`;
          const figmaId = html.dataset.figmaId;
          if (figmaId) return `[data-figma-id="${CSS.escape(figmaId)}"]`;
          const parts: string[] = [];
          let cursor: Element | null = element;
          while (cursor && cursor !== document.body && parts.length < 4) {
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
          return `body > ${parts.join(" > ")}`;
        };

        const elements: BrowserElement[] = [];
        const audits: StaticAudit[] = [];
        const semanticTags = new Set([
          "A",
          "BUTTON",
          "IMG",
          "SVG",
          "INPUT",
          "TEXTAREA",
          "SELECT",
          "LABEL",
          "H1",
          "H2",
          "H3",
          "H4",
          "H5",
          "H6",
          "P"
        ]);

        for (const element of Array.from(document.body.querySelectorAll("*"))) {
          if (ignoredElements.has(element) || element.closest(ignored.join(",") || ":not(*)")) continue;
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

          const text = directText(element);
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
            borderWidth > 0;

          if (useful && elements.length < 1500) {
            elements.push({
              selector: selectorFor(element),
              tag: element.tagName.toLowerCase(),
              dataFigmaId: html.dataset.figmaId,
              text: text || undefined,
              box: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              style: {
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                fontFamily: computed.fontFamily,
                fontSize: number(computed.fontSize),
                fontWeight: number(computed.fontWeight),
                lineHeight: number(computed.lineHeight),
                letterSpacing: number(computed.letterSpacing),
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
          const clipsContent = ["hidden", "clip"].includes(computed.overflow) ||
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
              summary: isEnglish ? `Text may be clipped: “${text.slice(0, 60)}”` : `文本可能被截断：“${text.slice(0, 60)}”`,
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

        return { elements, audits };
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

    diagnostics.push(localText(locale, `已提取 ${analysis.elements.length} 个可见 H5 元素。`, `Extracted ${analysis.elements.length} visible H5 elements.`));
    return {
      image: Buffer.from(screenshot),
      elements: analysis.elements,
      audits: analysis.audits,
      diagnostics,
      finalUrl: page.url()
    };
  } finally {
    await context.close();
    if (!providedBrowser) await browser.close();
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
