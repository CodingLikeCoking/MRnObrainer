import path from "node:path";
import { fileURLToPath } from "node:url";

export const ICON_VARIANTS = [
  {
    id: "aperture-core",
    label: "Aperture Core",
    summary: "Balanced claws carve a clean aperture.",
  },
  {
    id: "sentinel-aperture",
    label: "Sentinel Aperture",
    summary: "Adds a narrow pupil cue.",
  },
  {
    id: "viewport-claw",
    label: "Viewport Claw",
    summary: "Adds frame brackets for capture.",
  },
] as const;

export type VariantId = (typeof ICON_VARIANTS)[number]["id"];

export const RECOMMENDED_VARIANT: VariantId = "aperture-core";
export const PROOF_SIZES = [16, 24, 32, 64, 128, 512, 1024] as const;

const APP_ICON_SIZE = 1024;
const TILE_FRAME = { x: 76, y: 76, size: 872, radius: 224 };
const SYMBOL = {
  leftOuter: { cx: 344, cy: 512, r: 246 },
  rightOuter: { cx: 680, cy: 512, r: 246 },
  leftInner: { cx: 450, cy: 512, r: 164 },
  rightInner: { cx: 574, cy: 512, r: 164 },
  splitGap: { x: 310, y: 482, width: 404, height: 60, radius: 30 },
  topCut: "M438 446L512 378L586 446Z",
  bottomCut: "M438 578L512 646L586 578Z",
  leftStem: { x: 120, y: 294, width: 124, height: 436 },
  rightStem: { x: 780, y: 294, width: 124, height: 436 },
};

export const APP_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const ICON_STUDIO_ROOT = path.join(APP_ROOT, "src-tauri", "icon-studio");
export const VARIANT_SOURCE_DIR = path.join(ICON_STUDIO_ROOT, "variants");
export const PROOF_DIR = path.join(ICON_STUDIO_ROOT, "proofs");

function createVariantCircleMask(id: string) {
  return [
    `<mask id="${id}-left-mask">`,
    `<rect width="${APP_ICON_SIZE}" height="${APP_ICON_SIZE}" fill="white" />`,
    `<circle cx="${SYMBOL.leftInner.cx}" cy="${SYMBOL.leftInner.cy}" r="${SYMBOL.leftInner.r}" fill="black" />`,
    `<rect x="${SYMBOL.splitGap.x}" y="${SYMBOL.splitGap.y}" width="${SYMBOL.splitGap.width}" height="${SYMBOL.splitGap.height}" rx="${SYMBOL.splitGap.radius}" fill="black" />`,
    `<path d="${SYMBOL.topCut}" fill="black" />`,
    `<path d="${SYMBOL.bottomCut}" fill="black" />`,
    `</mask>`,
    `<mask id="${id}-right-mask">`,
    `<rect width="${APP_ICON_SIZE}" height="${APP_ICON_SIZE}" fill="white" />`,
    `<circle cx="${SYMBOL.rightInner.cx}" cy="${SYMBOL.rightInner.cy}" r="${SYMBOL.rightInner.r}" fill="black" />`,
    `<rect x="${APP_ICON_SIZE - SYMBOL.splitGap.x - SYMBOL.splitGap.width}" y="${SYMBOL.splitGap.y}" width="${SYMBOL.splitGap.width}" height="${SYMBOL.splitGap.height}" rx="${SYMBOL.splitGap.radius}" fill="black" />`,
    `<path d="${SYMBOL.topCut}" fill="black" />`,
    `<path d="${SYMBOL.bottomCut}" fill="black" />`,
    `</mask>`,
  ].join("");
}

function createSentinelMarkup(fill: string) {
  return [
    `<rect x="486" y="406" width="52" height="212" rx="26" fill="${fill}" />`,
    `<rect x="502" y="356" width="20" height="42" rx="10" fill="${fill}" opacity="0.88" />`,
  ].join("");
}

function createViewportMarkup(fill: string) {
  const stroke = [
    `<path d="M422 372h92v28h-64v64h-28z" fill="${fill}" />`,
    `<path d="M610 372h-92v28h64v64h28z" fill="${fill}" />`,
    `<path d="M422 652h92v-28h-64v-64h-28z" fill="${fill}" />`,
    `<path d="M610 652h-92v-28h64v-64h28z" fill="${fill}" />`,
  ];

  return stroke.join("");
}

function createCoreMarkup(variantId: VariantId, fill: string) {
  const maskId = `mask-${variantId}`;
  const base = [
    createVariantCircleMask(maskId),
    `<circle cx="${SYMBOL.leftOuter.cx}" cy="${SYMBOL.leftOuter.cy}" r="${SYMBOL.leftOuter.r}" fill="${fill}" mask="url(#${maskId}-left-mask)" />`,
    `<circle cx="${SYMBOL.rightOuter.cx}" cy="${SYMBOL.rightOuter.cy}" r="${SYMBOL.rightOuter.r}" fill="${fill}" mask="url(#${maskId}-right-mask)" />`,
    `<rect x="${SYMBOL.leftStem.x}" y="${SYMBOL.leftStem.y}" width="${SYMBOL.leftStem.width}" height="${SYMBOL.leftStem.height}" fill="${fill}" />`,
    `<rect x="${SYMBOL.rightStem.x}" y="${SYMBOL.rightStem.y}" width="${SYMBOL.rightStem.width}" height="${SYMBOL.rightStem.height}" fill="${fill}" />`,
  ];

  if (variantId === "sentinel-aperture") {
    base.push(createSentinelMarkup(fill));
  }

  if (variantId === "viewport-claw") {
    base.push(createViewportMarkup(fill));
  }

  return base.join("");
}

