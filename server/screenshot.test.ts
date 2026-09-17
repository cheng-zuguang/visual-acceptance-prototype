import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { buildScreenshotActualEvidence } from "./screenshot";

async function png(width: number, height: number, color = "#ffffff"): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color }
  }).png().toBuffer();
}

test("builds normalized Screenshot ActualEvidence with validated device metadata", async () => {
  const evidence = await buildScreenshotActualEvidence({
    screenshots: [{
      name: "iphone-market.png",
      image: await png(1170, 2532),
      device: {
        platform: "iOS",
        model: "iPhone 13",
        dpr: 3,
        orientation: "portrait",
        viewport: { width: 390, height: 844 }
      }
    }],
    targetViewport: { width: 390, height: 844 },
    pixelThreshold: 0.1,
    locale: "zh-CN"
  });

  assert.equal(evidence.kind, "screenshot");
  assert.deepEqual(evidence.viewport, { width: 390, height: 844 });
  assert.equal(evidence.samples.length, 1);
  assert.equal(evidence.samples[0].metadata.format, "png");
  assert.deepEqual(evidence.samples[0].metadata.sourcePixels, { width: 1170, height: 2532 });
  assert.equal(evidence.samples[0].metadata.device.dpr, 3);
  assert.match(evidence.diagnostics.join("\n"), /1170 × 2532/);
  assert.match(evidence.diagnostics.join("\n"), /portrait/);
});

test("uses multiple same-state screenshots as dynamic pixel evidence", async () => {
  const first = await png(390, 844);
  const second = await sharp(first)
    .composite([{ input: await png(40, 20, "#ff0000"), left: 100, top: 200 }])
    .png()
    .toBuffer();
  const device = {
    platform: "iOS",
    dpr: 1,
    orientation: "portrait" as const,
    viewport: { width: 390, height: 844 }
  };

  const evidence = await buildScreenshotActualEvidence({
    screenshots: [
      { name: "market-1.png", image: first, device },
      { name: "market-2.png", image: second, device }
    ],
    targetViewport: device.viewport,
    pixelThreshold: 0.1,
    locale: "zh-CN"
  });

  assert.equal(evidence.pixelVariance.changedPixelCount, 800);
  assert.ok(evidence.pixelVariance.changedPixelRatio > 0);
  assert.match(evidence.diagnostics.join("\n"), /动态变化证据/);
});
