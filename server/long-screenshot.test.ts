import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type { ActualEvidenceElement, DesignTruth, LiveActualEvidence } from "../src/types";
import { buildLongScreenshotActualEvidence } from "./long-screenshot";
import { ReviewService } from "./review";

async function stripedImage(height: number): Promise<Buffer> {
  const bands = ["#ff0000", "#00ff00", "#0000ff"];
  const parts = await Promise.all(bands.map((color, index) =>
    sharp({
      create: {
        width: 100,
        height: index === 2 ? height - 200 : 100,
        channels: 4,
        background: color
      }
    }).png().toBuffer()
  ));
  return sharp({
    create: { width: 100, height, channels: 4, background: "#ffffff" }
  }).composite(parts.map((input, index) => ({ input, top: index * 100, left: 0 }))).png().toBuffer();
}

function design(image: Buffer): DesignTruth {
  return {
    source: { kind: "demo", name: "长行情页" },
    render: { image, viewport: { width: 100, height: 240 } },
    root: {
      id: "root",
      name: "长行情页",
      type: "FRAME",
      box: { x: 0, y: 0, width: 100, height: 240 },
      relativeBox: { x: 0, y: 0, width: 100, height: 240 },
      style: {},
      children: []
    },
    diagnostics: []
  };
}

test("long screenshots retain design-only coverage in absolute coordinates without missing findings", async () => {
  const image = await stripedImage(240);
  const truth = design(image);
  truth.root.children.push({ id: "missing-label", name: "投票", type: "TEXT", text: "投票",
    box: { x: 10, y: 110, width: 30, height: 10 }, style: {}, children: [] });
  const service = new ReviewService({ dependencies: { buildDesignTruthFromFigma: async () => truth as never } });
  const report = await service.reviewLongScreenshotPagePair({ locale: "zh-CN",
    design: { kind: "figma", frameUrl: "https://www.figma.com/design/FILE_KEY/test?node-id=1-2", accessToken: "test" },
    screenshot: { name: "long.png", image, device: { platform: "iOS", dpr: 1, orientation: "portrait", viewport: { width: 100, height: 100 } } }
  });
  const item = report.matching.designCoverage?.items.find(item => item.figmaNodeId === "missing-label");
  assert.ok(item);
  assert.equal(item.designBox?.y, 110);
  assert.equal(report.matching.designCoverage?.policy, "actual-driven");
  assert.equal(item.status, "outside-scope");
  assert.equal(item.reviewStatus, "not-applicable");
  assert.deepEqual(item.issueIds, []);
  assert.equal(report.issues.some(issue => issue.rule === "missing_module"), false);
});

