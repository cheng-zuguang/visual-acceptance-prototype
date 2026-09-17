import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const EVIDENCE_MODES = ["live", "screenshot", "hybrid"] as const;
const REQUIRED_SCENARIOS = [
  "market-value",
  "market-list",
  "market-variant-up",
  "market-variant-down",
  "market-variant-flat",
  "async-loading",
  "static-region"
] as const;

const approvalSchema = z.object({
  status: z.enum(["draft", "approved"]),
  reviewer: z.string().trim().min(1).optional(),
  reviewedAt: z.iso.datetime().optional()
});

const actualBaseSchema = z.object({
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    dpr: z.number().positive()
  })
});

const sampleSchema = z.object({
  id: z.string().trim().min(1),
  pageFrameGroupId: z.string().trim().min(1),
  approval: approvalSchema,
  dataPolicy: z.object({
    classification: z.enum(["public", "sanitized"]),
    reusableInTests: z.boolean()
  }),
  design: z.object({
    figmaUrl: z.url().refine((value) => value.includes("figma.com/"), "must be a Figma URL"),
    frameId: z.string().trim().min(1)
  }),
  actual: z.discriminatedUnion("mode", [
    actualBaseSchema.extend({
      mode: z.literal("live"),
      h5Url: z.url(),
      screenshots: z.array(z.string().trim().min(1)).optional()
    }),
    actualBaseSchema.extend({
      mode: z.literal("screenshot"),
      screenshots: z.array(z.string().trim().min(1)).min(1)
    }),
    actualBaseSchema.extend({
      mode: z.literal("hybrid"),
      h5Url: z.url(),
      screenshots: z.array(z.string().trim().min(1)).min(1)
    })
  ]),
  reviewJson: z.string().trim().min(1).optional(),
  coverage: z.array(z.string().trim().min(1)).min(1),
  expectedIssues: z.array(z.object({
    id: z.string().trim().min(1),
    location: z.string().trim().min(1),
    category: z.string().trim().min(1),
    designValue: z.string().trim().min(1),
    actualValue: z.string().trim().min(1),
    priority: z.enum(["P0", "P1", "P2", "Pending"])
  })),
  pageAlignmentLabels: z.array(z.object({
    designParentFigmaNodeId: z.string().trim().min(1),
    regionIndex: z.number().int().nonnegative().optional(),
    label: z.enum(["correct", "false_positive"])
  })).default([]),
  missingModuleLabels: z.array(z.object({
    designParentFigmaNodeId: z.string().trim().min(1),
    regionIndex: z.number().int().nonnegative().optional(),
    label: z.enum(["correct", "false_positive"]),
    reason: z.string().trim().min(1)
  })).default([]),
  allowedDynamics: z.array(z.object({
    id: z.string().trim().min(1),
    location: z.string().trim().min(1),
    type: z.string().trim().min(1),
    reason: z.string().trim().min(1)
  }))
});

const manifestSchema = z.object({
  schemaVersion: z.literal("1.0"),
  datasetId: z.string().trim().min(1),
  samples: z.array(sampleSchema).min(1)
});

export type FinancialGoldSetManifest = z.infer<typeof manifestSchema>;

export interface PageAlignmentCalibrationManifest {
  version: 1;
  reviews: Array<{
    review: string;
    labels: Array<{
      frameId: string;
      designParentFigmaNodeId: string;
      regionIndex?: number;
      label: "correct" | "false_positive";
    }>;
  }>;
}

export interface MissingModuleCalibrationManifest {
  version: 1;
  reviews: Array<{
    review: string;
    labels: Array<{
      frameId: string;
      designParentFigmaNodeId: string;
      regionIndex?: number;
      label: "correct" | "false_positive";
    }>;
  }>;
}

