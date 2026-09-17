import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  validateFinancialGoldSet,
  writeMissingModuleCalibrationManifest,
  writePageAlignmentCalibrationManifest
} from "./financial-gold-set";

export interface FinancialGoldSetCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

interface ParsedArguments {
  manifest: string;
  report?: string;
  calibrationOutput?: string;
  missingModuleCalibrationOutput?: string;
}

function parseArguments(args: string[]): ParsedArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must use --name value pairs.");
    }
    values.set(name, value);
  }
  const manifest = values.get("--manifest");
  if (!manifest) {
    throw new Error(
      "Missing --manifest. Usage: npm run validate:financial-gold-set -- --manifest manifest.json [--report validation.json] [--calibration-output labels.json] [--missing-module-calibration-output labels.json]."
    );
  }
  return {
    manifest,
    report: values.get("--report"),
    calibrationOutput: values.get("--calibration-output"),
    missingModuleCalibrationOutput: values.get("--missing-module-calibration-output")
  };
}

export async function runFinancialGoldSetCli(
  args: string[],
  io: FinancialGoldSetCliIo = {
    stdout: (message) => process.stdout.write(`${message}\n`),
    stderr: (message) => process.stderr.write(`${message}\n`)
  }
): Promise<number> {
  try {
    const parsed = parseArguments(args);
    const validation = await validateFinancialGoldSet(parsed.manifest);
    io.stdout(`readiness: ${validation.readiness}`);
    io.stdout(
      `samples: ${validation.summary.totalSamples} total, ${validation.summary.approvedSamples} approved, ${validation.summary.reusableSamples} reusable`
    );
    io.stdout(`evidence modes: ${validation.coverage.modes.join(", ") || "none"}`);
    io.stdout(`scenarios: ${validation.coverage.scenarios.join(", ") || "none"}`);
    for (const error of validation.errors) io.stdout(`error: ${error}`);
    for (const warning of validation.warnings) io.stdout(`warning: ${warning}`);

    if (parsed.report) {
      const reportPath = path.resolve(parsed.report);
      await mkdir(path.dirname(reportPath), { recursive: true });
      await writeFile(reportPath, `${JSON.stringify(validation, null, 2)}\n`, "utf8");
      io.stdout(`validation report: ${reportPath}`);
    }
    if (parsed.calibrationOutput) {
      const exported = await writePageAlignmentCalibrationManifest(
        parsed.manifest,
        parsed.calibrationOutput
      );
      io.stdout(
        `alignment labels: ${path.resolve(parsed.calibrationOutput)} (${exported.sampleIds.length} sample(s))`
      );
    }
    if (parsed.missingModuleCalibrationOutput) {
      const exported = await writeMissingModuleCalibrationManifest(
        parsed.manifest,
        parsed.missingModuleCalibrationOutput
      );
      io.stdout(
        `missing-module labels: ${path.resolve(parsed.missingModuleCalibrationOutput)} (${exported.sampleIds.length} sample(s))`
      );
    }
    return validation.readiness === "ready-for-calibration"
      ? 0
      : validation.readiness === "needs-human-review"
        ? 2
        : 1;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  process.exitCode = await runFinancialGoldSetCli(process.argv.slice(2));
}