function liveElement(text: string, selector: string, y: number): ActualEvidenceElement {
  return {
    selector,
    tag: "div",
    text,
    box: { x: 10, y, width: 30, height: 10 },
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

async function liveTile(scrollY: number): Promise<LiveActualEvidence> {
  const image = await sharp({
    create: { width: 100, height: 100, channels: 4, background: "#ffffff" }
  }).png().toBuffer();
  const elements = [
    liveElement(`title-${scrollY}`, `#title-${scrollY}`, 5),
    liveElement(`nav-${scrollY}`, `#nav-${scrollY}`, 17),
    liveElement(`price-${scrollY}`, `#price-${scrollY}`, 29)
  ];
  return {
    kind: "live",
    sourceUrl: "https://h5.test/market",
    finalUrl: "https://h5.test/market",
    viewport: { width: 100, height: 100 },
    samples: [{ index: 0, capturedAtMs: 0, image, elements, audits: [] }],
    canonicalSampleIndex: 0,
    elementChanges: [],
    pixelVariance: { image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1 },
    diagnostics: [`scrollY=${scrollY}`]
  };
}

test("splits an ordinary long PagePair into viewport-sized tiles with absolute coordinates", async () => {
  const image = await stripedImage(240);
  const evidence = await buildLongScreenshotActualEvidence({
    design: design(image),
    screenshot: {
      name: "market-long.png",
      image,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      }
    },
    locale: "zh-CN"
  });

  assert.equal(evidence.kind, "long_screenshot");
  assert.deepEqual(
    evidence.tiles.map(({ index, scrollY, contentHeight, absoluteBox }) => ({
      index,
      scrollY,
      contentHeight,
      absoluteBox
    })),
    [
      { index: 0, scrollY: 0, contentHeight: 100, absoluteBox: { x: 0, y: 0, width: 100, height: 100 } },
      { index: 1, scrollY: 100, contentHeight: 100, absoluteBox: { x: 0, y: 100, width: 100, height: 100 } },
      { index: 2, scrollY: 200, contentHeight: 40, absoluteBox: { x: 0, y: 200, width: 100, height: 40 } }
    ]
  );
  for (const tile of evidence.tiles) {
    assert.deepEqual(await sharp(tile.actualImage).metadata().then(({ width, height }) => ({ width, height })), {
      width: 100,
      height: 100
    });
  }
});

test("rejects a long PagePair whose effective page heights cannot be aligned", async () => {
  const designImage = await stripedImage(240);
  const actualImage = await sharp({
    create: { width: 100, height: 600, channels: 4, background: "#ffffff" }
  }).png().toBuffer();

  await assert.rejects(
    buildLongScreenshotActualEvidence({
      design: design(designImage),
      screenshot: {
        name: "misaligned-long.png",
        image: actualImage,
        device: {
          platform: "iOS",
          dpr: 1,
          orientation: "portrait",
          viewport: { width: 100, height: 100 }
        }
      },
      locale: "zh-CN"
    }),
    /长截图与 Figma Frame 的有效内容高度无法对齐/
  );
});

test("crops a small trailing height difference to the reviewed intersection without stretching", async () => {
  const designImage = await stripedImage(240);
  const actualImage = await sharp({
    create: { width: 100, height: 250, channels: 4, background: "#222222" }
  }).png().toBuffer();
  const evidence = await buildLongScreenshotActualEvidence({
    design: design(designImage),
    screenshot: {
      name: "slightly-longer.png",
      image: actualImage,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      }
    },
    locale: "zh-CN"
  });

  assert.equal(evidence.fullPage.height, 240);
  assert.equal((await sharp(evidence.fullPage.designImage).metadata()).height, 240);
  assert.equal((await sharp(evidence.fullPage.actualImage).metadata()).height, 240);
});

test("removes device chrome with an explicit effective-content crop before tiling", async () => {
  const content = await stripedImage(240);
  const framed = await sharp({
    create: { width: 100, height: 260, channels: 4, background: "#000000" }
  }).composite([{ input: content, left: 0, top: 10 }]).png().toBuffer();
  const evidence = await buildLongScreenshotActualEvidence({
    design: design(content),
    screenshot: {
      name: "framed-long.png",
      image: framed,
      crop: { x: 0, y: 10, width: 100, height: 240 },
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      }
    },
    locale: "zh-CN"
  });

  const pixel = await sharp(evidence.tiles[0].actualImage).removeAlpha().raw().toBuffer();
  assert.deepEqual([...pixel.subarray(0, 3)], [255, 0, 0]);
});

test("detects a lazy-load blank band and lowers the long-page confidence cap", async () => {
  const designImage = await sharp({
    create: { width: 100, height: 240, channels: 4, background: "#111111" }
  }).png().toBuffer();
  const actualImage = await sharp({
    create: { width: 100, height: 240, channels: 4, background: "#111111" }
  }).composite([{
    input: await sharp({
      create: { width: 100, height: 24, channels: 4, background: "#ffffff" }
    }).png().toBuffer(),
    left: 0,
    top: 108
  }]).png().toBuffer();

  const evidence = await buildLongScreenshotActualEvidence({
    design: design(designImage),
    screenshot: {
      name: "lazy-long.png",
      image: actualImage,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      }
    },
    locale: "zh-CN"
  });

  assert.equal(evidence.anomalies[0]?.kind, "lazy-load-blank");
  assert.deepEqual(evidence.anomalies[0]?.box, { x: 0, y: 108, width: 100, height: 24 });
  assert.ok(evidence.confidenceCap < 0.7);
});

