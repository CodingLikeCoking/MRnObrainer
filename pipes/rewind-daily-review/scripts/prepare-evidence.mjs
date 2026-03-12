#!/usr/bin/env node
import { ensureDir, optionalArg, parseArgs, requiredArg, writeJson } from "./lib.mjs";
import path from "node:path";

async function querySearch(baseUrl, contentType, startTime, endTime) {
  const url = new URL("/search", baseUrl);
  url.searchParams.set("content_type", contentType);
  url.searchParams.set("limit", contentType === "input" ? "200" : "400");
  url.searchParams.set("start_time", startTime);
  url.searchParams.set("end_time", endTime);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`screenpipe search failed for ${contentType}: ${response.status}`);
  }

  const json = await response.json();
  return {
    contentType,
    query: {
      startTime,
      endTime,
      limit: Number(url.searchParams.get("limit")),
    },
    items: Array.isArray(json?.data) ? json.data : [],
  };
}

function normalizeTextSnippet(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function getTimestamp(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isNaN(parsed) ? null : parsed;
}

function buildCrossDeviceEventId(item) {
  const content = item?.content ?? {};
  const type = String(item?.type ?? "unknown").toLowerCase();
  const timestamp = String(content.timestamp ?? "").trim();
  const eventType = String(content.event_type ?? type).trim() || type;
  const machineId = String(content.machine_id ?? "screenpipe-local").trim() || "screenpipe-local";
  const appName = String(content.app_name ?? "Unknown").trim() || "Unknown";
  const text = normalizeTextSnippet(content.text);
  return `${type}:${timestamp}:${eventType}:${machineId}:${appName}:${text}`;
}

function deriveCrossDeviceData(searches) {
  const dedupedTimeline = [];
  const seenIds = new Set();

  for (const search of searches) {
    for (const item of Array.isArray(search?.items) ? search.items : []) {
      const content = item?.content ?? {};
      const timestamp = String(content.timestamp ?? "").trim();
      if (!timestamp) {
        continue;
      }

      const machineId = String(content.machine_id ?? "screenpipe-local").trim() || "screenpipe-local";
      const deviceName = String(content.device_name ?? machineId).trim() || machineId;
      const eventType = String(content.event_type ?? item?.type ?? "unknown").trim() || "unknown";
      const row = {
        id: buildCrossDeviceEventId(item),
        timestamp,
        machineId,
        deviceName,
        sourcePlatform: String(content.source_platform ?? "unknown").trim() || "unknown",
        appName: String(content.app_name ?? "Unknown").trim() || "Unknown",
        windowName: String(content.window_name ?? "").trim(),
        browserUrl: String(content.browser_url ?? "").trim(),
        eventType,
        text: normalizeTextSnippet(content.text),
      };

      if (seenIds.has(row.id)) {
        continue;
      }
      seenIds.add(row.id);
      dedupedTimeline.push(row);
    }
  }

  dedupedTimeline.sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  const sourceDevices = Array.from(
    new Set(
      dedupedTimeline
        .map((item) => item.deviceName)
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));

  const handoffs = [];
  const seenHandoffs = new Set();
  for (let index = 1; index < dedupedTimeline.length; index += 1) {
    const previous = dedupedTimeline[index - 1];
    const current = dedupedTimeline[index];
    if (previous.machineId === current.machineId) {
      continue;
    }

    const previousTimestamp = getTimestamp(previous.timestamp);
    const currentTimestamp = getTimestamp(current.timestamp);
    if (previousTimestamp === null || currentTimestamp === null) {
      continue;
    }

    const deltaMs = currentTimestamp - previousTimestamp;
    if (deltaMs < 0 || deltaMs > 15 * 60 * 1000) {
      continue;
    }

    if (previous.appName !== current.appName) {
      continue;
    }

    const handoffKey = `${previous.id}->${current.id}`;
    if (seenHandoffs.has(handoffKey)) {
      continue;
    }
    seenHandoffs.add(handoffKey);

    handoffs.push({
      timestamp: current.timestamp,
      appName: current.appName,
      fromDevice: previous.deviceName,
      toDevice: current.deviceName,
      sourceEventIds: [previous.id, current.id],
    });
  }

  return {
    sourceDevices,
    crossDeviceTimeline: dedupedTimeline.filter((item) => item.machineId !== "screenpipe-local"),
    crossDeviceHandoffs: handoffs,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const screenpipeUrl = requiredArg(args, "screenpipe-url");
  const dateKey = requiredArg(args, "date-key");
  const timezone = requiredArg(args, "timezone");
  const startTime = requiredArg(args, "start-time");
  const endTime = requiredArg(args, "end-time");
  const outputPath = requiredArg(args, "output");
  const generatedAt = optionalArg(args, "generated-at", new Date().toISOString());

  ensureDir(path.dirname(outputPath));

  const searches = await Promise.all([
    querySearch(screenpipeUrl, "all", startTime, endTime),
    querySearch(screenpipeUrl, "input", startTime, endTime),
  ]);
  const crossDeviceData = deriveCrossDeviceData(searches);

  const sourceApps = Array.from(
    new Set(
      searches
        .flatMap((entry) => entry.items)
        .map((item) => item?.content?.app_name)
        .filter(Boolean)
    )
  ).sort();

  const payload = {
    dateKey,
    timezone,
    generatedAt,
    screenpipeUrl,
    startTime,
    endTime,
    searches,
    sourceStats: {
      allCount: searches.find((entry) => entry.contentType === "all")?.items.length ?? 0,
      inputCount: searches.find((entry) => entry.contentType === "input")?.items.length ?? 0,
      appCount: sourceApps.length,
    },
    sourceApps,
    sourceDevices: crossDeviceData.sourceDevices,
    crossDeviceTimeline: crossDeviceData.crossDeviceTimeline,
    crossDeviceHandoffs: crossDeviceData.crossDeviceHandoffs,
  };

  writeJson(outputPath, payload);
  process.stdout.write(`${outputPath}\n`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
