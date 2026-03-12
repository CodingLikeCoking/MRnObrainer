import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import http from "node:http";

const pipeDir = path.resolve(import.meta.dirname, "..");
const scriptsDir = path.join(pipeDir, "scripts");
const examplesDir = path.join(pipeDir, "examples");

function runNode(scriptPath, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeoutMs = options.timeout ?? 5000;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGTERM");
      resolve({
        status: null,
        signal: "SIGTERM",
        stdout,
        stderr,
        error: new Error(`timed out after ${timeoutMs}ms`),
      });
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status, signal) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        status,
        signal,
        stdout,
        stderr,
        error: null,
      });
    });
  });
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function createMockSearchServer(handler) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      requests.push({
        method: req.method,
        pathname: url.pathname,
        searchParams: Object.fromEntries(url.searchParams.entries()),
      });
      await handler(req, res, url);
    } catch (error) {
      res.writeHead(500, { "content-type": "application/json", connection: "close" });
      res.end(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.closeAllConnections?.();
            server.close((error) => {
              if (error) {
                closeReject(error);
                return;
              }
              closeResolve();
            });
          }),
        requests,
      });
    });
  });
}

test("rewind pipe bundle ships the required top-level assets", () => {
  const requiredPaths = [
    path.join(pipeDir, "pipe.md"),
    path.join(pipeDir, ".env.example"),
    path.join(pipeDir, "README.md"),
    path.join(examplesDir, "daily-review.json"),
    path.join(examplesDir, "daily-review.md"),
  ];

  for (const requiredPath of requiredPaths) {
    assert.equal(
      fs.existsSync(requiredPath),
      true,
      `expected bundle asset to exist: ${path.relative(pipeDir, requiredPath)}`
    );
  }
});

test("prepare-evidence collects content_type=all and content_type=input search results", async () => {
  const tmpDir = makeTempDir("rewind-pipe-evidence-");
  const server = await createMockSearchServer((req, res, url) => {
    assert.equal(req.method, "GET");
    assert.equal(url.pathname, "/search");
    const contentType = url.searchParams.get("content_type");
    assert.ok(contentType === "all" || contentType === "input");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        data:
          contentType === "all"
            ? [
                {
                  type: "OCR",
                  content: {
                    app_name: "Cursor",
                    window_name: "rewind-plan.md",
                    text: "Wrote the Rewind daily review pipe plan",
                    timestamp: "2026-03-06T09:00:00.000Z",
                    browser_url: null,
                  },
                },
              ]
            : [
                {
                  type: "Input",
                  content: {
                    app_name: "Cursor",
                    text: "Drafted the output schema",
                    timestamp: "2026-03-06T09:05:00.000Z",
                    event_type: "text",
                  },
                },
              ],
      })
    );
  });

  try {
    const outputPath = path.join(tmpDir, "evidence.json");
    const result = await runNode(path.join(scriptsDir, "prepare-evidence.mjs"), [
      "--screenpipe-url",
      server.baseUrl,
      "--date-key",
      "2026-03-06",
      "--timezone",
      "Asia/Hong_Kong",
      "--start-time",
      "2026-03-05T16:00:00.000Z",
      "--end-time",
      "2026-03-06T15:59:59.000Z",
      "--output",
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const evidence = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(evidence.dateKey, "2026-03-06");
    assert.equal(evidence.timezone, "Asia/Hong_Kong");
    assert.equal(evidence.searches.length, 2);
    assert.deepEqual(
      evidence.searches.map((entry) => entry.contentType).sort(),
      ["all", "input"]
    );
    assert.equal(evidence.searches[0].items.length > 0, true);
    assert.equal(evidence.searches[1].items.length > 0, true);
    assert.deepEqual(
      server.requests.map((request) => request.searchParams.content_type).sort(),
      ["all", "input"]
    );
  } finally {
    await server.close();
  }
});

