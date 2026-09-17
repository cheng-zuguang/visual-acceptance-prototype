import sharp from "sharp";
import type {
  Box,
  DesignComponentEvidence,
  DesignComponentProperty,
  DesignComponentPropertyDefinition,
  DesignLayout,
  DesignStyleEvidence,
  DesignTruthNode,
  ElementStyle,
  FigmaDesignTruth
} from "../src/types";
import { localText, type Locale } from "./i18n";

interface FigmaNode {
  id: string;
  name?: string;
  type?: string;
  characters?: string;
  visible?: boolean;
  opacity?: number;
  absoluteBoundingBox?: Box;
  style?: Record<string, unknown>;
  fills?: Array<Record<string, unknown>>;
  strokes?: Array<Record<string, unknown>>;
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  effects?: Array<Record<string, unknown>>;
  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  textAutoResize?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  layoutWrap?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  counterAxisAlignContent?: string;
  counterAxisSpacing?: number;
  layoutAlign?: string;
  layoutGrow?: number;
  layoutPositioning?: string;
  itemReverseZIndex?: boolean;
  strokesIncludedInLayout?: boolean;
  styles?: Record<string, string>;
  componentId?: string;
  componentSetId?: string;
  variantProperties?: Record<string, string>;
  componentProperties?: Record<string, DesignComponentProperty>;
  componentPropertyDefinitions?: Record<string, DesignComponentPropertyDefinition>;
  children?: FigmaNode[];
}

export interface DesignTruthDependencies {
  requestJson?: (url: string, token: string, locale: Locale) => Promise<unknown>;
  fetchImage?: typeof globalThis.fetch;
}

interface FigmaFetchOptions {
  fetch?: typeof globalThis.fetch;
  maxRetries?: number;
  minRequestIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

type FigmaFetch = <T>(url: string, token: string, locale: Locale) => Promise<T>;

const DEFAULT_FIGMA_REQUEST_INTERVAL_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

function retryDelayMs(response: Response, attempt: number, now: number): number {
  const retryAfter = response.headers.get("Retry-After")?.trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const headerDelay = Number.isFinite(seconds)
      ? seconds * 1_000
      : Date.parse(retryAfter) - now;
    if (Number.isFinite(headerDelay) && headerDelay >= 0) {
      return headerDelay;
    }
  }

  return Math.min(1_000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

export function createFigmaFetch(options: FigmaFetchOptions = {}): FigmaFetch {
  const fetchRequest = options.fetch ?? globalThis.fetch;
  const maxRetries = options.maxRetries ?? 2;
  const minRequestIntervalMs = options.minRequestIntervalMs ?? DEFAULT_FIGMA_REQUEST_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let nextRequestAt = 0;
  let rateLimitBlockedUntil = 0;
  let requestQueue = Promise.resolve();

  async function requestOnce(url: string, token: string, attempt: number): Promise<Response> {
    const request = requestQueue.then(async () => {
      const waitMs = Math.max(0, nextRequestAt - now(), rateLimitBlockedUntil - now());
      if (waitMs > 0) await sleep(waitMs);
      nextRequestAt = now() + minRequestIntervalMs;

      const response = await fetchRequest(url, { headers: { "X-Figma-Token": token } });
      if (response.status === 429) {
        rateLimitBlockedUntil = Math.max(
          rateLimitBlockedUntil,
          now() + retryDelayMs(response, attempt, now())
        );
      }
      return response;
    });
    requestQueue = request.then(() => undefined, () => undefined);
    return request;
  }

  return async function figmaFetch<T>(url: string, token: string, locale: Locale): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const response = await requestOnce(url, token, attempt);
      if (response.status === 429 && attempt < maxRetries) continue;
      if (!response.ok) {
        const body = await response.text();
        throw new Error(localText(locale, `Figma API 请求失败（${response.status}）：${body.slice(0, 240)}`, `Figma API request failed (${response.status}): ${body.slice(0, 240)}`));
      }
      return (await response.json()) as T;
    }

    throw new Error(localText(locale, "Figma API 请求重试失败。", "Figma API request retries failed."));
  };
}

const figmaFetch = createFigmaFetch();

function parseFigmaUrl(input: string, locale: Locale): { fileKey: string; nodeId: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error(localText(locale, "Figma 链接格式无效。请粘贴包含 node-id 的 Frame 分享链接。", "The Figma URL is invalid. Paste a Frame share link that includes node-id."));
  }

  const match = url.pathname.match(/^\/(?:design|file|proto)\/([^/]+)/);
  const rawNodeId = url.searchParams.get("node-id");
  if (!match?.[1] || !rawNodeId) {
    throw new Error(localText(locale, "Figma 链接必须指向具体 Frame，并包含 node-id 参数。", "The Figma link must point to a specific Frame and include the node-id parameter."));
  }

  return { fileKey: match[1], nodeId: rawNodeId.replace(/-/g, ":") };
}

