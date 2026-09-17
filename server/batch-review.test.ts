import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import sharp from "sharp";
import type { FigmaDesignTruth, LiveActualEvidence } from "../src/types";
import { ReviewService } from "./review";

async function solidPng(color = "#ffffff"): Promise<Buffer> {
  return sharp({
    create: { width: 24, height: 24, channels: 4, background: color }
  }).png().toBuffer();
}

function design(image: Buffer): FigmaDesignTruth {
  return {
    source: {
      kind: "figma",
      fileKey: "FILE_KEY",
      frameId: "1:2",
      fileName: "金融 H5",
      frameName: "行情"
    },
    render: { image, viewport: { width: 24, height: 24 } },
    root: {
      id: "1:2",
      name: "行情",
      type: "FRAME",
      box: { x: 0, y: 0, width: 24, height: 24 },
      relativeBox: { x: 0, y: 0, width: 24, height: 24 },
      style: {},
      children: [{
        id: "2:panel",
        parentId: "1:2",
        name: "行情面板",
        type: "FRAME",
        box: { x: 0, y: 0, width: 24, height: 24 },
        relativeBox: { x: 0, y: 0, width: 24, height: 24 },
        style: {},
        children: []
      }]
    },
    resources: { components: {}, componentSets: {}, styles: {} },
    diagnostics: []
  };
}

function live(
  image: Buffer,
  url: string,
  box = { x: 0, y: 0, width: 24, height: 24 }
): LiveActualEvidence {
  return {
    kind: "live",
    sourceUrl: url,
    finalUrl: url,
    viewport: { width: 24, height: 24 },
    samples: [{
      index: 0,
      capturedAtMs: 0,
      image,
      elements: [{
        selector: "#panel",
        tag: "div",
        dataFigmaId: "2:panel",
        box,
        style: {},
        fingerprint: {
          key: "figma:2:panel",
          identitySource: "figma-id",
          tag: "div",
          selector: "#panel",
          region: "top-left",
          geometryBucket: "0:0:100:100",
          styleSignature: ""
        }
      }],
      audits: []
    }],
    canonicalSampleIndex: 0,
    elementChanges: [],
    pixelVariance: { image, changedPixelCount: 0, changedPixelRatio: 0, threshold: 0.1 },
    diagnostics: []
  };
}

const designInput = {
  kind: "figma" as const,
  frameUrl: "https://www.figma.com/design/FILE_KEY/market?node-id=1-2",
  accessToken: "figma-token"
};

test("reviews multiple independent PagePairs and keeps caller page identities", async () => {
  const image = await solidPng();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => design(image),
      captureLiveActualEvidence: async (url) => live(image, url)
    }
  });

  const result = await service.reviewPagePairs({
    reviewName: "行情模块",
    locale: "zh-CN",
    pagePairs: [
      {
        clientPageId: "market-home",
        pageName: "行情首页",
        design: designInput,
        actual: { kind: "live", url: "https://h5.example.com/home" }
      },
      {
        clientPageId: "market-detail",
        pageName: "行情详情",
        design: designInput,
        actual: { kind: "live", url: "https://h5.example.com/detail" }
      }
    ]
  });

  assert.equal(result.executionStatus, "succeeded");
  assert.equal(result.verdict, "passed");
  assert.deepEqual(result.pages.map((page) => ({
    clientPageId: page.clientPageId,
    pageName: page.pageName,
    executionStatus: page.executionStatus,
    verdict: page.verdict
  })), [
    { clientPageId: "market-home", pageName: "行情首页", executionStatus: "succeeded", verdict: "passed" },
    { clientPageId: "market-detail", pageName: "行情详情", executionStatus: "succeeded", verdict: "passed" }
  ]);
  assert.equal(result.summary.totalPages, 2);
  assert.equal(result.summary.completedPages, 2);
  assert.equal(result.excel.filename, "行情模块UI走查结果.xlsx");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.excel.buffer as never);
  const summary = workbook.getWorksheet("页面汇总");
  assert.ok(summary);
  assert.equal(summary.getCell("A4").value, "market-home");
  assert.equal(summary.getCell("A5").value, "market-detail");
});

