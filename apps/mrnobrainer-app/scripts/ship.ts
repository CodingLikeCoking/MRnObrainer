import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = resolve(import.meta.dir, "..");
const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const skipTests = args.has("--skip-tests");
const timestamp = new Date().toISOString().replaceAll(":", "-");
const artifactRoot = join(
  homedir(),
  ".operator",
  "releases",
  "mrnobrainer",
  timestamp
);

mkdirSync(artifactRoot, { recursive: true });

type StepResult = {
  label: string;
  command: string;
};

const completedSteps: StepResult[] = [];

function runStep(label: string, command: string, stepArgs: string[]) {
  console.log(`\n==> ${label}`);
  const result = spawnSync(command, stepArgs, {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }

  completedSteps.push({
    label,
    command: [command, ...stepArgs].join(" "),
  });
}

function readText(path: string): string {
  return readFileSync(path, "utf8").trim();
}

function getGitSummary(): string[] {
  const result = spawnSync("git", ["status", "--short"], {
    cwd: appRoot,
    stdio: ["ignore", "pipe", "ignore"],
    env: process.env,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return ["git status unavailable"];
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 15);
}

try {
  runStep("doctor", "bun", ["run", "doctor"]);
  runStep("smoke", "bun", ["run", "smoke"]);

  if (!skipTests) {
    runStep("test", "bun", ["run", "test"]);
  }

  if (!skipBuild) {
    runStep("build", "bun", ["run", "build"]);
  }

  const focus = readText(join(appRoot, "CURRENT_FOCUS.md"));
  const knownIssues = readText(join(appRoot, "KNOWN_ISSUES.md"));
  const gitSummary = getGitSummary();
  const releaseReady = !skipBuild && !skipTests;
  const releaseReadyReason = releaseReady
    ? "candidate ready for founder review"
    : skipBuild && skipTests
      ? "not release-ready because build and full tests were skipped"
      : skipBuild
        ? "not release-ready because build was skipped"
        : "not release-ready because full tests were skipped";

  const packet = [
    "# MRnObrainer Ship Packet",
    "",
    `- generated_at: ${new Date().toISOString()}`,
    `- app_root: ${appRoot}`,
    `- build_ran: ${skipBuild ? "no" : "yes"}`,
    `- full_test_ran: ${skipTests ? "no" : "yes"}`,
    `- release_ready: ${releaseReadyReason}`,
    "- release_gate: manual founder approval required",
    "",
    "## Validation Run",
    "",
    ...completedSteps.map((step) => `- ${step.label}: \`${step.command}\``),
    "",
    "## What Changed",
    "",
    ...gitSummary.map((line) => `- ${line}`),
    "",
    "## Current Focus",
    "",
    focus,
    "",
    "## Known Issues",
    "",
    knownIssues,
    "",
    "## Rollback Note",
    "",
    releaseReady
      ? "- If final manual verification fails, do not publish the candidate and keep the previous signed release as the active fallback."
      : "- This packet was generated with `--skip-build` and/or `--skip-tests`; do not publish from it. Run `bun run ship` without skip flags before release review.",
  ].join("\n");

  writeFileSync(join(artifactRoot, "ship-packet.md"), `${packet}\n`);
  writeFileSync(
    join(artifactRoot, "status.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        appRoot,
        buildRan: !skipBuild,
        fullTestRan: !skipTests,
        releaseReady,
        validation: completedSteps,
        gitSummary,
      },
      null,
      2
    )}\n`
  );

  console.log(`\nShip packet written to ${artifactRoot}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