export interface FinancialGoldSetValidationResult {
  valid: boolean;
  readiness: "ready-for-calibration" | "needs-human-review" | "invalid";
  errors: string[];
  warnings: string[];
  summary: {
    totalSamples: number;
    approvedSamples: number;
    reusableSamples: number;
  };
  coverage: {
    modes: string[];
    scenarios: string[];
    missingModes: string[];
    missingScenarios: string[];
  };
}

function emptyResult(errors: string[]): FinancialGoldSetValidationResult {
  return {
    valid: false,
    readiness: "invalid",
    errors,
    warnings: [],
    summary: { totalSamples: 0, approvedSamples: 0, reusableSamples: 0 },
    coverage: { modes: [], scenarios: [], missingModes: [...EVIDENCE_MODES], missingScenarios: [...REQUIRED_SCENARIOS] }
  };
}

async function missingEvidenceFiles(
  manifest: FinancialGoldSetManifest,
  manifestPath: string
): Promise<string[]> {
  const errors: string[] = [];
  const baseDirectory = path.dirname(manifestPath);
  for (const sample of manifest.samples) {
    const referencedFiles = [
      sample.reviewJson,
      ...(sample.actual.screenshots ?? [])
    ].filter((value): value is string => Boolean(value));
    for (const referencedFile of referencedFiles) {
      const resolved = path.resolve(baseDirectory, referencedFile);
      const relative = path.relative(baseDirectory, resolved);
      if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
        errors.push(`Sample ${sample.id} references evidence outside the dataset directory: ${referencedFile}`);
        continue;
      }
      try {
        await access(resolved);
      } catch {
        errors.push(`Sample ${sample.id} references a missing evidence file: ${referencedFile}`);
      }
    }
  }
  return errors;
}

