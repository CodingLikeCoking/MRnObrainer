import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadProdConfig() {
  const filePath = path.resolve(
    process.cwd(),
    "src-tauri/tauri.prod.conf.json",
  );

  return JSON.parse(readFileSync(filePath, "utf8")) as {
    app: {
      security: {
        csp: string | null;
      };
    };
  };
}

describe("tauri release config", () => {
  it("keeps an explicit non-null CSP for the shipping desktop build", () => {
    const config = loadProdConfig();
    const csp = config.app.security.csp;

    expect(csp).toBeTypeOf("string");
    expect(csp).not.toBeNull();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("http://ipc.localhost");
    expect(csp).toContain("connect-src");
    expect(csp).toContain("https://api.github.com");
    expect(csp).toContain("https://api.openai.com");
    expect(csp).toContain("https://api.screenpi.pe");
    expect(csp).toContain("object-src 'none'");
  });
});
