#!/usr/bin/env bun
// @bun

// src/index.ts
import { execSync } from "child_process";
import { homedir, platform } from "os";
import { writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    command: "help",
    remote: "",
    morning: null,
    syncInterval: 3600,
    skipSync: false,
    skipSkills: false,
    skipIntentWorker: false,
    verbose: false,
    temporalAddress: "127.0.0.1:7233",
    temporalNamespace: "default",
    workerTaskQueue: "screenpipe.intent",
    workerBuildId: "screenpipe-intent-worker-v1",
    workerConfigPath: "~/.screenpipe/intent-worker/config.json",
    oracleApiUrl: "http://127.0.0.1:3030"
  };
  for (let i = 0;i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--setup":
      case "-s":
        config.command = "setup";
        config.remote = args[++i] || "";
        break;
      case "--remove":
      case "-r":
        config.command = "remove";
        config.remote = args[++i] || "";
        break;
      case "--status":
        config.command = "status";
        config.remote = args[++i] || "";
        break;
      case "--morning":
      case "-m":
        config.morning = args[++i] || "08:00";
        break;
      case "--sync-interval":
        config.syncInterval = parseInt(args[++i]) || 3600;
        break;
      case "--skip-sync":
        config.skipSync = true;
        break;
      case "--skip-skills":
        config.skipSkills = true;
        break;
      case "--skip-intent-worker":
        config.skipIntentWorker = true;
        break;
      case "--temporal-address":
        config.temporalAddress = args[++i] || config.temporalAddress;
        break;
      case "--temporal-namespace":
        config.temporalNamespace = args[++i] || config.temporalNamespace;
        break;
      case "--worker-task-queue":
        config.workerTaskQueue = args[++i] || config.workerTaskQueue;
        break;
      case "--worker-build-id":
        config.workerBuildId = args[++i] || config.workerBuildId;
        break;
      case "--worker-config-path":
        config.workerConfigPath = args[++i] || config.workerConfigPath;
        break;
      case "--oracle-api-url":
        config.oracleApiUrl = args[++i] || config.oracleApiUrl;
        break;
      case "--verbose":
      case "-v":
        config.verbose = true;
        break;
      case "--help":
      case "help":
        config.command = "help";
        break;
    }
  }
  return config;
}
function printHelp() {
  console.log(`
@screenpipe/agent - One-liner to connect Screenpipe to your AI agent

USAGE:
  bunx @screenpipe/agent --setup <host> [options]
  bunx @screenpipe/agent --remove <host>
  bunx @screenpipe/agent --status <host>

OPTIONS:
  --setup <host>        Set up full Screenpipe integration
  --remove <host>       Remove Screenpipe integration
  --status <host>       Check integration status

  --morning <HH:MM>     Add morning summary at specified time (e.g., 08:00)
  --sync-interval <s>   Sync frequency in seconds (default: 3600)
  --skip-sync           Don't set up data sync
  --skip-skills         Don't install skills
  --skip-intent-worker  Don't write Temporal/intent worker bootstrap files
  --temporal-address    Temporal server address (default: 127.0.0.1:7233)
  --temporal-namespace  Temporal namespace (default: default)
  --worker-task-queue   Temporal task queue (default: screenpipe.intent)
  --worker-build-id     Worker build id label for deployments
  --worker-config-path  Remote worker config path
  --oracle-api-url      Oracle Screenpipe HTTP API for the worker
  -v, --verbose         Show debug output

EXAMPLES:
  # Full setup with morning summaries at 8am
  bunx @screenpipe/agent --setup openclaw --morning 08:00

  # Setup with custom sync interval (30 min)
  bunx @screenpipe/agent --setup user@1.2.3.4 --morning 07:30 --sync-interval 1800

  # Pair a remote Temporal-backed intent worker
  bunx @screenpipe/agent --setup worker-host --temporal-address 10.0.0.5:7233 --worker-task-queue screenpipe.intent

  # Remove integration
  bunx @screenpipe/agent --remove openclaw

WHAT IT DOES:
  1. Sets up screen data sync daemon (survives reboot)
  2. Installs screenpipe skills (recall, search, digest, context)
  3. Writes Temporal-backed intent worker bootstrap config
  4. Adds morning summary cron job to your agent
  5. Your agent sends you daily briefings via Telegram/WhatsApp/etc
`);
}
function log(step, total, msg) {
  console.log(`
[${step}/${total}] ${msg}`);
}
function exec(cmd, verbose) {
  if (verbose)
    console.log(`  $ ${cmd}`);
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: verbose ? "inherit" : "pipe" }) || "";
  } catch (e) {
    if (verbose)
      console.error(`  Error: ${e.message}`);
    throw e;
  }
}
function testSSH(remote) {
  try {
    execSync(`ssh -o ConnectTimeout=5 ${remote} "echo ok"`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
var MORNING_SKILL = `---
name: screenpipe-morning
description: Morning briefing from yesterday's screen activity. Run this skill daily to get a summary of what you worked on and action items.
tools: Bash
---

# Screenpipe Morning Briefing

Generate a morning summary from yesterday's screen activity.

## Query Yesterday's Activity

\`\`\`bash
sqlite3 -header ~/.screenpipe/db.sqlite "
  SELECT
    o.app_name,
    COUNT(*) as frames,
    ROUND(COUNT(*) * 5.0 / 60, 1) as approx_minutes
  FROM ocr_text o
  JOIN frames f ON o.frame_id = f.id
  WHERE date(f.timestamp) = date('now', '-1 day')
  GROUP BY o.app_name
  ORDER BY frames DESC
  LIMIT 10;
"
\`\`\`

## Extract Action Items

Search for patterns like "TODO", "need to", "should", "must", "action item":

\`\`\`bash
sqlite3 ~/.screenpipe/db.sqlite "
  SELECT DISTINCT substr(o.text, 1, 200)
  FROM ocr_text o
  JOIN frames f ON o.frame_id = f.id
  WHERE date(f.timestamp) = date('now', '-1 day')
    AND (o.text LIKE '%TODO%'
      OR o.text LIKE '%need to%'
      OR o.text LIKE '%action item%'
      OR o.text LIKE '%reminder%')
  LIMIT 20;
"
\`\`\`

## Output Format

Send the user a concise morning briefing:

\`\`\`
Good morning! Here's your briefing:

**Yesterday's Focus:**
- VS Code: ~3 hours (screenpipe repo)
- Chrome: ~2 hours (docs, GitHub)
- Slack: ~45 min

**Action Items Found:**
- [ ] Fix auth bug in login.ts
- [ ] Review PR #234
- [ ] Send weekly update

**Pattern:** Deep focus morning, fragmented afternoon.
\`\`\`
`;
async function setupMorningCron(remote, time, verbose) {
  const [hour, minute] = time.split(":").map((x) => parseInt(x) || 0);
  console.log("      \u2192 Installing morning skill...");
  const skillContent = MORNING_SKILL.replace(/`/g, "\\`");
  exec(`ssh ${remote} "mkdir -p ~/clawd/skills/screenpipe && cat > ~/clawd/skills/screenpipe/morning.md << 'SKILLEOF'
${MORNING_SKILL}
SKILLEOF"`, verbose);
  console.log("      \u2192 Adding cron job...");
  const cronCmd = `${minute} ${hour} * * * cd ~ && echo "Run screenpipe-morning skill and send me the summary" | tee /tmp/screenpipe-morning-trigger.txt`;
  exec(`ssh ${remote} "(crontab -l 2>/dev/null | grep -v screenpipe-morning; echo '${cronCmd}') | crontab -"`, verbose);
  const triggerScript = `#!/bin/bash
# Screenpipe Morning Summary Trigger
# This file is created at the scheduled time to trigger the morning summary
echo "Morning summary requested at $(date)"
`;
  exec(`ssh ${remote} "cat > ~/clawd/screenpipe-morning-trigger.sh << 'EOF'
${triggerScript}
EOF
chmod +x ~/clawd/screenpipe-morning-trigger.sh"`, verbose);
}
function buildIntentWorkerConfig(config) {
  return JSON.stringify({
    temporalAddress: config.temporalAddress,
    temporalNamespace: config.temporalNamespace,
    taskQueue: config.workerTaskQueue,
    buildId: config.workerBuildId,
    oracleApiUrl: config.oracleApiUrl,
    maxConcurrentActivities: 4,
    maxConcurrentWorkflows: 8,
    logLevel: config.verbose ? "debug" : "info"
  }, null, 2);
}
async function setupIntentWorker(config) {
  const configJson = buildIntentWorkerConfig(config);
  exec(`ssh ${config.remote} "mkdir -p ~/.screenpipe/intent-worker ~/clawd/bin && cat > ${config.workerConfigPath} << 'EOF'
${configJson}
EOF"`, config.verbose);
  const launcher = `#!/bin/bash
set -euo pipefail
CONFIG_PATH="${config.workerConfigPath}"
if command -v bunx >/dev/null 2>&1; then
  exec bunx @screenpipe/intent-worker run --config "$CONFIG_PATH"
fi
if command -v node >/dev/null 2>&1; then
  exec npx @screenpipe/intent-worker run --config "$CONFIG_PATH"
fi
echo "Neither bunx nor npx is available on this host." >&2
exit 1
`;
  exec(`ssh ${config.remote} "cat > ~/clawd/bin/screenpipe-intent-worker << 'EOF'
${launcher}
EOF
chmod +x ~/clawd/bin/screenpipe-intent-worker"`, config.verbose);
}
async function setup(config) {
  if (!config.remote) {
    console.error("Error: --setup requires a host (e.g., --setup openclaw)");
    process.exit(1);
  }
  const totalSteps = 5;
  console.log(`
\uD83D\uDE80 Setting up Screenpipe integration with ${config.remote}...
`);
  log(1, totalSteps, "Testing connection...");
  if (!testSSH(config.remote)) {
    console.error(`   \u2717 Cannot connect to ${config.remote}`);
    console.error(`     Make sure SSH is configured: ssh ${config.remote}`);
    process.exit(1);
  }
  console.log(`      \u2192 Connected to ${config.remote} \u2713`);
  if (!config.skipSync) {
    log(2, totalSteps, "Setting up screen data sync...");
    try {
      exec(`bunx @screenpipe/sync --daemon --remote ${config.remote}:~/.screenpipe/ --interval ${config.syncInterval}`, config.verbose);
      console.log(`      \u2192 Daemon installed, syncs every ${config.syncInterval}s`);
    } catch (e) {
      console.log("      \u2192 Running sync setup...");
      const home = homedir();
      const dbPath = join(home, ".screenpipe", "db.sqlite");
      exec(`ssh ${config.remote} "mkdir -p ~/.screenpipe"`, config.verbose);
      try {
        exec(`rsync -az "${dbPath}" ${config.remote}:~/.screenpipe/db.sqlite`, config.verbose);
        console.log("      \u2192 Initial sync complete");
      } catch {
        console.log("      \u2192 Will sync on next daemon run");
      }
      if (platform() === "darwin") {
        const plistPath = join(home, "Library/LaunchAgents/com.screenpipe.agent-sync.plist");
        const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.screenpipe.agent-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>rsync -az ~/.screenpipe/db.sqlite ${config.remote}:~/.screenpipe/db.sqlite 2>/dev/null || true</string>
    </array>
    <key>StartInterval</key>
    <integer>${config.syncInterval}</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/screenpipe-agent-sync.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/screenpipe-agent-sync.err</string>
</dict>
</plist>`;
        mkdirSync(join(home, "Library/LaunchAgents"), { recursive: true });
        writeFileSync(plistPath, plist);
        try {
          execSync(`launchctl unload "${plistPath}" 2>/dev/null`);
        } catch {}
        execSync(`launchctl load "${plistPath}"`);
        console.log(`      \u2192 Daemon installed, syncs every ${config.syncInterval}s`);
      }
    }
  } else {
    log(2, totalSteps, "Skipping sync setup (--skip-sync)");
  }
  if (!config.skipSkills) {
    log(3, totalSteps, "Installing screenpipe skills...");
    try {
      exec(`bunx @screenpipe/skills install --remote ${config.remote}`, config.verbose);
      console.log("      \u2192 recall, search, digest, context installed");
    } catch {
      console.log("      \u2192 Installing skills directly...");
      exec(`ssh ${config.remote} "mkdir -p ~/clawd/skills/screenpipe"`, config.verbose);
      const digestSkill = `---
name: screenpipe-digest
description: Get a summary of screen activity
tools: Bash
---

Query ~/.screenpipe/db.sqlite for activity summary.

\\\`\\\`\\\`bash
sqlite3 ~/.screenpipe/db.sqlite "SELECT app_name, COUNT(*) FROM ocr_text GROUP BY app_name ORDER BY COUNT(*) DESC LIMIT 10;"
\\\`\\\`\\\`
`;
      exec(`ssh ${config.remote} "echo '${digestSkill}' > ~/clawd/skills/screenpipe/digest.md"`, config.verbose);
      console.log("      \u2192 Basic skills installed");
    }
  } else {
    log(3, totalSteps, "Skipping skills installation (--skip-skills)");
  }
  if (!config.skipIntentWorker) {
    log(4, totalSteps, "Writing Temporal intent worker bootstrap...");
    await setupIntentWorker(config);
    console.log(`      \u2192 Temporal address: ${config.temporalAddress}`);
    console.log(`      \u2192 Task queue: ${config.workerTaskQueue}`);
    console.log(`      \u2192 Remote config: ${config.workerConfigPath}`);
  } else {
    log(4, totalSteps, "Skipping intent worker bootstrap (--skip-intent-worker)");
  }
  if (config.morning) {
    log(5, totalSteps, `Adding morning summary at ${config.morning}...`);
    await setupMorningCron(config.remote, config.morning, config.verbose);
    console.log(`      \u2192 Scheduled for ${config.morning} daily`);
  } else {
    log(5, totalSteps, "Skipping morning summary (use --morning HH:MM to enable)");
  }
  console.log(`
\u2705 Done! Screenpipe is connected to ${config.remote}
`);
  if (config.morning) {
    console.log(`   \uD83D\uDCEC You'll receive daily summaries at ${config.morning}`);
  }
  console.log(`   \uD83D\uDCA1 Ask your agent: "What was I working on yesterday?"`);
  console.log(`   \uD83E\uDD16 Remote worker bootstrap: ~/clawd/bin/screenpipe-intent-worker`);
  console.log(`
   To remove: bunx @screenpipe/agent --remove ${config.remote}
`);
}
async function remove(config) {
  if (!config.remote) {
    console.error("Error: --remove requires a host");
    process.exit(1);
  }
  console.log(`
\uD83D\uDDD1\uFE0F  Removing Screenpipe integration from ${config.remote}...
`);
  const home = homedir();
  if (platform() === "darwin") {
    const plistPath = join(home, "Library/LaunchAgents/com.screenpipe.agent-sync.plist");
    try {
      execSync(`launchctl unload "${plistPath}" 2>/dev/null`);
      unlinkSync(plistPath);
      console.log("   \u2713 Local sync daemon removed");
    } catch {
      console.log("   - No local daemon found");
    }
    const syncPlistPath = join(home, "Library/LaunchAgents/com.screenpipe.sync.plist");
    try {
      execSync(`launchctl unload "${syncPlistPath}" 2>/dev/null`);
      unlinkSync(syncPlistPath);
      console.log("   \u2713 Sync daemon removed");
    } catch {}
  }
  try {
    exec(`ssh ${config.remote} "crontab -l 2>/dev/null | grep -v screenpipe | crontab -"`, config.verbose);
    console.log("   \u2713 Remote cron jobs removed");
  } catch {
    console.log("   - No remote cron found");
  }
  try {
    exec(`ssh ${config.remote} "rm -rf ~/clawd/skills/screenpipe"`, config.verbose);
    console.log("   \u2713 Remote skills removed");
  } catch {
    console.log("   - No remote skills found");
  }
  try {
    exec(`ssh ${config.remote} "rm -f ~/clawd/bin/screenpipe-intent-worker ${config.workerConfigPath}"`, config.verbose);
    console.log("   \u2713 Intent worker bootstrap removed");
  } catch {
    console.log("   - No intent worker bootstrap found");
  }
  console.log(`
\u2705 Screenpipe integration removed
`);
}
async function status(config) {
  if (!config.remote) {
    console.error("Error: --status requires a host");
    process.exit(1);
  }
  console.log(`
\uD83D\uDCCA Screenpipe integration status for ${config.remote}
`);
  const sshOk = testSSH(config.remote);
  console.log(`   SSH connection: ${sshOk ? "\u2713" : "\u2717"}`);
  if (!sshOk) {
    console.log(`
   Cannot connect to remote. Check SSH config.
`);
    return;
  }
  if (platform() === "darwin") {
    try {
      const result = execSync("launchctl list | grep screenpipe", { encoding: "utf-8" });
      console.log(`   Local sync daemon: \u2713 running`);
    } catch {
      console.log(`   Local sync daemon: \u2717 not running`);
    }
  }
  try {
    const dbSize = exec(`ssh ${config.remote} "du -h ~/.screenpipe/db.sqlite 2>/dev/null | cut -f1"`, false).trim();
    console.log(`   Remote database: \u2713 ${dbSize}`);
  } catch {
    console.log(`   Remote database: \u2717 not found`);
  }
  try {
    const skills = exec(`ssh ${config.remote} "ls ~/clawd/skills/screenpipe/*.md 2>/dev/null | wc -l"`, false).trim();
    console.log(`   Skills installed: \u2713 ${skills} skills`);
  } catch {
    console.log(`   Skills installed: \u2717 none`);
  }
  try {
    const cron = exec(`ssh ${config.remote} "crontab -l 2>/dev/null | grep screenpipe-morning"`, false).trim();
    if (cron) {
      console.log(`   Morning summary: \u2713 scheduled`);
    } else {
      console.log(`   Morning summary: - not scheduled`);
    }
  } catch {
    console.log(`   Morning summary: - not scheduled`);
  }
  try {
    const workerConfig = exec(`ssh ${config.remote} "cat ${config.workerConfigPath} 2>/dev/null"`, false).trim();
    if (workerConfig) {
      const parsed = JSON.parse(workerConfig);
      console.log(`   Intent worker: \u2713 queue=${parsed.taskQueue} temporal=${parsed.temporalAddress}`);
    } else {
      console.log(`   Intent worker: - not configured`);
    }
  } catch {
    console.log(`   Intent worker: - not configured`);
  }
  console.log("");
}
async function main() {
  const config = parseArgs();
  switch (config.command) {
    case "setup":
      await setup(config);
      break;
    case "remove":
      await remove(config);
      break;
    case "status":
      await status(config);
      break;
    case "help":
    default:
      printHelp();
  }
}
main().catch((e) => {
  console.error(`
\u274C Error: ${e.message}
`);
  process.exit(1);
});