function credentialErrors(manifest: FinancialGoldSetManifest): string[] {
  const errors: string[] = [];
  const credentialName = /(?:^|[_-])(token|key|secret|password|passwd|cookie|authorization|session)(?:$|[_-])/i;
  for (const sample of manifest.samples) {
    const urls = [
      ["Figma", sample.design.figmaUrl],
      ...("h5Url" in sample.actual ? [["H5", sample.actual.h5Url]] : [])
    ] as Array<[string, string]>;
    for (const [kind, value] of urls) {
      const url = new URL(value);
      const unsafeNames = [...url.searchParams.keys()].filter((name) => credentialName.test(name));
      if (unsafeNames.length > 0) {
        errors.push(
          `Sample ${sample.id} ${kind} URL contains credential-like query parameter(s): ${unsafeNames.join(", ")}.`
        );
      }
    }
  }
  return errors;
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function reportsFromReview(value: unknown): JsonRecord[] {
  const root = record(value);
  if (Object.keys(record(root.source)).length > 0) return [root];
  const pages = Array.isArray(root.pages)
    ? root.pages
    : Array.isArray(root.pageResults)
      ? root.pageResults
      : [];
  return pages.map((page) => {
    const entry = record(page);
    return Object.keys(record(entry.report)).length > 0 ? record(entry.report) : entry;
  });
}

function canonicalUrl(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

async function reviewEvidenceErrors(
  manifest: FinancialGoldSetManifest,
  manifestPath: string
): Promise<string[]> {
  const errors: string[] = [];
  const baseDirectory = path.dirname(manifestPath);
  for (const sample of manifest.samples) {
    if (!sample.reviewJson) continue;
    const reviewPath = path.resolve(baseDirectory, sample.reviewJson);
    const relative = path.relative(baseDirectory, reviewPath);
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
      continue;
    }
    let reports: JsonRecord[];
    try {
      reports = reportsFromReview(JSON.parse(await readFile(reviewPath, "utf8")));
    } catch (error) {
      errors.push(
        `Sample ${sample.id} Review JSON cannot be read: ${error instanceof Error ? error.message : String(error)}.`
      );
      continue;
    }
    if (reports.length === 0) {
      errors.push(`Sample ${sample.id} Review JSON contains no report source.`);
      continue;
    }
    const h5Url = "h5Url" in sample.actual ? sample.actual.h5Url : undefined;
    const expectedActual = h5Url === undefined ? undefined : canonicalUrl(h5Url);
    const candidates = reports.filter((report) => {
      const source = record(report.source);
      const designMatches = typeof source.design === "string" &&
        source.design.includes(sample.design.frameId);
      const actualMatches = expectedActual === undefined || (
        typeof source.actual === "string" && canonicalUrl(source.actual) === expectedActual
      );
      return designMatches || actualMatches;
    });
    const report = reports.length === 1
      ? reports[0]
      : candidates.length === 1
        ? candidates[0]
        : undefined;
    if (!report) {
      errors.push(
        `Sample ${sample.id} Review JSON does not identify exactly one report for frame ${sample.design.frameId}.`
      );
      continue;
    }
    const source = record(report.source);
    if (typeof source.design !== "string" || !source.design.includes(sample.design.frameId)) {
      errors.push(
        `Sample ${sample.id} Review JSON does not match frame ${sample.design.frameId}.`
      );
    }
    if (expectedActual !== undefined) {
      let actualMatches = false;
      if (typeof source.actual === "string") {
        try {
          actualMatches = canonicalUrl(source.actual) === expectedActual;
        } catch {
          actualMatches = false;
        }
      }
      if (!actualMatches) {
        errors.push(`Sample ${sample.id} Review JSON does not match H5 ${h5Url}.`);
      }
    }
    const evidenceMode = report.evidenceMode;
    const modeMatches = evidenceMode === sample.actual.mode ||
      (sample.actual.mode === "hybrid" && evidenceMode === "screenshot");
    if (!modeMatches) {
      errors.push(
        `Sample ${sample.id} Review evidence mode ${String(evidenceMode)} does not match ${sample.actual.mode}.`
      );
    }
    const viewport = record(report.viewport);
    if (
      viewport.width !== sample.actual.viewport.width ||
      viewport.height !== sample.actual.viewport.height
    ) {
      errors.push(
        `Sample ${sample.id} Review viewport ${String(viewport.width)}x${String(viewport.height)} does not match ${sample.actual.viewport.width}x${sample.actual.viewport.height}.`
      );
    }
    const missingModuleCandidates = Array.isArray(record(record(report.matching).missingModules).candidates)
      ? record(record(report.matching).missingModules).candidates as unknown[]
      : [];
    for (const label of sample.missingModuleLabels) {
      const resolved = missingModuleCandidates.filter((candidateValue) => {
        const candidate = record(candidateValue);
        return candidate.figmaNodeId === label.designParentFigmaNodeId &&
          (label.regionIndex === undefined || candidate.regionIndex === label.regionIndex);
      });
      if (resolved.length !== 1) {
        errors.push(
          `Sample ${sample.id} missing-module label ${label.designParentFigmaNodeId}` +
          `${label.regionIndex === undefined ? "" : ` at region ${label.regionIndex}`} does not resolve to exactly one Review JSON candidate.`
        );
      }
    }
  }
  return errors;
}

export async function validateFinancialGoldSet(
  manifestFilePath: string
): Promise<FinancialGoldSetValidationResult> {
  const resolvedManifestPath = path.resolve(manifestFilePath);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(resolvedManifestPath, "utf8"));
  } catch (error) {
    return emptyResult([
      `Unable to read gold-set manifest: ${error instanceof Error ? error.message : String(error)}`
    ]);
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) {
    return emptyResult(parsed.error.issues.map((issue) =>
      `${issue.path.join(".") || "manifest"}: ${issue.message}`
    ));
  }

  const manifest = parsed.data;
  const errors = [
    ...await missingEvidenceFiles(manifest, resolvedManifestPath),
    ...credentialErrors(manifest),
    ...await reviewEvidenceErrors(manifest, resolvedManifestPath)
  ];
  const modes = [...new Set(manifest.samples.map((sample) => sample.actual.mode))].sort();
  const scenarios = [...new Set(manifest.samples.flatMap((sample) => sample.coverage))].sort();
  const missingModes = EVIDENCE_MODES.filter((mode) => !modes.includes(mode));
  const missingScenarios = REQUIRED_SCENARIOS.filter((scenario) => !scenarios.includes(scenario));
  const approvedSamples = manifest.samples.filter((sample) =>
    sample.approval.status === "approved" &&
    Boolean(sample.approval.reviewer) &&
    Boolean(sample.approval.reviewedAt)
  ).length;
  const reusableSamples = manifest.samples.filter((sample) =>
    sample.dataPolicy.reusableInTests
  ).length;
  const warnings: string[] = [];
  if (approvedSamples < manifest.samples.length) {
    warnings.push(`${manifest.samples.length - approvedSamples} sample(s) still require designer approval.`);
  }
  if (reusableSamples < manifest.samples.length) {
    warnings.push(`${manifest.samples.length - reusableSamples} sample(s) are not approved for test reuse.`);
  }
  const missingReviewSamples = manifest.samples.filter((sample) => !sample.reviewJson);
  if (missingReviewSamples.length > 0) {
    warnings.push(
      `Samples still requiring generated Review JSON: ${missingReviewSamples.map((sample) => sample.id).join(", ")}.`
    );
  }
  const missingAlignmentLabels = manifest.samples.filter((sample) =>
    sample.approval.status === "approved" &&
    sample.dataPolicy.reusableInTests &&
    sample.pageAlignmentLabels.length === 0
  );
  if (missingAlignmentLabels.length > 0) {
    warnings.push(
      `Approved reusable samples still requiring PageAlignment labels: ${missingAlignmentLabels.map((sample) => sample.id).join(", ")}.`
    );
  }
  const implicitDynamicSamples = manifest.samples.filter((sample) =>
    sample.coverage.some((scenario) => scenario !== "static-region") &&
    sample.allowedDynamics.length === 0
  );
  if (implicitDynamicSamples.length > 0) {
    warnings.push(
      `Samples with dynamic financial coverage must include at least one explicitly allowed dynamic: ${implicitDynamicSamples.map((sample) => sample.id).join(", ")}.`
    );
  }
  if (missingModes.length > 0) warnings.push(`Missing evidence modes: ${missingModes.join(", ")}.`);
  if (missingScenarios.length > 0) warnings.push(`Missing scenarios: ${missingScenarios.join(", ")}.`);

  const ready = errors.length === 0 &&
    warnings.length === 0 &&
    missingModes.length === 0 &&
    missingScenarios.length === 0;
  return {
    valid: errors.length === 0,
    readiness: errors.length > 0
      ? "invalid"
      : ready
        ? "ready-for-calibration"
        : "needs-human-review",
    errors,
    warnings,
    summary: {
      totalSamples: manifest.samples.length,
      approvedSamples,
      reusableSamples
    },
    coverage: {
      modes,
      scenarios,
      missingModes,
      missingScenarios
    }
  };
}

