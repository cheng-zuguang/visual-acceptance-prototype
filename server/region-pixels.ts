import pixelmatch from "pixelmatch";
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

/** Verified local pixel correspondence, with translation and transparent padding only. */
export async function compareRelativePixels(input: {
  referenceImage: Buffer;
  actualImage: Buffer;
  viewport: {width: number; height: number};
  pairs: Array<{designBox: Box; actualBox: Box}>;
  exclusions: Array<{designBox: Box; actualBox: Box}>;
  threshold: number;
}): Promise<{similarity: number; scope: {reviewedPixels: number; changedPixels: number; excludedPixels: number; canvasPixels: number}}> {
  const {width, height} = input.viewport;
  const referenceMasked = await sharp(input.referenceImage).ensureAlpha().raw().toBuffer();
  const actualMasked = await sharp(input.actualImage).ensureAlpha().raw().toBuffer();
  const mask = (data: Buffer, box: Box) => {
    for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(height, Math.ceil(box.y + box.height)); y++)
      data.fill(0, (y * width + Math.max(0, Math.floor(box.x))) * 4, (y * width + Math.min(width, Math.ceil(box.x + box.width))) * 4);
  };
  for (const exclusion of input.exclusions) { mask(referenceMasked, exclusion.designBox); mask(actualMasked, exclusion.actualBox); }
  let localReviewed = 0, localChanged = 0;
  const localMask = new Uint8Array(width * height), localDifference = new Uint8Array(width * height);
  const inCanvas = (box: Box) => box.width >= 1 && box.height >= 1 && box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= height;
  for (const binding of input.pairs) {
    if (!inCanvas(binding.designBox) || !inCanvas(binding.actualBox)) continue;
    const extract = (data: Buffer, box: Box, cropWidth: number, cropHeight: number) => sharp(data, {raw:{width,height,channels:4}})
      .extract({left:Math.floor(box.x),top:Math.floor(box.y),width:Math.max(1,Math.floor(box.width)),height:Math.max(1,Math.floor(box.height))})
      .extend({top:0,left:0,right:cropWidth-Math.max(1,Math.floor(box.width)),bottom:cropHeight-Math.max(1,Math.floor(box.height)),background:{r:0,g:0,b:0,alpha:0}}).raw().toBuffer();
    const cropWidth = Math.max(1, Math.floor(binding.designBox.width), Math.floor(binding.actualBox.width)), cropHeight = Math.max(1, Math.floor(binding.designBox.height), Math.floor(binding.actualBox.height));
    const [expectedPixels, actualPixels] = await Promise.all([extract(referenceMasked,binding.designBox,cropWidth,cropHeight),extract(actualMasked,binding.actualBox,cropWidth,cropHeight)]);
    const diffPixels = Buffer.alloc(cropWidth * cropHeight * 4);
    pixelmatch(expectedPixels,actualPixels,diffPixels,cropWidth,cropHeight,{threshold:input.threshold,includeAA:false,diffMask:true});
    for (let i=0;i<cropWidth*cropHeight;i++) {
      if (!expectedPixels[i*4+3] && !actualPixels[i*4+3]) continue;
      const index = (Math.floor(binding.designBox.y) + Math.floor(i / cropWidth)) * width + Math.floor(binding.designBox.x) + i % cropWidth;
      if (Math.floor(binding.designBox.x) + i % cropWidth >= width || index >= width * height) continue;
      localMask[index] = 1; if (diffPixels[i*4+3]) localDifference[index] = 1;
    }
  }
  for (let i=0;i<localMask.length;i++) { localReviewed += localMask[i]; localChanged += localMask[i] * localDifference[i]; }
  const scope = {reviewedPixels:localReviewed,changedPixels:localChanged,excludedPixels:width*height-localReviewed,canvasPixels:width*height};
  const similarity = localReviewed ? 1 - localChanged / localReviewed : 1;
  return {scope, similarity};
}
