import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import JSZip from "jszip";
import sharp from "sharp";
import type { CompareReport } from "../src/types";
import type { ReviewPagePairsInput } from "./review";
import { createWebCompareRouter } from "./web-compare-api";

const testExcel = {
  kind: "excel" as const,
  filename: "Web UI reviewUI走查结果.xlsx",
  contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const,
  buffer: Buffer.from("xlsx")
};

function testReport(id: string): CompareReport {
  return {
    id,
    reportHtml: "<!doctype html><title>Test report</title>",
    markdown: "# Test report",
    images: {
      reference: "data:image/png;base64,",
      actual: "data:image/png;base64,",
      diff: `data:image/png;base64,${Buffer.from("diff").toString("base64")}`
    }
  } as CompareReport;
}

test("submits uploaded screenshots as Screenshot ActualEvidence through the Web compare endpoint", async () => {
  const screenshot = await sharp({
    create: { width: 40, height: 80, channels: 4, background: "#fff" }
  }).png().toBuffer();
  let observed: ReviewPagePairsInput | undefined;
  const app = express();
  app.use(createWebCompareRouter({
    executeReview: async (input) => {
      observed = input;
      return {
        pages: [{ executionStatus: "succeeded", report: testReport("report-1") }],
        excel: testExcel
      } as never;
    }
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    const body = new FormData();
    body.set("actualMode", "screenshot");
    body.set("figmaUrl", "https://www.figma.com/design/FILE/page?node-id=1-2");
    body.set("figmaToken", "figma-token");
    body.append("screenshots", new Blob([screenshot], { type: "image/png" }), "phone.png");
    const response = await fetch(`http://127.0.0.1:${port}/api/compare`, { method: "POST", body });

    assert.equal(response.status, 200);
    assert.equal((await response.json() as { id: string }).id, "report-1");
    assert.equal(observed?.pagePairs[0].actual.kind, "screenshot");
    const actual = observed?.pagePairs[0].actual;
    assert.equal(actual?.kind === "screenshot" ? actual.screenshots[0].name : undefined, "phone.png");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("submits one long screenshot with H5 and an explicit device viewport through the Web compare endpoint", async () => {
  const screenshot = await sharp({
    create: { width: 300, height: 1800, channels: 4, background: "#fff" }
  }).png().toBuffer();
  let observed: ReviewPagePairsInput | undefined;
  const app = express();
  app.use(createWebCompareRouter({
    executeReview: async (input) => {
      observed = input;
      return {
        pages: [{ executionStatus: "succeeded", report: testReport("report-long") }],
        excel: testExcel
      } as never;
    }
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    const body = new FormData();
    body.set("actualMode", "long_screenshot");
    body.set("h5Url", "https://h5.test/market");
    body.set("screenshotDpr", "3");
    body.set("longScreenshotViewportHeight", "844");
    body.set("figmaUrl", "https://www.figma.com/design/FILE/page?node-id=1-2");
    body.set("figmaToken", "figma-token");
    body.append("screenshots", new Blob([screenshot], { type: "image/png" }), "long.png");
    const response = await fetch(`http://127.0.0.1:${port}/api/compare`, { method: "POST", body });

    assert.equal(response.status, 200);
    const actual = observed?.pagePairs[0].actual;
    assert.equal(actual?.kind, "long_screenshot");
    assert.deepEqual(actual?.kind === "long_screenshot" ? actual.screenshot.device : undefined, {
      platform: "uploaded",
      dpr: 3,
      orientation: "portrait",
      viewport: { width: 100, height: 844 }
    });
    assert.equal(actual?.kind === "long_screenshot" ? actual.url : undefined, "https://h5.test/market");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("publishes the generated XLSX artifact for the Demo UI without embedding bytes in JSON", async () => {
  const app = express();
  app.use(createWebCompareRouter({
    executeReview: async () => ({
      pages: [{ executionStatus: "succeeded", report: testReport("report-xlsx") }],
      excel: {
        kind: "excel",
        filename: "美联储观察UI走查结果.xlsx",
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from("xlsx-bytes")
      }
    }) as never
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    const body = new FormData();
    body.set("actualMode", "live");
    body.set("h5Url", "https://example.test/fed");
    const response = await fetch(`http://127.0.0.1:${port}/api/compare`, { method: "POST", body });
    const report = await response.json() as CompareReport;
    assert.deepEqual(report.artifacts?.xlsx, {
      filename: "美联储观察UI走查结果.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 10,
      downloadUrl: "/api/reports/report-xlsx/artifacts/xlsx"
    });
    assert.equal(JSON.stringify(report).includes("xlsx-bytes"), false);

    const artifact = await fetch(`http://127.0.0.1:${port}${report.artifacts?.xlsx?.downloadUrl}`);
    assert.equal(artifact.status, 200);
    assert.equal(await artifact.text(), "xlsx-bytes");
    assert.match(artifact.headers.get("content-disposition") ?? "", /attachment/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("downloads one ZIP containing every report type exposed by the Web UI", async () => {
  const report = {
    id: "report-bundle",
    reportHtml: "<!doctype html><title>DiffLab report</title>",
    markdown: "# DiffLab report",
    images: {
      reference: "data:image/png;base64,",
      actual: "data:image/png;base64,",
      diff: `data:image/png;base64,${Buffer.from("diff-png").toString("base64")}`
    }
  } as CompareReport;
  const app = express();
  app.use(createWebCompareRouter({
    executeReview: async () => ({
      pages: [{ executionStatus: "succeeded", report }],
      excel: testExcel
    }) as never
  }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  try {
    const body = new FormData();
    body.set("actualMode", "live");
    body.set("h5Url", "https://example.test/fed");
    const comparison = await fetch(`http://127.0.0.1:${port}/api/compare`, { method: "POST", body });
    const result = await comparison.json() as CompareReport;

    assert.equal(result.artifacts?.zip?.filename, "difflab-report-bundle-reports.zip");
    assert.equal(result.artifacts?.zip?.contentType, "application/zip");
    assert.equal(result.artifacts?.zip?.downloadUrl, "/api/reports/report-bundle/artifacts/zip");
    assert.ok((result.artifacts?.zip?.sizeBytes ?? 0) > 0);

    const response = await fetch(`http://127.0.0.1:${port}${result.artifacts?.zip?.downloadUrl}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/zip");
    assert.match(response.headers.get("content-disposition") ?? "", /attachment/);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    assert.deepEqual(Object.keys(zip.files).sort(), [
      "Web UI reviewUI走查结果.xlsx",
      "difflab-report-bundle-diff.png",
      "difflab-report-bundle.html",
      "difflab-report-bundle.json",
      "difflab-report-bundle.md"
    ]);
    assert.equal(await zip.file("difflab-report-bundle.html")?.async("string"), report.reportHtml);
    assert.equal(await zip.file("Web UI reviewUI走查结果.xlsx")?.async("string"), "xlsx");
    assert.equal(await zip.file("difflab-report-bundle-diff.png")?.async("string"), "diff-png");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