function relativePortablePath(fromDirectory: string, toPath: string): string {
  const relative = path.relative(fromDirectory, toPath).split(path.sep).join("/");
  return relative.startsWith(".") ? relative : `./${relative}`;
}

export async function writePageAlignmentCalibrationManifest(
  manifestFilePath: string,
  outputFilePath: string
): Promise<{
  manifest: PageAlignmentCalibrationManifest;
  sampleIds: string[];
}> {
  const resolvedManifestPath = path.resolve(manifestFilePath);
  const validation = await validateFinancialGoldSet(resolvedManifestPath);
  if (!validation.valid) {
    throw new Error(`Cannot export an invalid financial gold set: ${validation.errors.join(" ")}`);
  }
  const parsed = manifestSchema.parse(JSON.parse(await readFile(resolvedManifestPath, "utf8")));
  const eligible = parsed.samples.filter((sample) =>
    sample.approval.status === "approved" &&
    Boolean(sample.approval.reviewer) &&
    Boolean(sample.approval.reviewedAt) &&
    sample.dataPolicy.reusableInTests &&
    Boolean(sample.reviewJson) &&
    sample.pageAlignmentLabels.length > 0
  );
  if (eligible.length === 0) {
    throw new Error("No designer-approved reusable samples with Review JSON and PageAlignment labels are available.");
  }
  const labels = new Set(eligible.flatMap((sample) =>
    sample.pageAlignmentLabels.map((entry) => entry.label)
  ));
  if (!labels.has("correct") || !labels.has("false_positive")) {
    throw new Error("Calibration export requires at least one correct and one false_positive PageAlignment label.");
  }

  const resolvedOutputPath = path.resolve(outputFilePath);
  const outputDirectory = path.dirname(resolvedOutputPath);
  const sourceDirectory = path.dirname(resolvedManifestPath);
  const manifest: PageAlignmentCalibrationManifest = {
    version: 1,
    reviews: eligible.map((sample) => ({
      review: relativePortablePath(
        outputDirectory,
        path.resolve(sourceDirectory, sample.reviewJson as string)
      ),
      labels: sample.pageAlignmentLabels.map((entry) => ({
        frameId: sample.design.frameId,
        designParentFigmaNodeId: entry.designParentFigmaNodeId,
        ...(entry.regionIndex === undefined ? {} : { regionIndex: entry.regionIndex }),
        label: entry.label
      }))
    }))
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, sampleIds: eligible.map((sample) => sample.id) };
}

