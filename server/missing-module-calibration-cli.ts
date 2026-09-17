import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { calibrateMissingModulesFromManifest } from "./missing-module-calibration";

export interface MissingModuleCalibrationCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

function parseArguments(args: string[]): { labels: string; output?: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must use --name value pairs.");
    }
    values.set(name, value);
  }
  const labels = values.get("--labels");
  if (!labels) {
    throw new Error(
      "Missing --labels. Usage: npm run calibrate:missing-modules -- --labels labels.json [--output directory]."
    );
  }
  return { labels, output: values.get("--output") };
}

function percent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export async function runMissingModuleCalibrationCli(
  args: string[],
  io: MissingModuleCalibrationCliIo = {
    stdout: (message) => process.stdout.write(`${message}\n`),
    stderr: (message) => process.stderr.write(`${message}\n`)
  }
): Promise<number> {
  try {
    const parsed = parseArguments(args);
    const result = await calibrateMissingModulesFromManifest(parsed.labels);
    io.stdout(`samples: ${result.sampleCount} across ${result.groupCount} Page/Frame group(s)`);
    io.stdout(
      `current accuracy: ${percent(result.current.metrics.accuracy)}; balanced accuracy: ${percent(result.current.metrics.balancedAccuracy)}`
    );
    io.stdout(
      `candidate accuracy: ${percent(result.candidate.metrics.accuracy)}; balanced accuracy: ${percent(result.candidate.metrics.balancedAccuracy)}`
    );
    io.stdout(`candidate confusion matrix: ${JSON.stringify(result.candidate.metrics.confusionMatrix)}`);
    io.stdout(`recommendation: ${result.recommendation.accepted ? "recommended" : "rejected"}`);
    for (const reason of result.recommendation.reasons) io.stdout(`recommendation reason: ${reason}`);

    if (parsed.output) {
      const outputDirectory = path.resolve(parsed.output);
      await mkdir(outputDirectory, { recursive: true });
      const candidatePath = path.join(outputDirectory, "missing-module-candidate.yaml");
      if (result.recommendation.accepted) {
        await writeFile(candidatePath, result.candidateYaml, "utf8");
      } else {
        await rm(candidatePath, { force: true });
      }
      await writeFile(
        path.join(outputDirectory, "missing-module-metrics.json"),
        `${JSON.stringify(result, null, 2)}\n`,
        "utf8"
      );
      io.stdout(`artifacts: ${outputDirectory}`);
    } else if (result.recommendation.accepted) {
      io.stdout("");
      io.stdout(result.candidateYaml.trimEnd());
    }
    return 0;
  } catch (error) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) process.exitCode = await runMissingModuleCalibrationCli(process.argv.slice(2));