test("turns capture anomalies into Pending review evidence and caps tile findings", async () => {
  const designImage = await sharp({
    create: { width: 100, height: 240, channels: 4, background: "#111111" }
  }).png().toBuffer();
  const actualImage = await sharp(designImage).composite([{
    input: await sharp({
      create: { width: 100, height: 24, channels: 4, background: "#ffffff" }
    }).png().toBuffer(),
    left: 0,
    top: 108
  }]).png().toBuffer();
  const truth = design(designImage);
  truth.source = { kind: "figma", fileKey: "FILE_KEY", frameId: "1:2", frameName: "懒加载行情页" };
  const service = new ReviewService({
    dependencies: { buildDesignTruthFromFigma: async () => truth as never }
  });
  const report = await service.reviewLongScreenshotPagePair({
    locale: "zh-CN",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/lazy?node-id=1-2",
      accessToken: "figma-token"
    },
    screenshot: {
      name: "lazy-long.png",
      image: actualImage,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      }
    }
  });

  assert.equal(report.longScreenshot?.evidenceConfidence.level, "low");
  assert.equal(report.issues.some((issue) =>
    issue.rule === "long_screenshot_quality" && issue.priority === "Pending"
  ), true);
  assert.equal(report.issues.every((issue) => issue.evidenceConfidence.score <= 0.62), true);
  assert.deepEqual(report.matching.semanticAgent, {
    invoked: false,
    responded: false,
    acceptedBindingCount: 0,
    modules: []
  });
});

test("detects a repeated strip at a viewport boundary as a stitching anomaly", async () => {
  const designImage = await stripedImage(240);
  const pattern = await sharp({
    create: { width: 100, height: 8, channels: 4, background: "#111111" }
  }).composite([{
    input: await sharp({
      create: { width: 50, height: 8, channels: 4, background: "#f02d55" }
    }).png().toBuffer(),
    left: 0,
    top: 0
  }]).png().toBuffer();
  const actualImage = await sharp(designImage).composite([
    { input: pattern, left: 0, top: 92 },
    { input: pattern, left: 0, top: 100 }
  ]).png().toBuffer();

  const evidence = await buildLongScreenshotActualEvidence({
    design: design(designImage),
    screenshot: {
      name: "stitched-long.png",
      image: actualImage,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      }
    },
    locale: "zh-CN"
  });

  const seam = evidence.anomalies.find((anomaly) => anomaly.kind === "stitch-seam");
  assert.deepEqual(seam?.box, { x: 0, y: 92, width: 100, height: 16 });
  assert.ok(evidence.confidenceCap < 0.7);
});

test("reviews every tile and retains absolute position evidence without inferring a shift from page coordinates", async () => {
  const image = await stripedImage(240);
  const truth = design(image);
  truth.source = {
    kind: "figma",
    fileKey: "FILE_KEY",
    frameId: "1:2",
    frameName: "长行情页"
  };
  truth.root.children = [{
    id: "2:price",
    parentId: "root",
    name: "最新价",
    type: "TEXT",
    text: "10.20",
    box: { x: 10, y: 120, width: 30, height: 12 },
    relativeBox: { x: 10, y: 120, width: 30, height: 12 },
    style: { fontSize: 12 },
    children: []
  }];
  const service = new ReviewService({
    dependencies: { buildDesignTruthFromFigma: async () => truth as never }
  });

  const report = await service.reviewLongScreenshotPagePair({
    locale: "zh-CN",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/long?node-id=1-2",
      accessToken: "figma-token"
    },
    screenshot: {
      name: "market-long.png",
      image,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      },
      anchors: [{
        text: "10.20",
        confidence: 0.98,
        box: { x: 10, y: 130, width: 30, height: 12 }
      }]
    }
  });

  assert.equal(report.evidenceMode, "long_screenshot");
  assert.equal(report.longScreenshot?.tiles.length, 3);
  const item = report.matching.designCoverage?.items.find(item => item.figmaNodeId === "2:price");
  assert.ok(item);
  assert.equal(item.tileIndex, 1);
  assert.deepEqual(item.designBox, { x: 10, y: 120, width: 30, height: 12 });
  assert.deepEqual(item.actualBox, { x: 10, y: 130, width: 30, height: 12 });
  const positionChecks = item.checks?.filter(check => check.rule === "position");
  assert.equal(positionChecks?.length, 2);
  for (const check of positionChecks ?? []) {
    assert.equal(check.status, "pending");
    assert.match(check.reason, /relative-layout/);
    assert.deepEqual(check.actualBox, { x: 10, y: 130, width: 30, height: 12 });
  }
  assert.equal(report.issues.some(issue => issue.figmaNodeId === "2:price" && issue.evidence.some(item => item.rule === "position")), false,
    "an absolute vertical shift alone cannot establish a relative-layout defect");
});

