import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { buildReviewEvidence } from "./review-evidence";
import type { BatchReviewResult, CompareReport } from "../src/types";

test("long-image crops preserve absolute positions and each image's pixel scale", async () => {
  const design = await sharp({ create: { width: 80, height: 400, channels: 4, background: "white" } }).png().toBuffer();
  const blue = await sharp({ create: { width: 40, height: 40, channels: 4, background: "blue" } }).png().toBuffer();
  const actual = await sharp({ create: { width: 160, height: 800, channels: 4, background: "red" } })
    .composite([{ input: blue, left: 20, top: 640 }]).png().toBuffer();
  const box = { x: 10, y: 320, width: 20, height: 20 };
  const report = { viewport: { width: 80, height: 400 }, evidenceMode: "long_screenshot",
    images: { reference: `data:image/png;base64,${design.toString("base64")}`, actual: `data:image/png;base64,${actual.toString("base64")}`, diff: "" },
    matching: {}, issues: [{ id: "target", rule: "color", designBox: box, actualBox: box, location: { longScreenshot: { tileIndex: 3, scrollY: 300 } } }]
  } as CompareReport;
  const evidence = await buildReviewEvidence({ pages: [{ clientPageId: "long", report }] } as BatchReviewResult);
  const refs = evidence.pages.get("long")!.issueCrops.get("target")!;
  assert.deepEqual(evidence.artifacts.get(refs.designCrop!)!.box, box);
  const crop = evidence.artifacts.get(refs.actualCrop!)!;
  assert.deepEqual(crop.box, { x: 20, y: 640, width: 40, height: 40 });
  const { data } = await sharp(crop.buffer).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.subarray(0, 4)], [0, 0, 255, 255]);
  assert.equal(crop.sourceArtifactId, evidence.pages.get("long")!.actualImage);
});

test("unverified recheck candidates do not supply an actual crop", async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 4, background: "white" } }).png().toBuffer();
  const box = { x: 0, y: 0, width: 10, height: 10 };
  const report = { viewport: { width: 20, height: 20 }, images: { actual: `data:image/png;base64,${png.toString("base64")}` },
    matching: { designCoverage: { items: [{ figmaNodeId: "1:2", status: "pending", actualBox: box }] } }, issues: [] } as unknown as CompareReport;
  const evidence = await buildReviewEvidence({ pages: [{ clientPageId: "page", report,
    recheck: { issueId: 1, rule: "size", figmaNodeId: "1:2", verdict: "needs_review", reasonCode: "TARGET_NOT_VERIFIED", checks: [], evidenceRefs: [], evidence: [] }
  }] } as unknown as BatchReviewResult);
  assert.equal(evidence.pages.get("page")!.issueCrops.get("recheck")!.actualCrop, null);
});