test("prepare-evidence derives source devices and deduped cross-device handoffs", async () => {
  const tmpDir = makeTempDir("rewind-pipe-cross-device-");
  const server = await createMockSearchServer((req, res, url) => {
    assert.equal(req.method, "GET");
    assert.equal(url.pathname, "/search");
    const contentType = url.searchParams.get("content_type");
    assert.ok(contentType === "all" || contentType === "input");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        data:
          contentType === "all"
            ? [
                {
                  type: "Input",
                  content: {
                    app_name: "Gmail",
                    text: "Read customer email on the phone",
                    timestamp: "2026-03-06T09:00:00.000Z",
                    event_type: "notification_received",
                    machine_id: "xiaomi15-ultra",
                    device_name: "Xiaomi 15 Ultra",
                    source_platform: "android",
                  },
                },
                {
                  type: "Input",
                  content: {
                    app_name: "Gmail",
                    text: "Drafted the reply on the laptop",
                    timestamp: "2026-03-06T09:07:00.000Z",
                    event_type: "text_shared",
                    machine_id: "oracle-mba",
                    device_name: "MacBook Air",
                    source_platform: "macos",
                  },
                },
              ]
            : [
                {
                  type: "Input",
                  content: {
                    app_name: "Gmail",
                    text: "Read customer email on the phone",
                    timestamp: "2026-03-06T09:00:00.000Z",
                    event_type: "notification_received",
                    machine_id: "xiaomi15-ultra",
                    device_name: "Xiaomi 15 Ultra",
                    source_platform: "android",
                  },
                },
                {
                  type: "Input",
                  content: {
                    app_name: "Gmail",
                    text: "Drafted the reply on the laptop",
                    timestamp: "2026-03-06T09:07:00.000Z",
                    event_type: "text_shared",
                    machine_id: "oracle-mba",
                    device_name: "MacBook Air",
                    source_platform: "macos",
                  },
                },
              ],
      })
    );
  });

  try {
    const outputPath = path.join(tmpDir, "evidence.json");
    const result = await runNode(path.join(scriptsDir, "prepare-evidence.mjs"), [
      "--screenpipe-url",
      server.baseUrl,
      "--date-key",
      "2026-03-06",
      "--timezone",
      "Asia/Hong_Kong",
      "--start-time",
      "2026-03-05T16:00:00.000Z",
      "--end-time",
      "2026-03-06T15:59:59.000Z",
      "--output",
      outputPath,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);

    const evidence = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.deepEqual(evidence.sourceDevices, ["MacBook Air", "Xiaomi 15 Ultra"]);
    assert.equal(evidence.crossDeviceTimeline.length, 2);
    assert.equal(
      new Set(evidence.crossDeviceTimeline.map((item) => item.id)).size,
      evidence.crossDeviceTimeline.length
    );
    assert.deepEqual(
      evidence.crossDeviceTimeline.map((item) => item.machineId),
      ["xiaomi15-ultra", "oracle-mba"]
    );
    assert.deepEqual(evidence.crossDeviceHandoffs, [
      {
        timestamp: "2026-03-06T09:07:00.000Z",
        appName: "Gmail",
        fromDevice: "Xiaomi 15 Ultra",
        toDevice: "MacBook Air",
        sourceEventIds: [
          "input:2026-03-06T09:00:00.000Z:notification_received:xiaomi15-ultra:Gmail:Read customer email on the phone",
          "input:2026-03-06T09:07:00.000Z:text_shared:oracle-mba:Gmail:Drafted the reply on the laptop",
        ],
      },
    ]);
  } finally {
    await server.close();
  }
});