test("recognizes a sticky navigation copy and suppresses issues from its repeated tile", async () => {
  const designImage = await stripedImage(240);
  const header = await sharp({
    create: { width: 100, height: 20, channels: 4, background: "#ff0000" }
  }).png().toBuffer();
  const actualImage = await sharp(designImage).composite([
    { input: header, left: 0, top: 100 }
  ]).png().toBuffer();
  const truth = design(designImage);
  truth.source = { kind: "figma", fileKey: "FILE_KEY", frameId: "1:2", frameName: "吸顶行情页" };
  truth.root.children = [{
    id: "2:nav",
    parentId: "root",
    name: "行情导航",
    type: "TEXT",
    text: "行情",
    box: { x: 0, y: 0, width: 100, height: 20 },
    relativeBox: { x: 0, y: 0, width: 100, height: 20 },
    style: {},
    children: []
  }];
  const service = new ReviewService({
    dependencies: { buildDesignTruthFromFigma: async () => truth as never }
  });

  const report = await service.reviewLongScreenshotPagePair({
    locale: "zh-CN",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/sticky?node-id=1-2",
      accessToken: "figma-token"
    },
    screenshot: {
      name: "sticky-long.png",
      image: actualImage,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      },
      anchors: [
        { text: "行情", role: "navigation", confidence: 0.99, box: { x: 0, y: 0, width: 100, height: 20 } },
        { text: "行情", role: "navigation", confidence: 0.99, box: { x: 0, y: 100, width: 100, height: 20 } }
      ]
    }
  });

  assert.deepEqual(report.longScreenshot?.stickyRegions, [{
    key: "navigation|行情",
    canonicalBox: { x: 0, y: 0, width: 100, height: 20 },
    duplicateBoxes: [{ x: 0, y: 100, width: 100, height: 20 }]
  }]);
  assert.equal(report.issues.some((issue) => {
    const box = issue.location.box;
    return box ? box.y < 120 && box.y + box.height > 100 : false;
  }), false);
  assert.equal(report.issues.length, 0);
});

test("reviews an uploaded long screenshot with H5 evidence for every viewport tile", async () => {
  const image = await stripedImage(240);
  const truth = design(image);
  truth.source = { kind: "figma", fileKey: "FILE_KEY", frameId: "1:2", frameName: "长行情页" };
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => truth as never,
      captureLiveActualEvidenceAtScrollOffsets: async (_url, _viewport, scrollYs) =>
        Promise.all(scrollYs.map(async (scrollY) => ({ scrollY, evidence: await liveTile(scrollY) })))
    }
  });
  const anchors = [0, 100, 200].flatMap((scrollY) => [
    { text: `title-${scrollY}`, confidence: 0.99, box: { x: 10, y: scrollY + 5, width: 30, height: 10 } },
    { text: `nav-${scrollY}`, confidence: 0.99, box: { x: 10, y: scrollY + 17, width: 30, height: 10 } },
    { text: `price-${scrollY}`, confidence: 0.99, box: { x: 10, y: scrollY + 29, width: 30, height: 10 } }
  ]);

  const report = await service.reviewLongScreenshotPagePair({
    locale: "zh-CN",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/long?node-id=1-2",
      accessToken: "figma-token"
    },
    h5Url: "https://h5.test/market",
    screenshot: {
      name: "market-long.png",
      image,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      },
      anchors
    }
  });

  assert.equal(report.source.actual, "Long Screenshot · market-long.png + H5 · https://h5.test/market");
  assert.equal(report.longScreenshot?.effectiveMode, "hybrid");
  assert.equal(report.longScreenshot?.hybridTileCount, 3);
  assert.deepEqual(
    report.longScreenshot?.tileAlignments?.map(({ tileIndex, effectiveMode }) => ({ tileIndex, effectiveMode })),
    [
      { tileIndex: 0, effectiveMode: "hybrid" },
      { tileIndex: 1, effectiveMode: "hybrid" },
      { tileIndex: 2, effectiveMode: "hybrid" }
    ]
  );
});

