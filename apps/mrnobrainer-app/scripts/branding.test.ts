import { describe, expect, test } from "vitest";

import {
  createBrandingArtifacts,
  createDerivedBranding,
  type BrandConfig,
} from "./branding";

const BASE_CONFIG: BrandConfig = {
  appName: "Handfree",
  planNameSuffix: "Pro",
  betaNameSuffix: "Beta",
  repository: "acme/handfree",
  legacyRepository: "acme/old-brand",
  cloudBaseUrl: "https://handfree.app",
  localApiOrigin: "http://localhost:3030",
  localWorkerOrigin: "http://localhost:3100",
  tagline:
    "Your Mac becomes a local memory and automation layer for your real work.",
  bundleShortDescription: "Action-first memory for your desktop",
};

describe("branding helpers", () => {
  test("derives product-facing names from one app name", () => {
    const branding = createDerivedBranding(BASE_CONFIG);

    expect(branding.appName).toBe("Handfree");
    expect(branding.planName).toBe("Handfree Pro");
    expect(branding.dashboardName).toBe("Handfree Dashboard");
    expect(branding.assistantWindowTitle).toBe("Handfree Assistant");
    expect(branding.betaProductName).toBe("Handfree Beta");
    expect(branding.bundleLongDescription).toContain("Handfree");
    expect(branding.productRepositoryUrl).toBe("https://github.com/acme/handfree");
    expect(branding.productStableUpdaterUrl).toBe(
      "https://raw.githubusercontent.com/acme/handfree/updater-manifests/updates/stable/latest.json"
    );
    expect(branding.productBetaUpdaterUrl).toBe(
      "https://raw.githubusercontent.com/acme/handfree/updater-manifests/updates/beta/latest.json"
    );
  });

  test("renders tauri patches and generated modules from the shared brand config", () => {
    const artifacts = createBrandingArtifacts(BASE_CONFIG);

    expect(artifacts.tauri.dev.productName).toBe("Handfree Dev");
    expect(artifacts.tauri.beta.productName).toBe("Handfree Beta");
    expect(artifacts.tauri.dev.bundle?.longDescription).toContain("Handfree");
    expect(artifacts.typescriptModule).toContain('export const PRODUCT_NAME = "Handfree";');
    expect(artifacts.typescriptModule).toContain(
      'export const PRODUCT_PLAN_NAME = "Handfree Pro";'
    );
    expect(artifacts.typescriptModule).toContain(
      'export const PRODUCT_STABLE_UPDATER_URL = "https://raw.githubusercontent.com/acme/handfree/updater-manifests/updates/stable/latest.json";'
    );
    expect(artifacts.rustModule).toContain('pub const PRODUCT_NAME: &str = "Handfree";');
    expect(artifacts.rustModule).toContain(
      'pub const PRODUCT_PLAN_NAME: &str = "Handfree Pro";'
    );
    expect(artifacts.rustModule).toContain(
      'pub const PRODUCT_BETA_UPDATER_URL: &str = "https://raw.githubusercontent.com/acme/handfree/updater-manifests/updates/beta/latest.json";'
    );
  });
});
