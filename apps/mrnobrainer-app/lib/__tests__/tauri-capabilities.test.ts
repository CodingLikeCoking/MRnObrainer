import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function loadCapabilities() {
  const filePath = path.resolve(
    process.cwd(),
    "src-tauri/capabilities/main.json",
  );
  return JSON.parse(readFileSync(filePath, "utf8")) as {
    remote: { urls: string[] };
    permissions: Array<
      | string
      | {
          identifier?: string;
          allow?: Array<{ url?: string }>;
        }
    >;
  };
}

function getPermissionUrls(
  capabilities: ReturnType<typeof loadCapabilities>,
  identifier: string,
) {
  const permission = capabilities.permissions.find(
    (entry) =>
      typeof entry !== "string" && entry.identifier === identifier,
  );

  return permission && typeof permission !== "string"
    ? (permission.allow || [])
        .map((entry) => entry.url)
        .filter((url): url is string => Boolean(url))
    : [];
}

describe("tauri capability allowlist", () => {
  it("keeps only the audited remote hosts for the shipping desktop flow", () => {
    const capabilities = loadCapabilities();

    expect([...capabilities.remote.urls].sort()).toEqual(
      [
        "http://127.0.0.1:*",
        "http://localhost:*",
        "https://*.openai.com/*",
        "https://api.github.com/*",
        "https://api.openai.com/*",
        "https://api.screenpi.pe/*",
        "https://github.com/*",
        "https://objects.githubusercontent.com/*",
        "https://release-assets.githubusercontent.com/*",
        "https://screenpi.pe/*",
      ].sort(),
    );
  });

  it("matches the HTTP plugin allowlist to the same audited domains", () => {
    const capabilities = loadCapabilities();
    const urls = getPermissionUrls(capabilities, "http:default");

    expect([...urls].sort()).toEqual(
      [
        "http://127.0.0.1:*/*",
        "http://localhost:*/*",
        "https://*.openai.com/*",
        "https://api.github.com/*",
        "https://api.openai.com/*",
        "https://api.screenpi.pe/*",
        "https://github.com/*",
        "https://objects.githubusercontent.com/*",
        "https://release-assets.githubusercontent.com/*",
        "https://screenpi.pe/*",
      ].sort(),
    );
  });

  it("keeps wildcard browser-launch permissions explicit and separate from fetch allowlists", () => {
    const capabilities = loadCapabilities();

    expect(getPermissionUrls(capabilities, "shell:allow-open")).toEqual([
      "^https?://.*",
      "^mailto:.*",
      "^tel:.*",
      "^x-apple-reminderkit://.*",
    ]);
    expect(getPermissionUrls(capabilities, "opener:allow-open-url")).toEqual([
      "^https?://.*",
      "^mailto:.*",
      "^tel:.*",
      "^x-apple-reminderkit://.*",
      "^obsidian://.*",
    ]);
  });
});
