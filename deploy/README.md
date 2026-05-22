# VPS Deployment — Website + Cloned Bots Together

## One-time setup

```bash
# 1. System deps (Ubuntu/Debian)
sudo apt update && sudo apt install -y python3 python3-pip ffmpeg nodejs npm git

# 2. Clone your repo on the VPS
cd /root && git clone <your-repo-url> uppermoon-tunes && cd uppermoon-tunes

# 3. Config
cp .env.bot.example .env
nano .env          # fill OWNER_API_KEY (umowner_…), API_ID, API_HASH
```

## Start everything

```bash
bash deploy/start-all.sh
```

The website runs on `:8080` and `bot_worker.py` keeps polling the website's
`/clones` endpoint. **Any clone ANY user creates in the Developer Portal is
auto-spawned within ~5s** — the owner API key acts as a global VPS-worker key
that fetches every active clone across the platform. Bot + assistant both
connect, both send a startup message to that clone's logger group, and every
`/play` is mirrored to the same logger group with thumbnail + chat info.

## Auto-restart on reboot (systemd)

```bash
sudo cp deploy/uppermoon-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now uppermoon-bot
sudo journalctl -u uppermoon-bot -f
```

## Commands available in every cloned bot

| Command | What it does |
|---|---|
| `/start` | Rich welcome card with banner image + inline buttons |
| `/help` | Full command list |
| `/play <song>` | Assistant joins VC, streams from YouTube, posts now-playing card with Pause / Resume / Skip / Close buttons |
| `/pause` `/resume` `/skip` `/stop` | Playback control |
| `/queue` | Show upcoming tracks |
| `/ping` `/alive` | Health check |
| `/ban` `/unban` `/mute` `/unmute` | Group admin (reply to user) |

When a clone first comes online the log group receives:
1. A photo message from the **bot** confirming "<name> is now online"
2. A message from the **assistant** confirming the userbot is ready for VC

`/play` flow:
1. Bot calls website `/play?q=…` (YouTube key pool, no quota burn on VPS)
2. `yt-dlp` resolves the streamable URL on the VPS
3. PyTgCalls pipes audio into the active group VC via the assistant
4. Now-playing card is posted to the chat **and** synced to the website's
   `/nowplaying` so the dashboard mirrors it live
