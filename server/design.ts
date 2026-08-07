import sharp from "sharp";
import type { Box, DesignElement, ElementStyle } from "../src/types";

export interface DesignSource {
  label: string;
  image: Buffer;
  viewport: { width: number; height: number };
  elements: DesignElement[];
  diagnostics: string[];
}

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
  children?: FigmaNode[];
}

function parseFigmaUrl(input: string): { fileKey: string; nodeId: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Figma 链接格式无效。请粘贴包含 node-id 的 Frame 分享链接。");
  }

  const match = url.pathname.match(/^\/(?:design|file|proto)\/([^/]+)/);
  const rawNodeId = url.searchParams.get("node-id");
  if (!match?.[1] || !rawNodeId) {
    throw new Error("Figma 链接必须指向具体 Frame，并包含 node-id 参数。");
  }

  return { fileKey: match[1], nodeId: rawNodeId.replace(/-/g, ":") };
}

async function figmaFetch<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Figma API 请求失败（${response.status}）：${body.slice(0, 240)}`);
  }
  return (await response.json()) as T;
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

function flattenFigmaNodes(root: FigmaNode): DesignElement[] {
  const rootBox = root.absoluteBoundingBox;
  if (!rootBox) return [];
  const rootX = rootBox.x;
  const rootY = rootBox.y;
  const output: DesignElement[] = [];

  function visit(node: FigmaNode): void {
    if (node.visible === false) return;
    const box = node.absoluteBoundingBox;
    const hasVisualStyle = Boolean(
      colorFromPaint(node.fills) || colorFromPaint(node.strokes) || node.effects?.length
    );
    const isUseful =
      node.id !== root.id &&
      box &&
      (node.type === "TEXT" ||
        !node.children?.length ||
        hasVisualStyle ||
        /button|input|logo|icon|按钮|输入|图标/i.test(node.name ?? ""));

    if (isUseful && box && output.length < 1200) {
      output.push({
        id: node.id,
        name: node.name ?? node.type ?? node.id,
        type: node.type ?? "UNKNOWN",
        text: node.characters?.trim() || undefined,
        box: {
          x: box.x - rootX,
          y: box.y - rootY,
          width: box.width,
          height: box.height
        },
        style: nodeStyle(node)
      });
    }
    node.children?.forEach(visit);
  }

  visit(root);
  return output;
}

export async function designFromFigma(url: string, token: string): Promise<DesignSource> {
  if (!token.trim()) throw new Error("使用 Figma 链接时必须提供 Figma Access Token。");
  const { fileKey, nodeId } = parseFigmaUrl(url);
  const encodedNodeId = encodeURIComponent(nodeId);

  const nodes = await figmaFetch<{
    name?: string;
    nodes?: Record<string, { document?: FigmaNode }>;
  }>(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodedNodeId}`, token);
  const root = nodes.nodes?.[nodeId]?.document;
  if (!root?.absoluteBoundingBox) throw new Error("无法从 Figma 链接读取目标 Frame。");

  const rendered = await figmaFetch<{ images?: Record<string, string | null> }>(
    `https://api.figma.com/v1/images/${fileKey}?ids=${encodedNodeId}&format=png&scale=1&use_absolute_bounds=true`,
    token
  );
  const imageUrl = rendered.images?.[nodeId];
  if (!imageUrl) throw new Error("Figma 没有返回目标 Frame 的渲染图。");
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error("下载 Figma Frame 渲染图失败。");
  const image = Buffer.from(await imageResponse.arrayBuffer());
  const metadata = await sharp(image).metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取 Figma 渲染图尺寸。");
  const elements = flattenFigmaNodes(root);

  return {
    label: `Figma · ${nodes.name ?? fileKey} · ${nodeId}`,
    image,
    viewport: { width: metadata.width, height: metadata.height },
    elements,
    diagnostics: [`已读取 ${elements.length} 个可比对 Figma 节点。`]
  };
}

export async function designFromImage(
  buffer: Buffer,
  originalName: string
): Promise<DesignSource> {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) throw new Error("无法读取上传图片的尺寸。");
  if (metadata.width > 6000 || metadata.height > 6000) {
    throw new Error("设计稿图片宽高不能超过 6000px。");
  }
  const image = await sharp(buffer).ensureAlpha().png().toBuffer();
  return {
    label: `上传图片 · ${originalName}`,
    image,
    viewport: { width: metadata.width, height: metadata.height },
    elements: [],
    diagnostics: ["图片输入不包含 Figma 节点属性，将只执行视觉与 H5 静态规则比对。"]
  };
}
