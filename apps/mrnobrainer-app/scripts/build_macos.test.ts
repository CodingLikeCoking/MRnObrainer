import { describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SCRIPT_PATH = path.resolve(__dirname, "build_macos.sh");

function makeExecutable(filePath: string, body: string) {
  writeFileSync(filePath, body, { mode: 0o755 });
}

function runBuildScript(options?: { securityOutput?: string; expectFailure?: boolean }) {
  const tempDir = mkdtempSync(path.join(tmpdir(), "rewind-build-script-"));
  const binDir = path.join(tempDir, "bin");
  mkdirSync(binDir, { recursive: true });
  mkdirSync(path.join(tempDir, "src-tauri", "target", "release", "bundle", "macos", "MRnObrainer.app"), { recursive: true });

  const logFile = path.join(tempDir, "calls.log");
  const securityOutput = options?.securityOutput ?? "     0 valid identities found\n";

  makeExecutable(
    path.join(binDir, "bun"),
    `#!/bin/bash\necho "bun:$*" >> "${logFile}"\nexit 0\n`,
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

    expect(log).toContain("bun:tauri build --config src-tauri/tauri.prod.conf.json --no-sign");
    expect(log).toContain("xattr:-cr src-tauri/target/release/bundle/macos/MRnObrainer.app");
    expect(log).not.toContain("codesign:");
  });

  test("uses manual codesign when a signing identity is available", () => {
    const log = runBuildScript({
      securityOutput:
        '  1) 0123456789ABCDEF0123456789ABCDEF01234567 "Apple Development: Example Dev (TEAMID)"\n     1 valid identities found\n',
    });

    expect(log).toContain("codesign:--force --deep --sign Apple Development: Example Dev (TEAMID) src-tauri/target/release/bundle/macos/MRnObrainer.app");
  });
});
