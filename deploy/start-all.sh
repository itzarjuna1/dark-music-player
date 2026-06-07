#!/usr/bin/env bash
# Start the website AND the bot worker together on the VPS.
# Usage: bash deploy/start-all.sh
set -e

cd "$(dirname "$0")/.."

# 1. Website (Vite preview / your existing build serve)
if pgrep -f "vite preview" >/dev/null; then
  echo "✓ Website already running"
else
  echo "▶ Building & serving website…"
  npm install --silent
  npm run build
  nohup npm run preview -- --host 0.0.0.0 --port 8080 > website.log 2>&1 &
  echo "  PID=$!  (logs: website.log)"
fi

# 2. Bot worker (auto-spawns all cloned bots from the website)
if pgrep -f "bot_worker.py" >/dev/null; then
  echo "✓ Bot worker already running"
else
  echo "▶ Starting bot_worker.py…"
  if [ ! -f .env ]; then
    echo "  ⚠ Missing .env — copy .env.bot.example to .env and fill in values"
    exit 1
  fi
  python3 -m pip install --quiet -r requirements.txt
  nohup python3 bot_worker.py > bot_worker.log 2>&1 &
  echo "  PID=$!  (logs: bot_worker.log)"
fi

echo ""
echo "✅ All systems up. Every clone you create on the website will auto-spawn within ${POLL_INTERVAL:-20}s."