export async function writeMissingModuleCalibrationManifest(
  manifestFilePath: string,
  outputFilePath: string
): Promise<{
  manifest: MissingModuleCalibrationManifest;
  sampleIds: string[];
}> {
  const resolvedManifestPath = path.resolve(manifestFilePath);
  const validation = await validateFinancialGoldSet(resolvedManifestPath);
  if (!validation.valid) {
    throw new Error(`Cannot export an invalid financial gold set: ${validation.errors.join(" ")}`);
  }
  const parsed = manifestSchema.parse(JSON.parse(await readFile(resolvedManifestPath, "utf8")));
  const eligible = parsed.samples.filter((sample) =>
    sample.approval.status === "approved" &&
    Boolean(sample.approval.reviewer) &&
    Boolean(sample.approval.reviewedAt) &&
    sample.dataPolicy.reusableInTests &&
    Boolean(sample.reviewJson) &&
    sample.missingModuleLabels.length > 0
  );
  if (eligible.length === 0) {
    throw new Error(
      "No designer-approved reusable samples with Review JSON and missing-module labels are available."
    );
  }
  const labels = new Set(eligible.flatMap((sample) =>
    sample.missingModuleLabels.map((entry) => entry.label)
  ));
  if (!labels.has("correct") || !labels.has("false_positive")) {
    throw new Error(
      "Calibration export requires at least one correct and one false_positive missing-module label."
    );
  }

  const resolvedOutputPath = path.resolve(outputFilePath);
  const outputDirectory = path.dirname(resolvedOutputPath);
  const sourceDirectory = path.dirname(resolvedManifestPath);
  const manifest: MissingModuleCalibrationManifest = {
    version: 1,
    reviews: eligible.map((sample) => ({
      review: relativePortablePath(
        outputDirectory,
        path.resolve(sourceDirectory, sample.reviewJson as string)
      ),
      labels: sample.missingModuleLabels.map((entry) => ({
        frameId: sample.design.frameId,
        designParentFigmaNodeId: entry.designParentFigmaNodeId,
        ...(entry.regionIndex === undefined ? {} : { regionIndex: entry.regionIndex }),
        label: entry.label
      }))
    }))
  };
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolvedOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { manifest, sampleIds: eligible.map((sample) => sample.id) };
}