test("downgrades only the long-screenshot tile whose Live evidence did not reach its scroll offset", async () => {
  const image = await stripedImage(240);
  const truth = design(image);
  truth.source = { kind: "figma", fileKey: "FILE_KEY", frameId: "1:2", frameName: "长行情页" };
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => truth as never,
      captureLiveActualEvidenceAtScrollOffsets: async (_url, _viewport, scrollYs) =>
        Promise.all(scrollYs.map(async (scrollY) => {
          const evidence = await liveTile(scrollY);
          evidence.samples[0].scroll = scrollY === 100
            ? { target: "unresolved", requestedY: 100, actualY: 0, scrollHeight: 100, clientHeight: 100 }
            : { target: "document", selector: "html", requestedY: scrollY, actualY: scrollY, scrollHeight: 240, clientHeight: 100 };
          return { scrollY, evidence };
        }))
    }
  });
  const anchors = [0, 100, 200].flatMap((scrollY) => [
    { text: `title-${scrollY}`, confidence: 0.99, box: { x: 10, y: scrollY + 5, width: 30, height: 10 } },
    { text: `nav-${scrollY}`, confidence: 0.99, box: { x: 10, y: scrollY + 17, width: 30, height: 10 } },
    { text: `price-${scrollY}`, confidence: 0.99, box: { x: 10, y: scrollY + 29, width: 30, height: 10 } }
  ]);

  const report = await service.reviewLongScreenshotPagePair({
    locale: "zh-CN",
    design: {
      kind: "figma",
      frameUrl: "https://www.figma.com/design/FILE_KEY/long?node-id=1-2",
      accessToken: "figma-token"
    },
    h5Url: "https://h5.test/market",
    screenshot: {
      name: "market-long.png",
      image,
      device: {
        platform: "iOS",
        dpr: 1,
        orientation: "portrait",
        viewport: { width: 100, height: 100 }
      },
      anchors
    }
  });

  assert.equal(report.longScreenshot?.effectiveMode, "hybrid");
  assert.equal(report.longScreenshot?.hybridTileCount, 2);
  assert.deepEqual(report.longScreenshot?.tileAlignments?.map(({ tileIndex }) => tileIndex), [0, 2]);
  assert.match(report.diagnostics.join("\n"), /滚动位置 100px.*Screenshot/);
});

test("long screenshot property checks and actual-only entries retain full-image coordinates", async () => {
  const image = await stripedImage(240);
  const truth = design(image);
  truth.root.children.push({ id: "label", name: "Label", type: "TEXT", text: "Label", box: { x: 10, y: 110, width: 30, height: 10 }, style: {}, children: [] });
  const { compareDesignToPage } = await import("./compare");
  const service = new ReviewService({ dependencies: { buildDesignTruthFromFigma: async () => truth as never,
    compareDesignToPage: async (...args) => {
      const result = await compareDesignToPage(...args);
      const item = result.matching.designCoverage?.items.find(item => item.figmaNodeId === "label");
      if (item) {
        item.actualBox = { x: 10, y: 10, width: 30, height: 10 };
        item.checks = [{ property: "fontSize", rule: "typography", expected: 16, actual: 16, tolerance: 1, status: "passed", reason: "measured", selector: ".label", actualBox: { ...item.actualBox } }];
        result.matching.designCoverage!.actualItems = [{ name: "Extra", selector: ".extra", actualBox: { x: 10, y: 25, width: 30, height: 10 }, status: "unverified", reasonCode: "design-counterpart-unresolved", issueIds: [] }];
      }
      return result;
    } } });
  const report = await service.reviewLongScreenshotPagePair({ locale: "en", design: { kind: "figma", frameUrl: "https://www.figma.com/design/FILE_KEY/test?node-id=1-2", accessToken: "test" },
    screenshot: { name: "long.png", image, device: { platform: "iOS", dpr: 1, orientation: "portrait", viewport: { width: 100, height: 100 } } } });
  const item = report.matching.designCoverage!.items.find(item => item.figmaNodeId === "label")!;
  assert.equal(item.actualBox?.y, 110); assert.equal(item.checks?.[0].actualBox.y, 110);
  assert.equal(report.matching.designCoverage!.actualItems?.[0].actualBox.y, 125);
});
