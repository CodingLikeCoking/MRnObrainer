import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const appRoot = resolve(import.meta.dir, "..");
const smokeTests = [
  "lib/__tests__/onboarding-flow.test.ts",
  "lib/__tests__/capture-verification.test.ts",
  "lib/__tests__/update-state.test.ts",
];

console.log("MRnObrainer smoke");
console.log(`Running ${smokeTests.length} focused tests`);

const result = spawnSync(
  "bunx",
  ["vitest", "run", "--config", "vitest.config.ts", ...smokeTests],
  {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
