import fs from "node:fs";
import path from "node:path";

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

export function requiredArg(args, name) {
  const value = args[name];
  if (value === undefined || value === null || value === "") {
    throw new Error(`missing required argument --${name}`);
  }
  return String(value);
}

export function optionalArg(args, name, fallback = undefined) {
  const value = args[name];
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function clampInteger(value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return minimum;
  }
  return Math.max(minimum, Math.min(maximum, Math.round(numeric)));
}

export function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const item of value) {
    const text = String(item ?? "").trim();
    if (!text) {
      continue;
    }
    const fingerprint = text.toLowerCase();
    if (seen.has(fingerprint)) {
      continue;
    }
    seen.add(fingerprint);
    normalized.push(text);
  }
  return normalized;
}

export function normalizeKeyMoments(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized = [];
  const seen = new Set();
  for (const item of value) {
    const timestamp = String(item?.timestamp ?? "").trim();
    const label = String(item?.label ?? item?.summary ?? "").trim();
    if (!label) {
      continue;
    }
    const key = `${timestamp}|${label.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({
      timestamp: timestamp || null,
      label,
    });
  }
  return normalized;
}

export function normalizeTopApps(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const bucket = new Map();
  for (const item of value) {
    const appName = String(item?.appName ?? item?.app_name ?? "").trim();
    if (!appName) {
      continue;
    }
    const minutes = clampInteger(item?.minutes ?? 0, 0);
    bucket.set(appName, (bucket.get(appName) ?? 0) + minutes);
  }
  return Array.from(bucket.entries())
    .map(([appName, minutes]) => ({ appName, minutes }))
    .sort((left, right) => right.minutes - left.minutes);
}

export function defaultState() {
  return {
    cumulativeXp: 0,
    level: 1,
    streakDays: 0,
    lastFinalizedDate: null,
    reviews: {},
  };
}

export function addDays(dateKey, delta) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function levelFromCumulativeXp(cumulativeXp) {
  return Math.max(1, Math.floor(clampInteger(cumulativeXp, 0) / 100) + 1);
}

export function rebuildState(state, currentReview) {
  const existingReviews = state?.reviews ?? {};
  const trackedXpBefore = Object.values(existingReviews).reduce(
    (sum, entry) => sum + clampInteger(entry?.xpEarned ?? 0, 0),
    0
  );
  const historicalBaseXp = Math.max(
    0,
    clampInteger(state?.cumulativeXp ?? 0, 0) - trackedXpBefore
  );

  const nextState = {
    ...defaultState(),
    ...state,
    reviews: {
      ...existingReviews,
    },
  };

  nextState.reviews[currentReview.dateKey] = {
    ...(nextState.reviews[currentReview.dateKey] ?? {}),
    dateKey: currentReview.dateKey,
    xpEarned: currentReview.rpg.xpEarned,
    focusXp: currentReview.rpg.focusXp,
    deepWorkXp: currentReview.rpg.deepWorkXp,
    learningXp: currentReview.rpg.learningXp,
    communicationXp: currentReview.rpg.communicationXp,
    statusLabel: currentReview.rpg.statusLabel,
    finalizedAt: currentReview.generatedAt,
  };

  const reviewKeys = Object.keys(nextState.reviews).sort();
  let cumulativeXp = historicalBaseXp;
  let previousDateKey = null;
  let previousStreak = 0;

  for (const dateKey of reviewKeys) {
    const entry = nextState.reviews[dateKey];
    cumulativeXp += clampInteger(entry.xpEarned, 0);
    const streakDays = previousDateKey && addDays(previousDateKey, 1) === dateKey ? previousStreak + 1 : 1;
    const level = levelFromCumulativeXp(cumulativeXp);
    nextState.reviews[dateKey] = {
      ...entry,
      level,
      streakDays,
      cumulativeXp,
    };
    previousDateKey = dateKey;
    previousStreak = streakDays;
  }

  const lastFinalizedDate = reviewKeys.at(-1) ?? null;
  const latestEntry = lastFinalizedDate ? nextState.reviews[lastFinalizedDate] : null;

  nextState.cumulativeXp = cumulativeXp;
  nextState.level = latestEntry?.level ?? 1;
  nextState.streakDays = latestEntry?.streakDays ?? 0;
  nextState.lastFinalizedDate = lastFinalizedDate;

  const currentState = nextState.reviews[currentReview.dateKey] ?? {
    level: 1,
    streakDays: 0,
  };

  return {
    state: nextState,
    reviewRpg: {
      level: currentState.level,
      streakDays: currentState.streakDays,
    },
  };
}

export function renderMarkdown(review) {
  const keyMoments = review.keyMoments.length
    ? review.keyMoments
        .map((item) => `- ${item.timestamp ?? "Unknown time"} — ${item.label}`)
        .join("\n")
    : "- No key moments captured";
  const tasks = review.tasks.length
    ? review.tasks.map((item) => `- [ ] ${item}`).join("\n")
    : "- [ ] No clear next actions extracted";
  const meetings = review.meetings.length
    ? review.meetings.map((item) => `- ${item}`).join("\n")
    : "- No meetings detected";
  const blockers = review.blockers.length
    ? review.blockers.map((item) => `- ${item}`).join("\n")
    : "- No blockers captured";
  const highlights = review.highlights.length
    ? review.highlights.map((item) => `- ${item}`).join("\n")
    : "- No highlights captured";
  const topApps = review.topApps.length
    ? review.topApps.map((item) => `- ${item.appName} — ${item.minutes} min`).join("\n")
    : "- No app usage summary available";

  return `# ${review.dateKey} Daily Review\n\n> ${review.oneLiner}\n\n## Summary\n${review.narrativeSummary}\n\n## Highlights\n${highlights}\n\n## Key Moments\n${keyMoments}\n\n## Tasks\n${tasks}\n\n## Meetings\n${meetings}\n\n## Blockers\n${blockers}\n\n## Momentum\n- Status: ${review.rpg.statusLabel}\n- XP Earned: ${review.rpg.xpEarned}\n- Level: ${review.rpg.level}\n- Streak: ${review.rpg.streakDays}\n- Focus XP: ${review.rpg.focusXp}\n- Deep Work XP: ${review.rpg.deepWorkXp}\n- Learning XP: ${review.rpg.learningXp}\n- Communication XP: ${review.rpg.communicationXp}\n- Rationale: ${review.rpg.rationale}\n\n## Top Apps\n${topApps}\n\n## Source Stats\n- All records: ${review.sourceStats.allCount}\n- Input records: ${review.sourceStats.inputCount}\n- Distinct apps: ${review.sourceStats.appCount}\n- Focus minutes estimate: ${review.focusMinutesEstimate}\n- Source devices: ${review.sourceDevices.join(", ") || "None"}\n`;
}

export function buildNotionProperties(review, notionDatabaseId) {
  return {
    parent: {
      database_id: notionDatabaseId,
    },
    properties: {
      "Digest Key": {
        title: [{ text: { content: review.dateKey } }],
      },
      Date: {
        date: { start: `${review.dateKey}T00:00:00` },
      },
      Summary: {
        rich_text: [{ text: { content: review.oneLiner || review.highlights[0] || review.headline } }],
      },
      "Focus Minutes": {
        number: review.focusMinutesEstimate,
      },
      "Top Apps": {
        rich_text: [{ text: { content: review.topApps.map((item) => item.appName).join(", ") } }],
      },
      "XP Earned": {
        number: review.rpg.xpEarned,
      },
      Level: {
        number: review.rpg.level,
      },
      Streak: {
        number: review.rpg.streakDays,
      },
      Status: {
        rich_text: [{ text: { content: review.rpg.statusLabel } }],
      },
      "Source Devices": {
        rich_text: [{ text: { content: review.sourceDevices.join(", ") } }],
      },
    },
  };
}

export function buildNotionChildren(review) {
  const bulletItems = review.highlights.map((item) => ({
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ text: { content: item } }],
    },
  }));

  return [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ text: { content: `${review.dateKey} Daily Summary` } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ text: { content: review.narrativeSummary } }],
      },
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ text: { content: "Momentum" } }],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            text: {
              content: `XP ${review.rpg.xpEarned} | Level ${review.rpg.level} | Streak ${review.rpg.streakDays} | ${review.rpg.statusLabel}`,
            },
          },
        ],
      },
    },
    ...bulletItems,
  ];
}
