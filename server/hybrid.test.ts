import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type { ActualEvidenceElement, LiveActualEvidence } from "../src/types";
import { buildHybridActualEvidence } from "./hybrid";
import { buildScreenshotActualEvidence } from "./screenshot";

async function image(): Promise<Buffer> {
  return sharp({
    create: { width: 100, height: 200, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
}

function element(text: string, selector: string, box: ActualEvidenceElement["box"]): ActualEvidenceElement {
  return {
    selector,
    tag: "div",
    text,
    box,
    style: {},
    fingerprint: {
      key: `dom:${selector}`,
      identitySource: "dom-structure",
      tag: "div",
      selector,
      region: "top-left",
      geometryBucket: "",
      styleSignature: ""
    }
  };
}

async function live(elements: ActualEvidenceElement[], suppliedImage?: Buffer): Promise<LiveActualEvidence> {
  const liveImage = suppliedImage ?? await image();
  return {
    kind: "live",
    sourceUrl: "https://example.test/market",
    finalUrl: "https://example.test/market",
    viewport: { width: 100, height: 200 },
    samples: [{ index: 0, capturedAtMs: 0, image: liveImage, elements, audits: [] }],
    canonicalSampleIndex: 0,
    elementChanges: [],
    pixelVariance: { image: liveImage, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1 },
    diagnostics: []
  };
}

test("projects Live DOM through high-quality title, navigation, and header anchors", async () => {
  const screenshot = await buildScreenshotActualEvidence({
    screenshots: [{
      name: "device.png",
      image: await image(),
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 200 }
      },
      anchors: [
        { text: "行情", role: "heading", box: { x: 10, y: 10, width: 30, height: 10 }, confidence: 0.98 },
        { text: "自选", role: "navigation", box: { x: 10, y: 50, width: 30, height: 10 }, confidence: 0.97 },
        { text: "最新价", role: "columnheader", box: { x: 10, y: 90, width: 30, height: 10 }, confidence: 0.96 }
      ]
    }],
    targetViewport: { width: 100, height: 200 },
    pixelThreshold: 0.1,
    locale: "zh-CN"
  });
  const liveEvidence = await live([
    element("行情", "#title", { x: 10, y: 10, width: 30, height: 10 }),
    element("自选", "#nav", { x: 10, y: 50, width: 30, height: 10 }),
    element("最新价", "#header", { x: 10, y: 90, width: 30, height: 10 }),
    element("12.34", "#price", { x: 60, y: 120, width: 25, height: 10 })
  ]);

  const hybrid = buildHybridActualEvidence({ screenshot, live: liveEvidence, locale: "zh-CN" });

  assert.equal(hybrid.kind, "hybrid");
  assert.equal(hybrid.effectiveMode, "hybrid");
  assert.equal(hybrid.alignment.anchorCount, 3);
  assert.ok(hybrid.alignment.residualPx < 0.01);
  assert.equal(hybrid.alignment.evidenceConfidence.level, "high");
  assert.deepEqual(hybrid.samples[0].elements.find((item) => item.selector === "#price")?.box, {
    x: 60, y: 120, width: 25, height: 10
  });
});

test("quantifies a consistent scale and translation bias", async () => {
  const screenshot = await buildScreenshotActualEvidence({
    screenshots: [{
      name: "scaled.png",
      image: await image(),
      device: { platform: "iOS", dpr: 1, orientation: "portrait", viewport: { width: 100, height: 200 } },
      anchors: [
        { text: "A", box: { x: 12, y: 7, width: 18, height: 11 }, confidence: 0.98 },
        { text: "B", box: { x: 39, y: 51, width: 18, height: 11 }, confidence: 0.98 },
        { text: "C", box: { x: 66, y: 95, width: 18, height: 11 }, confidence: 0.98 }
      ]
    }],
    targetViewport: { width: 100, height: 200 }, pixelThreshold: 0.1, locale: "zh-CN"
  });
  const actual = await live([
    element("A", "#a", { x: 10, y: 10, width: 20, height: 10 }),
    element("B", "#b", { x: 40, y: 50, width: 20, height: 10 }),
    element("C", "#c", { x: 70, y: 90, width: 20, height: 10 })
  ]);
  actual.samples[0].elements[0].style = { textBounds: { x: 12, y: 12, width: 16, height: 6 }, paddingLeft: 2, paddingRight: 2 };
  const hybrid = buildHybridActualEvidence({ screenshot, live: actual, locale: "zh-CN" });

  assert.ok(Math.abs((hybrid.alignment.transform?.scaleX ?? 0) - 0.9) < 0.001);
  assert.ok(Math.abs((hybrid.alignment.transform?.scaleY ?? 0) - 1.1) < 0.001);
  assert.ok(hybrid.alignment.residualPx < 0.01);
  const projected = hybrid.projectedLive!.samples[0].elements[0].style;
  const transform = hybrid.alignment.transform!;
  assert.ok(Math.abs(projected.textBounds!.x - (12 * transform.scaleX + transform.translateX)) < 0.01);
  assert.ok(Math.abs(projected.textBounds!.y - (12 * transform.scaleY + transform.translateY)) < 0.01);
  assert.ok(Math.abs(projected.paddingLeft! - 2 * transform.scaleX) < 0.01);
});

test("degrades to Screenshot mode for a completely different page state", async () => {
  const screenshot = await buildScreenshotActualEvidence({
    screenshots: [{
      name: "different.png",
      image: await image(),
      device: { platform: "iOS", dpr: 1, orientation: "portrait", viewport: { width: 100, height: 200 } },
      anchors: [
        { text: "登录", box: { x: 10, y: 10, width: 30, height: 10 }, confidence: 0.98 },
        { text: "验证码", box: { x: 10, y: 50, width: 30, height: 10 }, confidence: 0.98 }
      ]
    }],
    targetViewport: { width: 100, height: 200 }, pixelThreshold: 0.1, locale: "zh-CN"
  });
  const hybrid = buildHybridActualEvidence({
    screenshot,
    live: await live([
      element("行情", "#title", { x: 10, y: 10, width: 30, height: 10 }),
      element("最新价", "#price", { x: 10, y: 50, width: 30, height: 10 })
    ]),
    locale: "zh-CN"
  });

  assert.equal(hybrid.effectiveMode, "screenshot");
  assert.equal(hybrid.alignment.evidenceConfidence.level, "low");
  assert.equal(hybrid.samples[hybrid.canonicalSampleIndex].elements.length, 0);
  assert.match(hybrid.diagnostics.join("\n"), /安全降级/);
});
