import express from "express";
import multer from "multer";
import sharp from "sharp";
import type { BatchReviewResult, CompareReport, ExcelArtifact, ScreenshotDeviceMetadata } from "../src/types";
import { requestLocale } from "./i18n";
import { buildExcelReportArtifact } from "./excel-report";
import { buildWebReportBundle } from "./report-bundle";
import type { AiReviewOptions, ReviewBatchPagePairInput, ReviewPagePairsInput } from "./review";

export interface WebCompareApiOptions {
  executeReview: (input: ReviewPagePairsInput) => Promise<BatchReviewResult>;
  executeDemo?: (input: {
    locale: "zh-CN" | "en";
    rulesYaml?: string;
    ai?: AiReviewOptions;
  }) => Promise<CompareReport>;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 5 }
});

async function screenshotSources(
  files: Express.Multer.File[],
  body: Record<string, string>,
  mode: "screenshot" | "hybrid" | "long_screenshot"
) {
  const dpr = Number(body.screenshotDpr || 1);
  const platform = body.screenshotPlatform?.trim() || "uploaded";
  return Promise.all(files.map(async (file) => {
    const metadata = await sharp(file.buffer).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const viewport = mode === "long_screenshot"
      ? { width: width / dpr, height: Number(body.longScreenshotViewportHeight) }
      : { width: width / dpr, height: height / dpr };
    const device: ScreenshotDeviceMetadata = {
      platform,
      dpr,
      orientation: viewport.width > viewport.height ? "landscape" : "portrait",
      viewport
    };
    return { name: file.originalname, image: file.buffer, device };
  }));
}

export function createWebCompareRouter(options: WebCompareApiOptions): express.Router {
  const router = express.Router();
  const reportArtifacts = new Map<string, {
    excel: ExcelArtifact;
    zip: Buffer;
    zipFilename: string;
  }>();
  const rememberArtifacts = (
    reportId: string,
    excel: ExcelArtifact,
    zip: Buffer,
    zipFilename: string
  ): void => {
    reportArtifacts.delete(reportId);
    reportArtifacts.set(reportId, { excel, zip, zipFilename });
    while (reportArtifacts.size > 50) {
      const oldest = reportArtifacts.keys().next().value as string | undefined;
      if (!oldest) break;
      reportArtifacts.delete(oldest);
    }
  };
  const sendReport = (
    response: express.Response,
    report: CompareReport,
    artifact: ExcelArtifact
  ): Promise<void> => buildWebReportBundle(report, artifact).then((zip) => {
    const zipFilename = `difflab-${report.id}-reports.zip`;
    rememberArtifacts(report.id, artifact, zip, zipFilename);
    response.json({
      ...report,
      artifacts: {
        ...report.artifacts,
        xlsx: {
          filename: artifact.filename,
          contentType: artifact.contentType,
          sizeBytes: artifact.buffer.byteLength,
          downloadUrl: `/api/reports/${encodeURIComponent(report.id)}/artifacts/xlsx`
        },
        zip: {
          filename: zipFilename,
          contentType: "application/zip",
          sizeBytes: zip.byteLength,
          downloadUrl: `/api/reports/${encodeURIComponent(report.id)}/artifacts/zip`
        }
      }
    });
  });

  router.get("/api/reports/:reportId/artifacts/xlsx", (request, response) => {
    const artifacts = reportArtifacts.get(request.params.reportId);
    if (!artifacts) {
      response.status(404).json({ error: "Excel report artifact not found or expired." });
      return;
    }
    const artifact = artifacts.excel;
    response.type(artifact.contentType).attachment(artifact.filename).send(artifact.buffer);
  });

  router.get("/api/reports/:reportId/artifacts/zip", async (request, response, next) => {
    const artifacts = reportArtifacts.get(request.params.reportId);
    if (!artifacts) {
      response.status(404).json({ error: "Report bundle artifact not found or expired." });
      return;
    }
    try {
      response
        .type("application/zip")
        .attachment(artifacts.zipFilename)
        .send(artifacts.zip);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/demo-compare", async (request, response, next) => {
    if (!options.executeDemo) {
      response.status(404).json({ error: "Demo comparison is unavailable." });
      return;
    }
    try {
      const locale = requestLocale(request.body?.locale);
      const report = await options.executeDemo({
        locale,
        rulesYaml: request.body?.rulesYaml,
        ai: {
          requested: request.body?.useAi === true,
          apiKey: request.body?.openaiKey,
          apiUrl: request.body?.openaiApiUrl,
          model: request.body?.openaiModel
        }
      });
      const excel = await buildExcelReportArtifact({
        reviewName: "DiffLab Demo",
        locale,
        pages: [{ clientPageId: "demo-page-pair", pageName: "DiffLab Demo", report }]
      });
      await sendReport(response, report, excel);
    } catch (error) {
      next(error);
    }
  });

  router.post("/api/compare", upload.array("screenshots", 5), async (request, response, next) => {
    try {
      const body = request.body as Record<string, string>;
      const actualMode = body.actualMode === "screenshot" || body.actualMode === "hybrid" || body.actualMode === "long_screenshot"
        ? body.actualMode
        : "live";
      const screenshots = actualMode === "live"
        ? []
        : await screenshotSources((request.files as Express.Multer.File[] | undefined) ?? [], body, actualMode);
      if (actualMode === "long_screenshot" && screenshots.length !== 1) {
        throw new Error("Long Screenshot mode requires exactly one uploaded image.");
      }
      const actual: ReviewBatchPagePairInput["actual"] = actualMode === "live"
        ? { kind: "live" as const, url: String(body.h5Url ?? "") }
        : actualMode === "screenshot"
          ? { kind: "screenshot" as const, screenshots }
          : actualMode === "long_screenshot"
            ? {
                kind: "long_screenshot" as const,
                screenshot: screenshots[0],
                ...(String(body.h5Url ?? "").trim() ? { url: String(body.h5Url).trim() } : {})
              }
            : { kind: "hybrid" as const, url: String(body.h5Url ?? ""), screenshots };
      const result = await options.executeReview({
        reviewName: "Web UI review",
        locale: requestLocale(body.locale),
        rulesYaml: body.rulesYaml,
        ai: {
          requested: body.useAi === "true",
          apiKey: body.openaiKey,
          apiUrl: body.openaiApiUrl,
          model: body.openaiModel
        },
        pagePairs: [{
          clientPageId: "web-page-pair",
          pageName: "Web UI review",
          design: body.figmaUrl?.trim() ? {
            kind: "figma",
            frameUrl: body.figmaUrl,
            accessToken: body.figmaToken
          } : undefined,
          actual
        } as ReviewBatchPagePairInput]
      });
      const page = result.pages[0];
      if (!page?.report) throw new Error(page?.error?.message || "Review failed.");
      await sendReport(response, page.report, result.excel);
    } catch (error) {
      next(error);
    }
  });
  return router;
}
