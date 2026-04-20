import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import sharp from "sharp";

import {
  APP_ROOT,
  ICON_STUDIO_ROOT,
  ICON_VARIANTS,
  PROOF_DIR,
  PROOF_SIZES,
  RECOMMENDED_VARIANT,
  VARIANT_SOURCE_DIR,
  createAppIconSvg,
  createDesignPhilosophyMarkdown,
  createIconMeta,
  createTrayIconSvg,
} from "./icon-studio";

const SRC_TAURI_DIR = path.join(APP_ROOT, "src-tauri");
const ICONS_DIR = path.join(SRC_TAURI_DIR, "icons");
const BETA_ICONS_DIR = path.join(ICONS_DIR, "beta");
const ASSETS_DIR = path.join(SRC_TAURI_DIR, "assets");
const ASSET_SVG_DIR = path.join(ASSETS_DIR, "svg");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const APP_DIR = path.join(APP_ROOT, "app");

function ensureDir(directory: string) {
  mkdirSync(directory, { recursive: true });
}

function writeTextFile(filePath: string, contents: string) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, contents, "utf8");
}

async function renderSvg(svg: string, options: { width: number; height?: number }) {
  return sharp(Buffer.from(svg))
    .resize({
      width: options.width,
      height: options.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function writePng(svg: string, filePath: string, options: { width: number; height?: number }) {
  const buffer = await renderSvg(svg, options);
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, buffer);
}

async function writeSquareVariants(svg: string, directory: string, sizes: number[]) {
  for (const size of sizes) {
    await writePng(svg, path.join(directory, `${size}x${size}.png`), {
      width: size,
      height: size,
    });
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createLabelSvg(options: {
  width: number;
  height: number;
  title: string;
  body?: string;
}) {
  const { width, height, title, body } = options;
  const bodyMarkup = body
    ? `<text x="0" y="50" font-family="JetBrains Mono, SF Mono, Menlo, monospace" font-size="18" fill="#4a4a47">${escapeXml(body)}</text>`
    : "";

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <text x="0" y="22" font-family="JetBrains Mono, SF Mono, Menlo, monospace" font-size="22" font-weight="700" fill="#111111">${escapeXml(title)}</text>
      ${bodyMarkup}
    </svg>`,
  );
}

async function buildProofSheet() {
  const cardWidth = 520;
  const cardHeight = 740;
  const iconY = 92;
  const iconSize = 244;
  const proofWidth = 1664;
  const proofHeight = 920;
  const canvas = sharp({
    create: {
      width: proofWidth,
      height: proofHeight,
      channels: 4,
      background: { r: 247, g: 247, b: 244, alpha: 1 },
    },
  });

  const composites: sharp.OverlayOptions[] = [];

  ICON_VARIANTS.forEach((variant, index) => {
    const x = 48 + index * 536;
    const y = 48;

    const cardSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
        <rect width="${cardWidth}" height="${cardHeight}" rx="36" fill="#ffffff" />
        <rect x="1.5" y="1.5" width="${cardWidth - 3}" height="${cardHeight - 3}" rx="34.5" fill="none" stroke="#101010" stroke-opacity="0.12" stroke-width="3" />
      </svg>`,
    );

    composites.push({ input: cardSvg, left: x, top: y });
    composites.push({
      input: createLabelSvg({
        width: 420,
        height: 72,
        title: variant.label,
        body: variant.summary,
      }),
      left: x + 32,
      top: y + 28,
    });
  });

  for (const [variantIndex, variant] of ICON_VARIANTS.entries()) {
    const x = 48 + variantIndex * 536;
    const y = 48;
    const masterSvg = createAppIconSvg(variant.id);
    const masterPng = await renderSvg(masterSvg, { width: iconSize, height: iconSize });

    composites.push({ input: masterPng, left: x + 138, top: y + iconY });

    for (const [sizeIndex, size] of PROOF_SIZES.entries()) {
      const boxSize = 64;
      const glyphSize = Math.min(size, boxSize - 14);
      const glyph = await renderSvg(masterSvg, { width: glyphSize, height: glyphSize });
      const boxLeft = x + 28 + sizeIndex * 70;
      const boxTop = y + 392;

      composites.push({
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${boxSize}" height="${boxSize}" viewBox="0 0 ${boxSize} ${boxSize}">
            <rect width="${boxSize}" height="${boxSize}" rx="14" fill="#f2f2ef" />
            <rect x="1" y="1" width="${boxSize - 2}" height="${boxSize - 2}" rx="13" fill="none" stroke="#000000" stroke-opacity="0.08" />
          </svg>`,
        ),
        left: boxLeft,
        top: boxTop,
      });
      composites.push({
        input: glyph,
        left: boxLeft + Math.floor((boxSize - glyphSize) / 2),
        top: boxTop + Math.floor((boxSize - glyphSize) / 2),
      });
      composites.push({
        input: createLabelSvg({
          width: boxSize,
          height: 22,
          title: `${size}`,
        }),
        left: boxLeft,
        top: boxTop + 76,
      });
    }

    const footerNote = variant.id === RECOMMENDED_VARIANT
      ? "recommended final"
      : "concept variant";
    composites.push({
      input: createLabelSvg({
        width: 360,
        height: 48,
        title: footerNote,
      }),
      left: x + 32,
      top: y + 620,
    });
  }

  const output = await canvas.composite(composites).png().toBuffer();
  writeFileSync(path.join(PROOF_DIR, "claw-aperture-proof.png"), output);
}

function runTauriIcon(inputPath: string, outputDir: string) {
  const tauriBinary = path.join(APP_ROOT, "node_modules", ".bin", "tauri");

  if (!existsSync(tauriBinary)) {
    throw new Error(`tauri CLI not found at ${tauriBinary}`);
  }

  execFileSync(tauriBinary, ["icon", inputPath, "-o", outputDir], {
    cwd: APP_ROOT,
    stdio: "inherit",
  });
}

function removeGeneratedNoise() {
  const cleanupTargets = [
    path.join(ICONS_DIR, "64x64.png"),
    path.join(ICONS_DIR, "android", "mipmap-anydpi-v26"),
    path.join(ICONS_DIR, "android", "values"),
    path.join(BETA_ICONS_DIR, "64x64.png"),
    path.join(BETA_ICONS_DIR, "android"),
    path.join(BETA_ICONS_DIR, "ios"),
    path.join(BETA_ICONS_DIR, "icon.png"),
    path.join(BETA_ICONS_DIR, "StoreLogo.png"),
    path.join(BETA_ICONS_DIR, "Square30x30Logo.png"),
    path.join(BETA_ICONS_DIR, "Square44x44Logo.png"),
    path.join(BETA_ICONS_DIR, "Square71x71Logo.png"),
    path.join(BETA_ICONS_DIR, "Square89x89Logo.png"),
    path.join(BETA_ICONS_DIR, "Square107x107Logo.png"),
    path.join(BETA_ICONS_DIR, "Square142x142Logo.png"),
    path.join(BETA_ICONS_DIR, "Square150x150Logo.png"),
    path.join(BETA_ICONS_DIR, "Square284x284Logo.png"),
    path.join(BETA_ICONS_DIR, "Square310x310Logo.png"),
  ];

  for (const cleanupTarget of cleanupTargets) {
    rmSync(cleanupTarget, { recursive: true, force: true });
  }
}

async function generateTrayAssets() {
  const healthyBlackSvg = createTrayIconSvg({ fill: "#050505" });
  const healthyWhiteSvg = createTrayIconSvg({ fill: "#f2f2f2" });
  const failedBlackSvg = createTrayIconSvg({ fill: "#050505", badge: "failed" });
  const failedWhiteSvg = createTrayIconSvg({ fill: "#f2f2f2", badge: "failed" });
  const updatesBlackSvg = createTrayIconSvg({ fill: "#050505", badge: "updates" });
  const updatesWhiteSvg = createTrayIconSvg({ fill: "#f2f2f2", badge: "updates" });

  const svgOutputs = [
    ["screenpipe-logo-tray-black.svg", healthyBlackSvg],
    ["screenpipe-logo-tray-white.svg", healthyWhiteSvg],
    ["screenpipe-logo-tray-black-failed.svg", failedBlackSvg],
    ["screenpipe-logo-tray-white-failed.svg", failedWhiteSvg],
    ["screenpipe-logo-tray-updates-black.svg", updatesBlackSvg],
    ["screenpipe-logo-tray-updates-white.svg", updatesWhiteSvg],
  ] as const;

  for (const [fileName, svg] of svgOutputs) {
    writeTextFile(path.join(ASSET_SVG_DIR, fileName), svg);
  }

  const assetPngOutputs = [
    ["screenpipe-logo-tray-black.png", healthyBlackSvg],
    ["screenpipe-logo-tray-white.png", healthyWhiteSvg],
    ["screenpipe-logo-tray-black-failed.png", failedBlackSvg],
    ["screenpipe-logo-tray-white-failed.png", failedWhiteSvg],
    ["screenpipe-logo-tray-updates-black.png", updatesBlackSvg],
    ["screenpipe-logo-tray-updates-white.png", updatesWhiteSvg],
    ["screenpipe-logo-tray-beta-black.png", healthyBlackSvg],
    ["screenpipe-logo-tray-beta-white.png", healthyWhiteSvg],
  ] as const;

  for (const [fileName, svg] of assetPngOutputs) {
    await writePng(svg, path.join(ASSETS_DIR, fileName), {
      width: 150,
      height: 170,
    });
  }

  const iconPngOutputs = [
    ["screenpipe-logo-tray-black.png", healthyBlackSvg],
    ["screenpipe-logo-tray-failed.png", failedBlackSvg],
    ["screenpipe-logo-tray-beta.png", healthyBlackSvg],
  ] as const;

  for (const [fileName, svg] of iconPngOutputs) {
    await writePng(svg, path.join(ICONS_DIR, fileName), { width: 256, height: 256 });
  }
}

function syncWebAssets() {
  copyFileSync(path.join(ICONS_DIR, "128x128.png"), path.join(PUBLIC_DIR, "128x128.png"));
  copyFileSync(path.join(ICONS_DIR, "icon.ico"), path.join(APP_DIR, "favicon.ico"));
}

async function main() {
  ensureDir(ICON_STUDIO_ROOT);
  ensureDir(VARIANT_SOURCE_DIR);
  ensureDir(PROOF_DIR);
  ensureDir(ASSET_SVG_DIR);

  writeTextFile(
    path.join(ICON_STUDIO_ROOT, "design-philosophy.md"),
    createDesignPhilosophyMarkdown(),
  );
  writeTextFile(
    path.join(ICON_STUDIO_ROOT, "icon-meta.json"),
    JSON.stringify(createIconMeta(), null, 2) + "\n",
  );

  const recommendedSvg = createAppIconSvg(RECOMMENDED_VARIANT);

  for (const variant of ICON_VARIANTS) {
    const svg = createAppIconSvg(variant.id);
    writeTextFile(path.join(VARIANT_SOURCE_DIR, `${variant.id}.svg`), svg);
    await writePng(svg, path.join(PROOF_DIR, `${variant.id}.png`), {
      width: 1024,
      height: 1024,
    });
  }

  await buildProofSheet();
  await generateTrayAssets();

  runTauriIcon(path.join(VARIANT_SOURCE_DIR, `${RECOMMENDED_VARIANT}.svg`), ICONS_DIR);
  rmSync(BETA_ICONS_DIR, { recursive: true, force: true });
  ensureDir(BETA_ICONS_DIR);
  runTauriIcon(path.join(VARIANT_SOURCE_DIR, `${RECOMMENDED_VARIANT}.svg`), BETA_ICONS_DIR);
  await writeSquareVariants(recommendedSvg, ICONS_DIR, [256, 512, 1024]);
  await writeSquareVariants(recommendedSvg, BETA_ICONS_DIR, [256, 512, 1024]);
  removeGeneratedNoise();

  syncWebAssets();

  const recommendedProofPath = path.join(PROOF_DIR, `${RECOMMENDED_VARIANT}.png`);
  const proofSheetPath = path.join(PROOF_DIR, "claw-aperture-proof.png");
  const summary = [
    `Generated icon studio assets in ${ICON_STUDIO_ROOT}`,
    `Recommended master: ${path.join(VARIANT_SOURCE_DIR, `${RECOMMENDED_VARIANT}.svg`)}`,
    `Proof sheet: ${proofSheetPath}`,
    `Preview: ${recommendedProofPath}`,
  ].join("\n");
  writeFileSync(path.join(PROOF_DIR, "README.txt"), summary + "\n", "utf8");
  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
