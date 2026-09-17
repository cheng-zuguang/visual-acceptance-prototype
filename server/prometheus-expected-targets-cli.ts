import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { generatePrometheusExpectedTargetRules } from "./prometheus-expected-targets.js";

const [inventoryPath, outputPath] = process.argv.slice(2);

if (!inventoryPath || !outputPath) {
  throw new Error(
    "Usage: npm run generate:prometheus-target-rules -- <inventory.yml> <output.rules.yml>"
  );
}

const resolvedInventoryPath = resolve(inventoryPath);
const resolvedOutputPath = resolve(outputPath);
const source = await readFile(resolvedInventoryPath, "utf8");
const rules = generatePrometheusExpectedTargetRules(source);

await writeFile(resolvedOutputPath, rules, "utf8");
process.stdout.write(`Generated Prometheus expected-target rules at ${resolvedOutputPath}\n`);
