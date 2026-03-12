#!/usr/bin/env node
import path from "node:path";
import { writeFile } from "node:fs/promises";
import {
  clampInteger,
  defaultState,
  ensureDir,
  normalizeKeyMoments,
  normalizeStringArray,
  normalizeTopApps,
  optionalArg,
  parseArgs,
  readJson,
  rebuildState,
  renderMarkdown,
  requiredArg,
  writeJson,
} from "./lib.mjs";

function normalizeReview(raw) {
  const dateKey = String(raw?.dateKey ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("daily review requires a valid dateKey");
  }

  const timezone = String(raw?.timezone ?? "UTC").trim() || "UTC";
  const generatedAt = String(raw?.generatedAt ?? new Date().toISOString()).trim();
  const headline = String(raw?.headline ?? "Daily review").trim() || "Daily review";
  const oneLiner = String(raw?.oneLiner ?? headline).trim() || headline;
  const narrativeSummary =
    String(raw?.narrativeSummary ?? "Not enough activity was captured to build a detailed review.").trim() ||
    "Not enough activity was captured to build a detailed review.";
  const highlights = normalizeStringArray(raw?.highlights).slice(0, 10);
  const keyMoments = normalizeKeyMoments(raw?.keyMoments).slice(0, 10);
  const tasks = normalizeStringArray(raw?.tasks).slice(0, 10);
  const meetings = normalizeStringArray(raw?.meetings).slice(0, 10);
  const blockers = normalizeStringArray(raw?.blockers).slice(0, 10);
  const topApps = normalizeTopApps(raw?.topApps).slice(0, 10);
  const sourceApps = normalizeStringArray(raw?.sourceApps);
  const sourceDevices = normalizeStringArray(raw?.sourceDevices);
  const focusMinutesEstimate = clampInteger(raw?.focusMinutesEstimate ?? 0, 0, 24 * 60);
  const sourceStats = {
    allCount: clampInteger(raw?.sourceStats?.allCount ?? 0, 0),
    inputCount: clampInteger(raw?.sourceStats?.inputCount ?? 0, 0),
    appCount: clampInteger(
      raw?.sourceStats?.appCount ?? (topApps.length || sourceApps.length),
      0
    ),
  };
  const rpg = {
    xpEarned: clampInteger(raw?.rpg?.xpEarned ?? 0, 0, 100),
    focusXp: clampInteger(raw?.rpg?.focusXp ?? 0, 0, 100),
    deepWorkXp: clampInteger(raw?.rpg?.deepWorkXp ?? 0, 0, 100),
    learningXp: clampInteger(raw?.rpg?.learningXp ?? 0, 0, 100),
    communicationXp: clampInteger(raw?.rpg?.communicationXp ?? 0, 0, 100),
    statusLabel: String(raw?.rpg?.statusLabel ?? "Steady").trim() || "Steady",
    rationale:
      String(raw?.rpg?.rationale ?? "No explicit RPG rationale was supplied.").trim() ||
      "No explicit RPG rationale was supplied.",
    level: 1,
    streakDays: 0,
  };

  return {
    dateKey,
    timezone,
    generatedAt,
    headline,
    oneLiner,
    narrativeSummary,
    highlights,
    keyMoments,
    tasks,
    meetings,
    blockers,
    topApps,
    focusMinutesEstimate,
    sourceStats,
    sourceApps: sourceApps.length ? sourceApps : topApps.map((item) => item.appName),
    sourceDevices: sourceDevices.length ? sourceDevices : ["screenpipe-local"],
    rpg,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = requiredArg(args, "input");
  const outputDir = requiredArg(args, "output-dir");
  const statePath = optionalArg(args, "state", path.join(outputDir, "state.json"));

  const raw = readJson(inputPath, null);
  if (!raw) {
    throw new Error(`input review not found: ${inputPath}`);
  }

  const normalized = normalizeReview(raw);
  const currentState = readJson(statePath, defaultState());
  const { state, reviewRpg } = rebuildState(currentState, normalized);
  normalized.rpg.level = reviewRpg.level;
  normalized.rpg.streakDays = reviewRpg.streakDays;

  const dayDir = path.join(outputDir, normalized.dateKey);
  ensureDir(dayDir);

  const markdown = renderMarkdown(normalized);
  const normalizedPath = path.join(dayDir, "daily-review.json");
  const markdownPath = path.join(dayDir, "daily-review.md");
  const manifestPath = path.join(dayDir, "manifest.json");
  const existingManifest = readJson(manifestPath, {});

  writeJson(normalizedPath, normalized);
  ensureDir(path.dirname(markdownPath));
  await writeFile(markdownPath, `${markdown}\n`);
  writeJson(statePath, state);
  writeJson(manifestPath, {
    dateKey: normalized.dateKey,
    generatedAt: normalized.generatedAt,
    artifacts: {
      json: `${normalized.dateKey}/daily-review.json`,
      markdown: `${normalized.dateKey}/daily-review.md`,
    },
    notion: existingManifest?.notion ?? null,
  });

  process.stdout.write(`${normalizedPath}\n${markdownPath}\n${manifestPath}\n`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
