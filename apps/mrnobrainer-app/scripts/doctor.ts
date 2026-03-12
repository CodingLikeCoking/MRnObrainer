import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
  severity: "error" | "warn";
};

const appRoot = resolve(import.meta.dir, "..");
const operatorRoot = join(homedir(), ".operator");
const claudeSettingsPath = join(homedir(), ".claude", "settings.json");
const automationRoot = join(homedir(), ".codex", "automations");

const requiredCommands = ["bun", "node", "cargo", "rustc"] as const;

function hasCommand(command: string): boolean {
  const pathValue = process.env.PATH ?? "";
  return pathValue.split(":").some((segment) => {
    const candidate = join(segment, command);
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function loadJson(path: string): unknown | null {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function hasManagedClaudeHook(
  hooks: Record<string, unknown[]> | undefined,
  hookName: string
): boolean {
  const expectedCommand = `ai-flow finalize --debug-hook ${hookName}`;
  const entries = Array.isArray(hooks?.[hookName]) ? hooks[hookName] : [];

  return entries.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const matcher = (entry as { matcher?: unknown }).matcher;
    const nestedHooks = (entry as { hooks?: unknown }).hooks;

    return (
      matcher === "*" &&
      Array.isArray(nestedHooks) &&
      nestedHooks.some((hook) => {
        if (!hook || typeof hook !== "object") {
          return false;
        }

        return (
          (hook as { type?: unknown }).type === "command" &&
          (hook as { command?: unknown }).command === expectedCommand
        );
      })
    );
  });
}

const results: CheckResult[] = [
  {
    label: "App root",
    ok: existsSync(join(appRoot, "package.json")),
    detail: appRoot,
    severity: "error",
  },
  {
    label: "Operator workspace",
    ok: existsSync(join(operatorRoot, "current-focus.md")),
    detail: operatorRoot,
    severity: "warn",
  },
  {
    label: "Operator prompts",
    ok: existsSync(join(operatorRoot, "prompts", "pm.md")),
    detail: join(operatorRoot, "prompts"),
    severity: "warn",
  },
  {
    label: "Hero-product automations",
    ok:
      existsSync(join(automationRoot, "daily-priority-queue", "automation.toml")) &&
      existsSync(
        join(automationRoot, "nightly-mrnobrainer-canary", "automation.toml")
      ) &&
      existsSync(
        join(automationRoot, "weekly-product-review", "automation.toml")
      ),
    detail: automationRoot,
    severity: "warn",
  },
  {
    label: "Global Codex workflow",
    ok: existsSync(join(homedir(), ".codex", "instructions.md")),
    detail: join(homedir(), ".codex", "instructions.md"),
    severity: "warn",
  },
  {
    label: "Claude global memory",
    ok: existsSync(join(homedir(), ".claude", "CLAUDE.md")),
    detail: join(homedir(), ".claude", "CLAUDE.md"),
    severity: "warn",
  },
  {
    label: "Claude hooks settings",
    ok: existsSync(claudeSettingsPath),
    detail: claudeSettingsPath,
    severity: "warn",
  },
  {
    label: "PostHog key configured",
    ok: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    detail: "Set NEXT_PUBLIC_POSTHOG_KEY for product analytics.",
    severity: "warn",
  },
  {
    label: "Sentry DSN configured",
    ok: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN),
    detail: "Set NEXT_PUBLIC_SENTRY_DSN or SENTRY_DSN for release monitoring.",
    severity: "warn",
  },
];

for (const command of requiredCommands) {
  results.push({
    label: `Command: ${command}`,
    ok: hasCommand(command),
    detail: `Required on PATH: ${command}`,
    severity: "error",
  });
}

const claudeSettings = loadJson(claudeSettingsPath) as
  | { hooks?: Record<string, unknown[]> }
  | null;

for (const hookName of [
  "UserPromptSubmit",
  "Stop",
  "TaskCompleted",
  "SessionEnd",
]) {
  results.push({
    label: `Claude hook: ${hookName}`,
    ok: hasManagedClaudeHook(claudeSettings?.hooks, hookName),
    detail: `Expected ai-flow managed Claude hook for ${hookName}`,
    severity: "warn",
  });
}

const warnings = results.filter((item) => !item.ok && item.severity === "warn");
const failures = results.filter((item) => !item.ok && item.severity === "error");

console.log("MRnObrainer doctor (environment + operator wiring)");
for (const item of results) {
  const prefix = item.ok ? "PASS" : item.severity === "error" ? "FAIL" : "WARN";
  console.log(`${prefix}  ${item.label} - ${item.detail}`);
}

if (failures.length > 0) {
  console.log("");
  console.log("Doctor found blocking issues.");
  process.exitCode = 1;
} else if (warnings.length > 0) {
  console.log("");
  console.log("Doctor finished with warnings.");
} else {
  console.log("");
  console.log("Doctor finished cleanly.");
}

console.log(
  "Doctor verifies environment and operator wiring only. Use canary and ship artifacts for release evidence."
);
