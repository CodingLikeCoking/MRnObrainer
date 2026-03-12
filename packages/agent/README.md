# @screenpipe/agent

**One-liner to connect MRnObrainer or Screenpipe-compatible data to your
AI agent.**

Set up full Screenpipe integration with your AI agent in one command.
Includes data sync, skills, and optional morning summaries.

> Compatibility note
> Package names remain `@screenpipe/*` for runtime compatibility. The
> shipping product and public docs in this repository use the
> MRnObrainer name.

## Quick Start

```bash
# Full setup with morning summaries at 8am
bunx @screenpipe/agent --setup openclaw --morning 08:00

# That's it! You'll get daily briefings via Telegram/WhatsApp/etc.
```

## What It Does

1. **Syncs your screen data** - Daemon runs locally, syncs to your agent every hour
2. **Installs skills** - recall, search, digest, context
3. **Schedules morning summary** - Agent sends you daily briefing at specified time
4. **Just works** - Survives reboots, runs in background

## Usage

```bash
# Setup with morning summary
bunx @screenpipe/agent --setup user@server --morning 08:00

# Setup without morning summary
bunx @screenpipe/agent --setup user@server

# Custom sync interval (30 min)
bunx @screenpipe/agent --setup user@server --sync-interval 1800

# Check status
bunx @screenpipe/agent --status user@server

# Remove integration
bunx @screenpipe/agent --remove user@server
```

## Options

| Flag | Description |
| ---- | ----------- |
| `--setup <host>` | Set up full integration |
| `--remove <host>` | Remove integration |
| `--status <host>` | Check integration status |
| `--morning <HH:MM>` | Schedule morning summary |
| `--sync-interval <s>` | Sync frequency (default: 3600) |
| `--skip-sync` | Don't set up data sync |
| `--skip-skills` | Don't install skills |

## Requirements

- A local MRnObrainer or compatible Screenpipe runtime running on your machine
- SSH access to your agent server
- AI agent that supports skills (for example OpenClaw)

## What You Get

After setup, ask your agent:

- "What was I working on yesterday?"
- "Find when I saw that error message"
- "Summarize my screen activity today"
- "What meetings did I have this week?"

With `--morning`, you'll receive a daily briefing at the specified time:

```text
Good morning! Here's your briefing:

**Yesterday's Focus:**
- VS Code: ~3 hours
- Chrome: ~2 hours
- Slack: ~45 min

**Action Items Found:**
- [ ] Fix auth bug
- [ ] Review PR #234

**Pattern:** Deep focus morning, meetings afternoon.
```

## How It Works

```text
Your Computer                    Your Agent Server
┌─────────────┐                  ┌─────────────────┐
│  Screenpipe │ ──sync daemon──▶ │ ~/.screenpipe/  │
│  (records)  │    (hourly)      │   db.sqlite     │
└─────────────┘                  └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  AI Agent       │
                                 │  (OpenClaw)     │
                                 │                 │
                                 │  Skills query   │
                                 │  the database   │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │  Telegram/      │
                                 │  WhatsApp/etc   │
                                 └─────────────────┘
```

## License

MIT - Source of record: [MRnObrainer](https://github.com/CodingLikeCoking/MRnObrainer)

## Contributing

For public examples, issues, and PRs, keep logs and screenshots
redacted and follow [CONTRIBUTING.md](../../CONTRIBUTING.md) and
[docs/CHANGE_RULES.md](../../docs/CHANGE_RULES.md).
