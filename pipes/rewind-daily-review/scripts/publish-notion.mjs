#!/usr/bin/env node
import {
  buildNotionChildren,
  buildNotionProperties,
  parseArgs,
  readJson,
  requiredArg,
  writeJson,
} from "./lib.mjs";

function headers(apiKey, notionVersion, extra = {}) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": notionVersion,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function notionRequest(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`notion request failed ${response.status}: ${body}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reviewPath = requiredArg(args, "review");
  const manifestPath = requiredArg(args, "manifest");
  const notionApiKey = requiredArg(args, "notion-api-key");
  const notionDatabaseId = requiredArg(args, "notion-database-id");
  const userId = requiredArg(args, "user-id");
  const notionApiBaseUrl = String(args["notion-api-base-url"] ?? "https://api.notion.com/v1").replace(/\/$/, "");
  const notionVersion = String(args["notion-version"] ?? "2022-06-28");

  const review = readJson(reviewPath, null);
  const manifest = readJson(manifestPath, null);
  if (!review) {
    throw new Error(`review not found: ${reviewPath}`);
  }
  if (!manifest) {
    throw new Error(`manifest not found: ${manifestPath}`);
  }

  const basePayload = buildNotionProperties(review, notionDatabaseId);
  const children = buildNotionChildren(review);
  const idempotencyKey = `${userId}:${review.dateKey}`;
  let pageId = manifest?.notion?.pageId ?? null;

  if (!pageId) {
    const created = await notionRequest(`${notionApiBaseUrl}/pages`, {
      method: "POST",
      headers: headers(notionApiKey, notionVersion, {
        "Idempotency-Key": idempotencyKey,
      }),
      body: JSON.stringify({
        ...basePayload,
        children,
      }),
    });
    pageId = created.id;
  } else {
    await notionRequest(`${notionApiBaseUrl}/pages/${pageId}`, {
      method: "PATCH",
      headers: headers(notionApiKey, notionVersion),
      body: JSON.stringify({
        properties: basePayload.properties,
      }),
    });

    const existingChildren = await notionRequest(
      `${notionApiBaseUrl}/blocks/${pageId}/children?page_size=100`,
      {
        method: "GET",
        headers: headers(notionApiKey, notionVersion),
      }
    );

    for (const block of existingChildren?.results ?? []) {
      if (!block?.id) {
        continue;
      }
      await notionRequest(`${notionApiBaseUrl}/blocks/${block.id}`, {
        method: "DELETE",
        headers: headers(notionApiKey, notionVersion),
      });
    }

    await notionRequest(`${notionApiBaseUrl}/blocks/${pageId}/children`, {
      method: "PATCH",
      headers: headers(notionApiKey, notionVersion),
      body: JSON.stringify({
        children,
      }),
    });
  }

  writeJson(manifestPath, {
    ...manifest,
    notion: {
      pageId,
      status: "published",
      publishedAt: new Date().toISOString(),
      idempotencyKey,
    },
  });

  process.stdout.write(`${pageId}\n`);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