function createAppTile() {
  return [
    `<defs>`,
    `<linearGradient id="tile-gradient" x1="0%" y1="0%" x2="100%" y2="100%">`,
    `<stop offset="0%" stop-color="#f7f7f4" />`,
    `<stop offset="45%" stop-color="#ecece8" />`,
    `<stop offset="100%" stop-color="#d6d6d3" />`,
    `</linearGradient>`,
    `<linearGradient id="rim-gradient" x1="50%" y1="0%" x2="50%" y2="100%">`,
    `<stop offset="0%" stop-color="#ffffff" stop-opacity="0.72" />`,
    `<stop offset="100%" stop-color="#000000" stop-opacity="0.10" />`,
    `</linearGradient>`,
    `</defs>`,
    `<rect x="${TILE_FRAME.x + 12}" y="${TILE_FRAME.y + 18}" width="${TILE_FRAME.size - 24}" height="${TILE_FRAME.size - 8}" rx="${TILE_FRAME.radius - 8}" fill="#000000" opacity="0.16" />`,
    `<rect x="${TILE_FRAME.x}" y="${TILE_FRAME.y}" width="${TILE_FRAME.size}" height="${TILE_FRAME.size}" rx="${TILE_FRAME.radius}" fill="url(#tile-gradient)" />`,
    `<rect x="${TILE_FRAME.x}" y="${TILE_FRAME.y}" width="${TILE_FRAME.size}" height="${TILE_FRAME.size}" rx="${TILE_FRAME.radius}" fill="none" stroke="#0c0c0c" stroke-opacity="0.16" stroke-width="4" />`,
    `<rect x="${TILE_FRAME.x + 8}" y="${TILE_FRAME.y + 8}" width="${TILE_FRAME.size - 16}" height="${TILE_FRAME.size - 16}" rx="${TILE_FRAME.radius - 12}" fill="none" stroke="url(#rim-gradient)" stroke-width="8" opacity="0.65" />`,
  ].join("");
}

export function createAppIconSvg(variantId: VariantId) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${APP_ICON_SIZE}" height="${APP_ICON_SIZE}" viewBox="0 0 ${APP_ICON_SIZE} ${APP_ICON_SIZE}" fill="none">`,
    createAppTile(),
    `<g>`,
    createCoreMarkup(variantId, "#050505"),
    `</g>`,
    `</svg>`,
  ].join("");
}

type TrayBadge = "none" | "failed" | "updates";

function createBadgeMarkup(fill: string, badge: TrayBadge) {
  if (badge === "failed") {
    return [
      `<g transform="translate(796 720)">`,
      `<rect x="0" y="0" width="36" height="150" rx="18" fill="${fill}" />`,
      `<circle cx="18" cy="196" r="20" fill="${fill}" />`,
      `</g>`,
    ].join("");
  }

  if (badge === "updates") {
    return [
      `<g transform="translate(512 798)" fill="${fill}">`,
      `<rect x="-18" y="-98" width="36" height="120" rx="18" />`,
      `<path d="M-76 -10h152L0 96z" />`,
      `</g>`,
    ].join("");
  }

  return "";
}

export function createTrayIconSvg(options: {
  fill: string;
  badge?: TrayBadge;
  variantId?: VariantId;
}) {
  const { fill, badge = "none", variantId = RECOMMENDED_VARIANT } = options;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${APP_ICON_SIZE}" height="${APP_ICON_SIZE}" viewBox="0 0 ${APP_ICON_SIZE} ${APP_ICON_SIZE}" fill="none">`,
    `<g transform="translate(0 -16)">`,
    createCoreMarkup(variantId, fill),
    `</g>`,
    createBadgeMarkup(fill, badge),
    `</svg>`,
  ].join("");
}

export function createDesignPhilosophyMarkdown() {
  return `# Claw Aperture

Claw Aperture treats the icon as a precision instrument rather than a mascot. The mark should feel like an abstract machine part that has been meticulously refined until it implies both capture and dispatch with almost no ornament. Every curve and gap must look intentional, measured, and labored over with painstaking care so the final symbol feels premium at a glance.

The visual language stays loyal to MRnObrainer's monochrome system: black structure, pale mineral tile, restrained contrast, and no decorative color. The icon should look at home beside the current interface because it shares the same material honesty and severe geometry, yet it must clearly move beyond the older Screenpipe conduit mark. The new symbol is not a pipe. It is a poised mechanism.

OpenClaw enters as a subtle conceptual reference, not a literal lobster. Two opposing claw forms create a central aperture, suggesting that the product can see, route, and act across multiple devices without resorting to cartoon illustration. The symbol should communicate deployment readiness and awareness through negative space alone, with master-level execution in the spacing where the eye forms between the claws.

Craftsmanship matters more than novelty. The icon must read with the same confidence at 16 pixels and 1024 pixels, which means silhouettes come first and clever detail comes second. Any secondary cue, such as a sentinel pupil or viewport brackets, should be subordinate to the primary shape and should appear only where the composition can support it cleanly.

The finished family should feel like it was produced by someone at the top of their field: controlled, sparse, unmistakably deliberate. The tile, the symbol, and the tray treatments should all look like parts of one carefully engineered identity system for MRnObrainer and its OpenClaw deployment layer.`;
}

export function createIconMeta() {
  return {
    recommendedVariant: RECOMMENDED_VARIANT,
    variants: ICON_VARIANTS.map((variant) => variant.id),
    proofSizes: [...PROOF_SIZES],
  };
}
