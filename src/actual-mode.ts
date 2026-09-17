export type ActualEvidenceMode = "live" | "screenshot" | "hybrid" | "long_screenshot";

export function canContinueWithActualEvidence(
  mode: ActualEvidenceMode,
  h5Url: string,
  screenshotCount: number
): boolean {
  const hasH5 = Boolean(h5Url.trim());
  const hasScreenshot = screenshotCount > 0;
  if (mode === "live") return hasH5;
  if (mode === "screenshot") return hasScreenshot;
  if (mode === "long_screenshot") return screenshotCount === 1;
  return hasH5 && hasScreenshot;
}