function colorFromPaint(paints?: Array<Record<string, unknown>>): string | undefined {
  const paint = paints?.find((item) => item.type === "SOLID" && item.visible !== false);
  if (!paint) return undefined;
  const color = paint.color as Record<string, number> | undefined;
  if (!color) return undefined;
  const channel = (value = 0) => Math.round(Math.min(1, Math.max(0, value)) * 255);
  const alpha = typeof paint.opacity === "number" ? paint.opacity : color.a ?? 1;
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${alpha.toFixed(3)})`;
}

function nodeStyle(node: FigmaNode): ElementStyle {
  const style = node.style ?? {};
  const radii = node.rectangleCornerRadii;
  const shadow = node.effects?.find(
    (effect) => effect.type === "DROP_SHADOW" && effect.visible !== false
  );
  const shadowColor = shadow?.color as Record<string, number> | undefined;
  const shadowOffset = shadow?.offset as Record<string, number> | undefined;

  return {
    color: colorFromPaint(node.type === "TEXT" ? node.fills : undefined),
    backgroundColor: colorFromPaint(node.type === "TEXT" ? undefined : node.fills),
    fontFamily: typeof style.fontFamily === "string" ? style.fontFamily : undefined,
    fontSize: typeof style.fontSize === "number" ? style.fontSize : undefined,
    fontWeight: typeof style.fontWeight === "number" ? style.fontWeight : undefined,
    lineHeight: typeof style.lineHeightPx === "number" ? style.lineHeightPx : undefined,
    letterSpacing: typeof style.letterSpacing === "number" ? style.letterSpacing : undefined,
    textAlign:
      typeof style.textAlignHorizontal === "string"
        ? style.textAlignHorizontal.toLowerCase()
        : undefined,
    borderColor: colorFromPaint(node.strokes),
    borderWidth: typeof node.strokeWeight === "number" ? node.strokeWeight : undefined,
    borderRadius:
      typeof node.cornerRadius === "number"
        ? node.cornerRadius
        : radii?.length
          ? radii.reduce((sum, radius) => sum + radius, 0) / radii.length
          : undefined,
    opacity: typeof node.opacity === "number" ? node.opacity : 1,
    boxShadow:
      shadow && shadowColor
        ? `${shadowOffset?.x ?? 0}px ${shadowOffset?.y ?? 0}px ${Number(shadow.radius ?? 0)}px rgba(${Math.round((shadowColor.r ?? 0) * 255)}, ${Math.round((shadowColor.g ?? 0) * 255)}, ${Math.round((shadowColor.b ?? 0) * 255)}, ${(shadowColor.a ?? 1).toFixed(3)})`
        : undefined
  };
}

function nodeLayout(node: FigmaNode): DesignLayout | undefined {
  const entries = Object.entries({
    mode: node.layoutMode,
    textAutoResize: node.textAutoResize,
    sizingHorizontal: node.layoutSizingHorizontal,
    sizingVertical: node.layoutSizingVertical,
    wrap: node.layoutWrap,
    primaryAxisSizing: node.primaryAxisSizingMode,
    counterAxisSizing: node.counterAxisSizingMode,
    primaryAxisAlign: node.primaryAxisAlignItems,
    counterAxisAlign: node.counterAxisAlignItems,
    counterAxisAlignContent: node.counterAxisAlignContent,
    itemSpacing: node.itemSpacing,
    counterAxisSpacing: node.counterAxisSpacing,
    paddingTop: node.paddingTop,
    paddingRight: node.paddingRight,
    paddingBottom: node.paddingBottom,
    paddingLeft: node.paddingLeft,
    align: node.layoutAlign,
    grow: node.layoutGrow,
    positioning: node.layoutPositioning,
    reverseZIndex: node.itemReverseZIndex,
    strokesIncluded: node.strokesIncludedInLayout
  }).filter(([, value]) => value !== undefined);
  return entries.length ? Object.fromEntries(entries) as DesignLayout : undefined;
}

function nodeStyleEvidence(node: FigmaNode): DesignStyleEvidence | undefined {
  const entries = Object.entries({
    styleIds: node.styles,
    fills: node.fills,
    strokes: node.strokes,
    effects: node.effects
  }).filter(([, value]) => value !== undefined);
  return entries.length ? Object.fromEntries(entries) as DesignStyleEvidence : undefined;
}

function relativeBox(box: Box | undefined, origin: { x: number; y: number }): Box | undefined {
  if (!box) return undefined;
  return {
    x: box.x - origin.x,
    y: box.y - origin.y,
    width: box.width,
    height: box.height
  };
}

function componentEvidence(node: FigmaNode): DesignComponentEvidence | undefined {
  const kind = node.type === "COMPONENT_SET"
    ? "component-set"
    : node.type === "COMPONENT"
      ? "component"
      : node.type === "INSTANCE"
        ? "instance"
        : undefined;
  if (!kind) return undefined;

  return {
    kind,
    componentId: node.componentId,
    componentSetId: node.componentSetId,
    variantProperties: node.variantProperties,
    properties: node.componentProperties,
    propertyDefinitions: node.componentPropertyDefinitions
  };
}

function buildTruthNode(
  node: FigmaNode,
  frameOrigin: { x: number; y: number },
  parent?: FigmaNode
): DesignTruthNode {
  const parentOrigin = parent?.absoluteBoundingBox ?? frameOrigin;
  return {
    id: node.id,
    parentId: parent?.id,
    name: node.name ?? node.type ?? node.id,
    type: node.type ?? "UNKNOWN",
    text: node.characters?.trim() || undefined,
    box: relativeBox(node.absoluteBoundingBox, frameOrigin),
    relativeBox: relativeBox(node.absoluteBoundingBox, parentOrigin),
    style: nodeStyle(node),
    styleEvidence: nodeStyleEvidence(node),
    layout: nodeLayout(node),
    component: componentEvidence(node),
    children: (node.children ?? [])
      .filter((child) => child.visible !== false)
      .map((child) => buildTruthNode(child, frameOrigin, node))
  };
}

function countTruthNodes(node: DesignTruthNode): number {
  return 1 + node.children.reduce((total, child) => total + countTruthNodes(child), 0);
}

export async function buildDesignTruthFromFigma(
  input: {
    frameUrl: string;
    accessToken: string;
    locale: Locale;
  },
  dependencies: DesignTruthDependencies = {}
): Promise<FigmaDesignTruth> {
  if (!input.accessToken.trim()) {
    throw new Error(
      localText(
        input.locale,
        "使用 Figma 链接时必须提供 Figma Access Token。",
        "A Figma Access Token is required when using a Figma link."
      )
    );
  }

  const { fileKey, nodeId } = parseFigmaUrl(input.frameUrl, input.locale);
  const encodedNodeId = encodeURIComponent(nodeId);
  const requestJson = dependencies.requestJson ?? ((url, token, locale) => figmaFetch(url, token, locale));
  const fetchImage = dependencies.fetchImage ?? globalThis.fetch;
  const nodes = (await requestJson(
    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodedNodeId}`,
    input.accessToken,
    input.locale
  )) as {
    name?: string;
    nodes?: Record<string, {
      document?: FigmaNode;
      components?: Record<string, Record<string, unknown>>;
      componentSets?: Record<string, Record<string, unknown>>;
      styles?: Record<string, Record<string, unknown>>;
    }>;
  };
  const nodeEntry = nodes.nodes?.[nodeId];
  const root = nodeEntry?.document;
  if (!root?.absoluteBoundingBox) {
    throw new Error(
      localText(
        input.locale,
        "无法从 Figma 链接读取目标 Frame。",
        "Unable to read the target Frame from the Figma link."
      )
    );
  }

  const rendered = (await requestJson(
    `https://api.figma.com/v1/images/${fileKey}?ids=${encodedNodeId}&format=png&scale=1&use_absolute_bounds=true`,
    input.accessToken,
    input.locale
  )) as { images?: Record<string, string | null> };
  const imageUrl = rendered.images?.[nodeId];
  if (!imageUrl) {
    throw new Error(
      localText(
        input.locale,
        "Figma 没有返回目标 Frame 的渲染图。",
        "Figma did not return a rendered image for the target Frame."
      )
    );
  }

  const imageResponse = await fetchImage(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(
      localText(
        input.locale,
        "下载 Figma Frame 渲染图失败。",
        "Failed to download the rendered Figma Frame image."
      )
    );
  }
  const image = Buffer.from(await imageResponse.arrayBuffer());
  const metadata = await sharp(image).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(
      localText(
        input.locale,
        "无法读取 Figma 渲染图尺寸。",
        "Unable to read the dimensions of the rendered Figma image."
      )
    );
  }

  const truthRoot = buildTruthNode(root, root.absoluteBoundingBox);
  const nodeCount = countTruthNodes(truthRoot);
  return {
    source: {
      kind: "figma",
      fileKey,
      frameId: nodeId,
      fileName: nodes.name,
      frameName: root.name ?? nodeId
    },
    render: {
      image,
      viewport: { width: metadata.width, height: metadata.height }
    },
    root: truthRoot,
    resources: {
      components: nodeEntry?.components ?? {},
      componentSets: nodeEntry?.componentSets ?? {},
      styles: nodeEntry?.styles ?? {}
    },
    diagnostics: [
      localText(
        input.locale,
        `已构建包含 ${nodeCount} 个节点的 DesignTruth。`,
        `Built DesignTruth with ${nodeCount} nodes.`
      )
    ]
  };
}