test("keeps execution status separate from mixed UI verdicts", async () => {
  const white = await solidPng();
  const black = await solidPng("#000000");
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => design(white),
      captureLiveActualEvidence: async (url) => {
        if (url.endsWith("/fail")) return live(black, url);
        if (url.endsWith("/review")) {
          return live(white, url, { x: 6, y: 0, width: 24, height: 24 });
        }
        return live(white, url);
      }
    }
  });

  const result = await service.reviewPagePairs({
    reviewName: "行情模块",
    locale: "zh-CN",
    pagePairs: [
      { clientPageId: "pass", pageName: "通过页", design: designInput, actual: { kind: "live", url: "https://h5.example.com/pass" } },
      { clientPageId: "fail", pageName: "失败页", design: designInput, actual: { kind: "live", url: "https://h5.example.com/fail" } },
      {
        clientPageId: "review",
        pageName: "待确认页",
        design: designInput,
        rulesYaml: "rules:\n  position: pending",
        actual: { kind: "live", url: "https://h5.example.com/review" }
      }
    ]
  });

  assert.equal(result.executionStatus, "succeeded");
  assert.equal(result.verdict, "failed");
  assert.deepEqual(result.pages.map((page) => page.verdict), ["passed", "failed", "needs_review"]);
  assert.deepEqual({
    passed: result.summary.passedPages,
    failed: result.summary.failedPages,
    needsReview: result.summary.needsReviewPages,
    executionFailed: result.summary.executionFailedPages
  }, { passed: 1, failed: 1, needsReview: 1, executionFailed: 0 });
});

test("retains completed page results when another PagePair execution fails", async () => {
  const image = await solidPng();
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => design(image),
      captureLiveActualEvidence: async (url) => {
        if (url.endsWith("/broken")) throw new Error("H5 capture timed out");
        return live(image, url);
      }
    }
  });

  const result = await service.reviewPagePairs({
    reviewName: "行情模块",
    locale: "zh-CN",
    pagePairs: [
      { clientPageId: "completed", pageName: "已完成页", design: designInput, actual: { kind: "live", url: "https://h5.example.com/completed" } },
      { clientPageId: "broken", pageName: "采集失败页", design: designInput, actual: { kind: "live", url: "https://h5.example.com/broken" } }
    ]
  });

  assert.equal(result.executionStatus, "failed");
  assert.equal(result.verdict, "passed");
  assert.equal(result.summary.completedPages, 2);
  assert.equal(result.summary.executionFailedPages, 1);
  assert.equal(result.pages[0].executionStatus, "succeeded");
  assert.ok(result.pages[0].report);
  assert.equal(result.pages[1].executionStatus, "failed");
  assert.equal(result.pages[1].error?.code, "PAGE_REVIEW_FAILED");
  assert.match(result.pages[1].error?.message ?? "", /H5 capture timed out/);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.excel.buffer as never);
  const summary = workbook.getWorksheet("页面汇总");
  assert.ok(summary);
  assert.equal(summary.getCell("C5").value, "failed");
  assert.equal(summary.getCell("D5").value, null);
});

test("limits PagePair concurrency and publishes observable page progress", async () => {
  const image = await solidPng();
  let active = 0;
  let maxActive = 0;
  const updates: Array<{ clientPageId: string; status: string; stage: string }> = [];
  const service = new ReviewService({
    dependencies: {
      buildDesignTruthFromFigma: async () => design(image),
      captureLiveActualEvidence: async (url) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return live(image, url);
      }
    }
  });

  const result = await service.reviewPagePairs({
    reviewName: "限流批量走查",
    locale: "zh-CN",
    pagePairs: ["one", "two", "three"].map((id) => ({
      clientPageId: id,
      pageName: id,
      design: designInput,
      actual: { kind: "live" as const, url: `https://h5.example.com/${id}` }
    }))
  }, {
    maxConcurrency: 2,
    onPageUpdate: (update) => updates.push(update)
  });

  assert.equal(result.executionStatus, "succeeded");
  assert.equal(maxActive, 2);
  assert.deepEqual(updates.slice(0, 2).map((update) => [update.clientPageId, update.status]), [
    ["one", "running"],
    ["two", "running"]
  ]);
  assert.equal(updates.length, 6);
  for (const id of ["one", "two", "three"]) {
    const started = updates.findIndex((update) => update.clientPageId === id && update.status === "running");
    const completed = updates.findIndex((update) => update.clientPageId === id && update.status === "succeeded");
    assert.ok(started >= 0 && completed > started);
  }
  const thirdStarted = updates.findIndex((update) => update.clientPageId === "three" && update.status === "running");
  assert.ok(updates.slice(0, thirdStarted).some((update) => update.status === "succeeded"));
});
