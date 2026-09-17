import sharp, { type OverlayOptions } from "sharp";
import type { Box } from "../src/types";

/** Translation only. Never scale an actual region to conceal layout differences. */
export async function alignRegionPixels(image: Buffer, viewport: { width: number; height: number }, regions: Array<{ box: Box; offset: { x: number; y: number } }>): Promise<Buffer> {
  const overlays: OverlayOptions[] = [];
  for (const { box, offset } of regions) {
    const dx = Math.round(offset.x), dy = Math.round(offset.y);
    const left = Math.max(0, Math.round(box.x), dx);
    const top = Math.max(0, Math.round(box.y), dy);
    const right = Math.min(viewport.width, Math.round(box.x + box.width), viewport.width + dx);
    const bottom = Math.min(viewport.height, Math.round(box.y + box.height), viewport.height + dy);
    if (right <= left || bottom <= top) continue;
    const input = await sharp(image).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
    overlays.push({ input, left: left - dx, top: top - dy });
  }
  return sharp(image).composite(overlays).png().toBuffer();
}