test("finalize-review normalizes review JSON, writes markdown, and advances local state", async () => {
  const tmpDir = makeTempDir("rewind-pipe-finalize-");
  const outputDir = path.join(tmpDir, "output");
  const inputPath = path.join(tmpDir, "daily-review.raw.json");
  const result = {
    dateKey: "2026-03-06",
    timezone: "Asia/Hong_Kong",
    generatedAt: "2026-03-06T12:00:00.000Z",
    headline: "Closed the loop on the Screenpipe pivot",
    oneLiner: "Turned the migration plan into an executable pipe bundle.",
    narrativeSummary:
      "Most of the day went into turning the Rewind-on-Screenpipe plan into something executable, with attention on keeping the implementation local-first and deterministic.",
    highlights: [
      "Mapped the Rewind digest contract onto Screenpipe pipes",
      "Defined a deterministic local state model for level and streak",
    ],
    keyMoments: [
      {
        timestamp: "2026-03-06T09:00:00.000Z",
        label: "Settled on a pipe-first implementation path",
      },
    ],
    tasks: ["Implement prepare-evidence helper", "Publish the daily review to Notion"],
    meetings: ["Reviewed the Screenpipe migration direction"],
    blockers: ["Need stable artifact validation before wiring Notion"],
    topApps: [
      { appName: "Cursor", minutes: 180 },
      { appName: "Arc", minutes: 45 },
    ],
    focusMinutesEstimate: 155,
    sourceStats: {
      allCount: 24,
      inputCount: 8,
      appCount: 2,
    },
    sourceApps: ["Cursor", "Arc"],
    rpg: {
      xpEarned: 88,
      focusXp: 28,
      deepWorkXp: 24,
      learningXp: 18,
      communicationXp: 18,
      statusLabel: "Momentum held",
      rationale:
        "Strong planning and implementation with a long focus block and some coordination.",
    },
    sourceDevices: ["screenpipe-local"],
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "state.json"),
    JSON.stringify(
      {
        cumulativeXp: 120,
        level: 2,
        streakDays: 1,
        lastFinalizedDate: "2026-03-05",
        reviews: {
          "2026-03-05": {
            xpEarned: 60,
            level: 2,
            streakDays: 1,
          },
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(inputPath, JSON.stringify(result, null, 2));

  const command = await runNode(path.join(scriptsDir, "finalize-review.mjs"), [
    "--input",
    inputPath,
    "--output-dir",
    outputDir,
  ]);

  assert.equal(command.status, 0, command.stderr || command.stdout);

  const normalized = JSON.parse(
    fs.readFileSync(path.join(outputDir, "2026-03-06", "daily-review.json"), "utf8")
  );
  const markdown = fs.readFileSync(
    path.join(outputDir, "2026-03-06", "daily-review.md"),
    "utf8"
  );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(outputDir, "2026-03-06", "manifest.json"), "utf8")
  );
  const state = JSON.parse(fs.readFileSync(path.join(outputDir, "state.json"), "utf8"));

  assert.equal(normalized.rpg.level, 3);
  assert.equal(normalized.rpg.streakDays, 2);
  assert.match(markdown, /## Momentum/);
  assert.match(markdown, /Momentum held/);
  assert.equal(manifest.dateKey, "2026-03-06");
  assert.equal(manifest.artifacts.json, "2026-03-06/daily-review.json");
  assert.equal(state.cumulativeXp, 208);
  assert.equal(state.level, 3);
  assert.equal(state.streakDays, 2);
});

test("publish-notion creates a page on first run and stores the page id in the manifest", async () => {
  const tmpDir = makeTempDir("rewind-pipe-notion-create-");
  const outputDir = path.join(tmpDir, "output");
  const dayDir = path.join(outputDir, "2026-03-06");
  fs.mkdirSync(dayDir, { recursive: true });

  const review = {
    dateKey: "2026-03-06",
    timezone: "Asia/Hong_Kong",
    headline: "Closed the loop on the Screenpipe pivot",
    oneLiner: "Turned the migration plan into an executable pipe bundle.",
    narrativeSummary:
      "Most of the day went into turning the Rewind-on-Screenpipe plan into something executable.",
    highlights: ["Defined the stable JSON artifact", "Locked the first Notion schema"],
    topApps: [{ appName: "Cursor", minutes: 180 }],
    focusMinutesEstimate: 155,
    sourceDevices: ["screenpipe-local"],
    rpg: {
      xpEarned: 88,
      level: 3,
      streakDays: 2,
      focusXp: 28,
      deepWorkXp: 24,
      learningXp: 18,
      communicationXp: 18,
      statusLabel: "Momentum held",
      rationale: "Consistent build progress.",
    },
  };
  const manifestPath = path.join(dayDir, "manifest.json");
  const reviewPath = path.join(dayDir, "daily-review.json");
  fs.writeFileSync(reviewPath, JSON.stringify(review, null, 2));
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        dateKey: "2026-03-06",
        artifacts: {
          json: "2026-03-06/daily-review.json",
          markdown: "2026-03-06/daily-review.md",
        },
        notion: null,
      },
      null,
      2
    )
  );

  const requests = [];
  const server = await createMockSearchServer((req, res, url) => {
    requests.push({
      method: req.method,
      pathname: url.pathname,
      body: [],
    });
    req.on("data", (chunk) => requests[requests.length - 1].body.push(chunk));
    req.on("end", () => {
      if (req.method === "POST" && url.pathname === "/v1/pages") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: "notion-page-123" }));
        return;
      }
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
    });
  });

  try {
    const command = await runNode(path.join(scriptsDir, "publish-notion.mjs"), [
      "--review",
      reviewPath,
      "--manifest",
      manifestPath,
      "--notion-api-base-url",
      `${server.baseUrl}/v1`,
      "--notion-api-key",
      "secret_test",
      "--notion-database-id",
      "database-123",
      "--user-id",
      "local-user",
    ]);

    assert.equal(command.status, 0, command.stderr || command.stdout);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.notion.pageId, "notion-page-123");
    assert.equal(manifest.notion.status, "published");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].pathname, "/v1/pages");
    const payload = JSON.parse(Buffer.concat(requests[0].body).toString("utf8"));
    assert.equal(payload.parent.database_id, "database-123");
    assert.equal(payload.properties["Digest Key"].title[0].text.content, "2026-03-06");
    assert.equal(payload.properties["XP Earned"].number, 88);
    assert.equal(payload.properties["Level"].number, 3);
    assert.equal(payload.properties["Streak"].number, 2);
  } finally {
    await server.close();
  }
});

