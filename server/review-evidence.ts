import { createHash } from "node:crypto";
import sharp from "sharp";
import type { BatchReviewResult, Box } from "../src/types";

export interface EvidenceImage {
  artifactId: string;
  kind: "image";
  filename: string;
  contentType: "image/png";
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
  buffer: Buffer;
  box?: Box;
  sourceArtifactId?: string;
}
export interface PageImageEvidence {
  designImage: string | null;
  actualImage: string | null;
  diffImage: string | null;
  issueCrops: Map<string, { designCrop: string | null; actualCrop: string | null }>;
}
export interface ReviewEvidence {
  artifacts: Map<string, EvidenceImage>;
  pages: Map<string, PageImageEvidence>;
}

/** Bytes stay behind the artifact boundary; callers serialize metadata only. */
export async function buildReviewEvidence(result: BatchReviewResult): Promise<ReviewEvidence> {
  const artifacts = new Map<string, EvidenceImage>();
  const pages = new Map<string, PageImageEvidence>();
  for (const [index, page] of result.pages.entries()) {
    if (!page.report) continue;
    const refs: PageImageEvidence = { designImage: null, actualImage: null, diffImage: null, issueCrops: new Map() };
    for (const [key, source] of [["designImage", "reference"], ["actualImage", "actual"], ["diffImage", "diff"]] as const) {
      const data = page.report.images?.[source];
      const match = data?.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=\s]+)$/i);
      if (!match) continue;
      try {
        const { data: buffer, info } = await sharp(Buffer.from(match[1], "base64")).png().toBuffer({ resolveWithObject: true });
        const artifactId = `image_${index}_${source}`;
        artifacts.set(artifactId, { artifactId, kind: "image", filename: `${artifactId}.png`, contentType: "image/png",
          width: info.width, height: info.height, sizeBytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"), buffer });
        refs[key] = artifactId;
      } catch {
        // Unavailable evidence must not be replaced by another image or discard valid findings.
      }
    }
    const cropTargets = page.recheck ? [{ id: "recheck", rule: page.recheck.rule, figmaNodeId: page.recheck.figmaNodeId,
      designBox: page.recheck.designBox, actualBox: page.recheck.actualBox, location: {} as { designBox?: Box; actualBox?: Box }, box: undefined as Box | undefined }]
      : page.report.issues;
    for (const [issueIndex, issue] of cropTargets.entries()) {
      const item = page.report.matching.designCoverage?.items.find(item => item.figmaNodeId === issue.figmaNodeId);
      const crops = { designCrop: null as string | null, actualCrop: null as string | null };
      for (const [key, sourceId, region] of [
        ["designCrop", refs.designImage, issue.designBox ?? issue.location.designBox ?? item?.designBox],
        ["actualCrop", refs.actualImage, page.recheck ? page.recheck.actualBox : issue.rule === "missing_module" ? undefined : issue.actualBox ?? issue.location.actualBox ?? issue.box ?? item?.actualBox]
      ] as const) {
        const source = sourceId ? artifacts.get(sourceId) : undefined;
        if (!source || !region) continue;
        const sx = source.width / page.report.viewport.width;
        const sy = source.height / page.report.viewport.height;
        const left = Math.max(0, Math.floor(region.x * sx));
        const top = Math.max(0, Math.floor(region.y * sy));
        const width = Math.min(source.width, Math.ceil((region.x + region.width) * sx)) - left;
        const height = Math.min(source.height, Math.ceil((region.y + region.height) * sy)) - top;
        if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;
        const buffer = await sharp(source.buffer).extract({ left, top, width, height }).png().toBuffer();
        const artifactId = `crop_${index}_${issueIndex}_${key}`;
        artifacts.set(artifactId, { artifactId, kind: "image", filename: `${artifactId}.png`, contentType: "image/png",
          width, height, sizeBytes: buffer.length, sha256: createHash("sha256").update(buffer).digest("hex"), buffer,
          sourceArtifactId: source.artifactId, box: { x: left, y: top, width, height } });
        crops[key] = artifactId;
      }
      refs.issueCrops.set(issue.id, crops);
    }
    pages.set(page.clientPageId, refs);
  }
  return { artifacts, pages };
}
