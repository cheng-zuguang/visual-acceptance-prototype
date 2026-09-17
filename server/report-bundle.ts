import JSZip from "jszip";
import type { CompareReport, ExcelArtifact } from "../src/types";

function safeFilename(value: string): string {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-");
}

function pngFromDataUrl(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:image\/png;base64,([\s\S]+)$/i);
  if (!match) throw new Error("Diff image is not a PNG data URL.");
  return Buffer.from(match[1], "base64");
}

export async function buildWebReportBundle(
  report: CompareReport,
  excel: ExcelArtifact
): Promise<Buffer> {
  const prefix = safeFilename(`difflab-${report.id}`);
  const excelFilename = safeFilename(excel.filename);
  const { reportHtml: _html, markdown: _markdown, images: _images, ...jsonResult } = report;
  const zip = new JSZip();

  zip.file(`${prefix}.html`, report.reportHtml);
  zip.file(`${prefix}.md`, report.markdown);
  zip.file(`${prefix}.json`, JSON.stringify(jsonResult, null, 2));
  zip.file(`${prefix}-diff.png`, pngFromDataUrl(report.images.diff));
  zip.file(excelFilename, excel.buffer);

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    streamFiles: true
  });
}