test("publish-notion updates the existing page when the manifest already has a page id", async () => {
  const tmpDir = makeTempDir("rewind-pipe-notion-update-");
  const outputDir = path.join(tmpDir, "output");
  const dayDir = path.join(outputDir, "2026-03-07");
  fs.mkdirSync(dayDir, { recursive: true });

  const reviewPath = path.join(dayDir, "daily-review.json");
  const manifestPath = path.join(dayDir, "manifest.json");

  fs.writeFileSync(
    reviewPath,
    JSON.stringify(
      {
        dateKey: "2026-03-07",
        timezone: "Asia/Hong_Kong",
        headline: "Shipped the first runnable bundle",
        oneLiner: "Moved from plan to pipe.",
        narrativeSummary: "The day focused on stabilizing the first end-to-end run.",
        highlights: ["Installed the pipe locally"],
        topApps: [{ appName: "Cursor", minutes: 220 }],
        focusMinutesEstimate: 180,
        sourceDevices: ["screenpipe-local"],
        rpg: {
          xpEarned: 96,
          level: 3,
          streakDays: 3,
          focusXp: 30,
          deepWorkXp: 30,
          learningXp: 20,
          communicationXp: 16,
          statusLabel: "Locked in",
          rationale: "Long uninterrupted implementation block.",
        },
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        dateKey: "2026-03-07",
        artifacts: {
          json: "2026-03-07/daily-review.json",
          markdown: "2026-03-07/daily-review.md",
        },
        notion: {
          pageId: "existing-page-456",
          status: "published",
        },
      },
      null,
      2
    )
  );

  const calls = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const body = [];
    req.on("data", (chunk) => body.push(chunk));
    req.on("end", () => {
      calls.push({
        method: req.method,
        pathname: url.pathname,
        body: Buffer.concat(body).toString("utf8"),
      });
      if (req.method === "GET" && url.pathname === "/v1/blocks/existing-page-456/children") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            results: [{ id: "block-1" }, { id: "block-2" }],
          })
        );
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ id: "existing-page-456" }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const notionBaseUrl = `http://127.0.0.1:${address.port}/v1`;

  try {
    const command = await runNode(path.join(scriptsDir, "publish-notion.mjs"), [
      "--review",
      reviewPath,
      "--manifest",
      manifestPath,
      "--notion-api-base-url",
      notionBaseUrl,
      "--notion-api-key",
      "secret_test",
      "--notion-database-id",
      "database-123",
      "--user-id",
      "local-user",
    ]);

    assert.equal(command.status, 0, command.stderr || command.stdout);
    assert.equal(calls.length, 5);
    assert.deepEqual(
      calls.map((call) => `${call.method} ${call.pathname}`),
      [
        "PATCH /v1/pages/existing-page-456",
        "GET /v1/blocks/existing-page-456/children",
        "DELETE /v1/blocks/block-1",
        "DELETE /v1/blocks/block-2",
        "PATCH /v1/blocks/existing-page-456/children",
      ]
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.notion.pageId, "existing-page-456");
    assert.equal(manifest.notion.status, "published");
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});
