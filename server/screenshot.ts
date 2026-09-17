import sharp from "sharp";
import type {
  ScreenshotActualEvidence,
  ScreenshotCrop,
  ScreenshotDeviceMetadata,
  ScreenshotImageFormat
} from "../src/types";
import { localText, type Locale } from "./i18n";

export interface ScreenshotActualEvidenceInput {
  screenshots: ScreenshotSource[];
  targetViewport: { width: number; height: number };
  pixelThreshold: number;
  locale: Locale;
}

export interface ScreenshotSource {
  name: string;
  image: Buffer;
  device: ScreenshotDeviceMetadata;
  crop?: ScreenshotCrop;
  anchors?: Array<{
    text?: string;
    role?: string;
    box: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
}

const SCREENSHOT_CONFIDENCE_CAP = 0.82;

async function buildPixelVariance(
  samples: ScreenshotActualEvidence["samples"],
  viewport: { width: number; height: number },
  threshold: number
): Promise<ScreenshotActualEvidence["pixelVariance"]> {
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);
  const frames = await Promise.all(
    samples.map((sample) => sharp(sample.image).ensureAlpha().raw().toBuffer())
  );
  const variance = Buffer.alloc(width * height * 4);
  let changedPixelCount = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    let largestRange = 0;
    for (let channel = 0; channel < 3; channel += 1) {
      const values = frames.map((frame) => frame[offset + channel]);
      largestRange = Math.max(largestRange, Math.max(...values) - Math.min(...values));
    }
    if (largestRange / 255 > threshold) {
      changedPixelCount += 1;
      variance[offset] = 255;
      variance[offset + 2] = 128;
      variance[offset + 3] = Math.max(96, largestRange);
    }
  }
  return {
    image: await sharp(variance, { raw: { width, height, channels: 4 } }).png().toBuffer(),
    changedPixelCount,
    changedPixelRatio: changedPixelCount / (width * height),
    threshold
  };
}

function validPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function imageFormat(format?: string): ScreenshotImageFormat | undefined {
  return format === "png" || format === "jpeg" || format === "webp" ? format : undefined;
}

function validateDevice(
  device: ScreenshotDeviceMetadata,
  visiblePixels: { width: number; height: number },
  locale: Locale
): void {
  if (!device.platform.trim() || !validPositive(device.dpr)) {
    throw new Error(localText(locale, "截图设备平台和 DPR 必须有效。", "Screenshot platform and DPR must be valid."));
  }
  if (!validPositive(device.viewport.width) || !validPositive(device.viewport.height)) {
    throw new Error(localText(locale, "截图设备 viewport 必须有效。", "Screenshot device viewport must be valid."));
  }
  const inferredOrientation = visiblePixels.width > visiblePixels.height ? "landscape" : "portrait";
  if (device.orientation !== inferredOrientation) {
    throw new Error(localText(locale, "截图方向与图像尺寸不一致。", "Screenshot orientation does not match its dimensions."));
  }
  const expectedWidth = device.viewport.width * device.dpr;
  const expectedHeight = device.viewport.height * device.dpr;
  if (Math.abs(expectedWidth - visiblePixels.width) > 2 || Math.abs(expectedHeight - visiblePixels.height) > 2) {
    throw new Error(localText(locale, "截图像素尺寸与 viewport × DPR 不一致。", "Screenshot pixels do not match viewport × DPR."));
  }
}

function validatedCrop(
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
    throw new Error(localText(locale, "截图裁剪区域超出图像边界。", "Screenshot crop is outside the image bounds."));
  }
  return crop;
}

