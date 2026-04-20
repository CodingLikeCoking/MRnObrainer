import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");
const ICON_STUDIO_ROOT = path.join(APP_ROOT, "src-tauri", "icon-studio");
const ICON_META_PATH = path.join(ICON_STUDIO_ROOT, "icon-meta.json");
const DESIGN_PHILOSOPHY_PATH = path.join(ICON_STUDIO_ROOT, "design-philosophy.md");
const VARIANT_DIR = path.join(ICON_STUDIO_ROOT, "variants");

describe("icon studio deliverables", () => {
  test("defines the approved claw-aperture variant set and proof sizes", () => {
    expect(existsSync(ICON_META_PATH)).toBe(true);

    const iconMeta = JSON.parse(readFileSync(ICON_META_PATH, "utf8"));

    expect(iconMeta.recommendedVariant).toBe("aperture-core");
    expect(iconMeta.variants).toEqual([
      "aperture-core",
      "sentinel-aperture",
      "viewport-claw",
    ]);
    expect(iconMeta.proofSizes).toEqual([16, 24, 32, 64, 128, 512, 1024]);
  });

  test("stores the design philosophy that explains the new icon system", () => {
    expect(existsSync(DESIGN_PHILOSOPHY_PATH)).toBe(true);

    const designPhilosophy = readFileSync(DESIGN_PHILOSOPHY_PATH, "utf8");

    expect(designPhilosophy).toContain("Claw Aperture");
    expect(designPhilosophy).toContain("OpenClaw");
    expect(designPhilosophy).toContain("monochrome");
  });

  test("checks in all approved source variants as SVG masters", () => {
    const variantPaths = [
      "aperture-core.svg",
      "sentinel-aperture.svg",
      "viewport-claw.svg",
    ].map((fileName) => path.join(VARIANT_DIR, fileName));

    for (const variantPath of variantPaths) {
      expect(existsSync(variantPath)).toBe(true);
      expect(readFileSync(variantPath, "utf8")).toContain("<svg");
    }
  });
});
