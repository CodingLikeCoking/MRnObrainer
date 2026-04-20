import { describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SCRIPT_PATH = path.resolve(__dirname, "build_macos.sh");

function makeExecutable(filePath: string, body: string) {
  writeFileSync(filePath, body, { mode: 0o755 });
}

function runBuildScript(options?: {
  securityOutput?: string;
  expectFailure?: boolean;
  channel?: "prod" | "dev";
}) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "rewind-build-script-"));
  const binDir = path.join(tempDir, "bin");
  mkdirSync(binDir, { recursive: true });
  const appName = options?.channel === "dev" ? "MRnObrainer Dev.app" : "MRnObrainer.app";
  mkdirSync(path.join(tempDir, "src-tauri", "target", "release", "bundle", "macos", appName), { recursive: true });

  const logFile = path.join(tempDir, "calls.log");
  const securityOutput = options?.securityOutput ?? "     0 valid identities found\n";

  makeExecutable(
    path.join(binDir, "bun"),
    `#!/bin/bash
echo "bun:$*" >> "${logFile}"
if [[ "$*" == *"tauri build"* ]]; then
  if [[ "\${MRNOBRAINER_BUILD_CHANNEL:-prod}" == "dev" ]]; then
    mkdir -p "src-tauri/target/release/bundle/macos/MRnObrainer Dev.app"
  else
    mkdir -p "src-tauri/target/release/bundle/macos/MRnObrainer.app"
  fi
fi
exit 0
`,
  );
  makeExecutable(
    path.join(binDir, "xattr"),
    `#!/bin/bash\necho "xattr:$*" >> "${logFile}"\nexit 0\n`,
  );
  makeExecutable(
    path.join(binDir, "codesign"),
    `#!/bin/bash\necho "codesign:$*" >> "${logFile}"\nexit 0\n`,
  );
  makeExecutable(
    path.join(binDir, "security"),
    `#!/bin/bash\ncat <<'OUT'\n${securityOutput}OUT\n`,
  );

  try {
    execFileSync("bash", [SCRIPT_PATH], {
      cwd: tempDir,
      env: {
        ...process.env,
        MRNOBRAINER_BUILD_CHANNEL: options?.channel ?? "prod",
        PATH: `${binDir}:${process.env.PATH}`,
      },
      stdio: "pipe",
    });
  } catch (error) {
    if (!options?.expectFailure) {
      throw error;
    }
  }

  const log = readFileSync(logFile, "utf8");
  rmSync(tempDir, { recursive: true, force: true });
  return log;
}

describe("build_macos.sh", () => {
  test("skips manual codesign when no Apple signing identity is available", () => {
    const log = runBuildScript();

    expect(log).toContain("bun:tauri build --config src-tauri/tauri.prod.conf.json --features official-build --no-sign");
    expect(log).toContain("xattr:-cr src-tauri/target/release/bundle/macos/MRnObrainer.app");
    expect(log).not.toContain("codesign:");
  });

  test("prefers Developer ID Application for stable builds", () => {
    const log = runBuildScript({
      securityOutput:
        '  1) 0123456789ABCDEF0123456789ABCDEF01234567 "Developer ID Application: Example Dev (TEAMID)"\n  2) 89ABCDEF0123456789ABCDEF0123456789ABCDEF "Apple Development: Example Dev (TEAMID)"\n     2 valid identities found\n',
    });

    expect(log).toContain("bun:tauri build --config src-tauri/tauri.prod.conf.json --features official-build --no-sign");
    expect(log).toContain("codesign:--force --deep --sign Developer ID Application: Example Dev (TEAMID) src-tauri/target/release/bundle/macos/MRnObrainer.app");
  });

  test("prefers Apple Development for dev builds and uses the dev app bundle name", () => {
    const log = runBuildScript({
      channel: "dev",
      securityOutput:
        '  1) 0123456789ABCDEF0123456789ABCDEF01234567 "Apple Development: Example Dev (TEAMID)"\n  2) 89ABCDEF0123456789ABCDEF0123456789ABCDEF "Developer ID Application: Example Dev (TEAMID)"\n     2 valid identities found\n',
    });

    expect(log).toContain("bun:tauri build --config src-tauri/tauri.conf.json --no-sign");
    expect(log).toContain("xattr:-cr src-tauri/target/release/bundle/macos/MRnObrainer Dev.app");
    expect(log).toContain("codesign:--force --deep --sign Apple Development: Example Dev (TEAMID) src-tauri/target/release/bundle/macos/MRnObrainer Dev.app");
  });
});