export async function buildScreenshotActualEvidence(
  input: ScreenshotActualEvidenceInput
): Promise<ScreenshotActualEvidence> {
  if (!input.screenshots.length) {
    throw new Error(localText(input.locale, "至少提供一张实际截图。", "Provide at least one actual screenshot."));
  }
  if (!validPositive(input.targetViewport.width) || !validPositive(input.targetViewport.height)) {
    throw new Error(localText(input.locale, "目标 viewport 必须有效。", "Target viewport must be valid."));
  }

  const samples: ScreenshotActualEvidence["samples"] = [];
  const diagnostics: string[] = [];
  for (const [index, screenshot] of input.screenshots.entries()) {
    const metadata = await sharp(screenshot.image).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const format = imageFormat(metadata.format);
    if (!format || !width || !height) {
      throw new Error(localText(input.locale, "截图仅支持 PNG、JPEG 或 WebP。", "Screenshots must be PNG, JPEG, or WebP."));
    }
    const crop = validatedCrop(screenshot.crop, { width, height }, input.locale);
    const visiblePixels = crop ? { width: crop.width, height: crop.height } : { width, height };
    validateDevice(screenshot.device, visiblePixels, input.locale);
    let pipeline = sharp(screenshot.image);
    if (crop) {
      pipeline = pipeline.extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height
      });
    }
    const image = await pipeline
      .resize(Math.round(input.targetViewport.width), Math.round(input.targetViewport.height), { fit: "fill" })
      .png()
      .toBuffer();
    const visualAnchors = (screenshot.anchors ?? []).map((anchor) => {
      const offsetX = crop?.x ?? 0;
      const offsetY = crop?.y ?? 0;
      const scaleX = input.targetViewport.width / visiblePixels.width;
      const scaleY = input.targetViewport.height / visiblePixels.height;
      const relative = {
        x: anchor.box.x - offsetX,
        y: anchor.box.y - offsetY,
        width: anchor.box.width,
        height: anchor.box.height
      };
      if (
        anchor.confidence < 0 || anchor.confidence > 1 ||
        relative.x < 0 || relative.y < 0 ||
        relative.x + relative.width > visiblePixels.width ||
        relative.y + relative.height > visiblePixels.height
      ) {
        throw new Error(localText(input.locale, "截图视觉锚点无效。", "Screenshot visual anchor is invalid."));
      }
      return {
        ...(anchor.text ? { text: anchor.text } : {}),
        ...(anchor.role ? { role: anchor.role } : {}),
        confidence: anchor.confidence,
        box: {
          x: relative.x * scaleX,
          y: relative.y * scaleY,
          width: relative.width * scaleX,
          height: relative.height * scaleY
        }
      };
    });
    samples.push({
      index,
      capturedAtMs: index,
      image,
      elements: visualAnchors.map((anchor, anchorIndex) => {
        const selector = `[visual-anchor="${anchorIndex}"]`;
        return {
          selector,
          tag: "visual",
          ...(anchor.role ? { role: anchor.role } : {}),
          ...(anchor.text ? { text: anchor.text } : {}),
          box: anchor.box,
          style: {},
          visualConfidence: anchor.confidence,
          fingerprint: {
            key: `visual:${index}:${anchorIndex}`,
            identitySource: "visual-anchor" as const,
            tag: "visual",
            ...(anchor.role ? { role: anchor.role } : {}),
            selector,
            region: "visual",
            geometryBucket: `${anchor.box.x}:${anchor.box.y}:${anchor.box.width}:${anchor.box.height}`,
            styleSignature: ""
          }
        };
      }),
      audits: [],
      visualAnchors,
      metadata: {
        name: screenshot.name,
        format,
        sourcePixels: { width, height },
        ...(crop ? { crop } : {}),
        device: screenshot.device
      }
    });
    diagnostics.push(localText(
      input.locale,
      `截图 ${screenshot.name}：${width} × ${height}px，${screenshot.device.orientation}，DPR ${screenshot.device.dpr}。`,
      `Screenshot ${screenshot.name}: ${width} × ${height}px, ${screenshot.device.orientation}, DPR ${screenshot.device.dpr}.`
    ));
  }

  const pixelVariance = await buildPixelVariance(
    samples,
    input.targetViewport,
    input.pixelThreshold
  );
  if (samples.length > 1) {
    diagnostics.push(localText(
      input.locale,
      `已由 ${samples.length} 张同状态截图生成动态变化证据，变化像素占比 ${(pixelVariance.changedPixelRatio * 100).toFixed(2)}%。`,
      `Built dynamic pixel evidence from ${samples.length} same-state screenshots; changed-pixel ratio ${(pixelVariance.changedPixelRatio * 100).toFixed(2)}%.`
    ));
  }
  return {
    kind: "screenshot",
    viewport: input.targetViewport,
    samples,
    canonicalSampleIndex: samples.length - 1,
    elementChanges: [],
    pixelVariance,
    confidenceCap: SCREENSHOT_CONFIDENCE_CAP,
    diagnostics
  };
}
