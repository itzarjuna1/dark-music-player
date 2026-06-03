import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ---- Telegram helpers ----
const BOT_TOKEN = () => Deno.env.get("SNOWY_BOT_TOKEN") || "";
const LOGGER_CHAT_ID = () => Deno.env.get("SNOWY_LOGGER_CHAT_ID") || "";
const START_IMAGE = "https://envs.sh/CSn.jpg";

async function tgCall(method: string, body: Record<string, unknown>) {
  const token = BOT_TOKEN();
  if (!token) return { ok: false, error: "No bot token" };
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sendDocumentFile(
  chatId: number | string,
  filename: string,
  content: string,
  caption: string,
) {
  const token = BOT_TOKEN();
  if (!token) return { ok: false, error: "No bot token" };
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("caption", caption);
  form.append("parse_mode", "HTML");
  form.append(
    "document",
    new Blob([content], { type: "text/x-python" }),
    filename,
  );
  const r = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form,
  });
  return r.json();
}


async function sendPhoto(chatId: number | string, photoUrl: string, caption: string, replyMarkup?: object) {
  return tgCall("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendMessage(chatId: number | string, text: string, replyMarkup?: object) {
  return tgCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function editMessage(chatId: number | string, messageId: number, text: string, replyMarkup?: object) {
  // Try editMessageText; if the source message is a photo (start card),
  // Telegram rejects it — fall back to editMessageCaption.
  const base = {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };
  const r1 = await tgCall("editMessageText", { ...base, text });
  if ((r1 as any)?.ok) return r1;
  const r2 = await tgCall("editMessageCaption", { ...base, caption: text });
  if ((r2 as any)?.ok) return r2;
  // Last-resort: send as a new message so the user always sees something
  return sendMessage(chatId, text, replyMarkup);
}


async function answerCallback(callbackQueryId: string, text?: string, showAlert = false) {
  return tgCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || "",
    show_alert: showAlert,
  });
}

function generateKey(prefix = "um"): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}

function maskKey(k: string): string {
  return k.slice(0, 8) + "••••••••" + k.slice(-4);
}

function canRenew(lastRenewedAt: string | null): { allowed: boolean; hoursLeft: number } {
  if (!lastRenewedAt) return { allowed: true, hoursLeft: 0 };
  const last = new Date(lastRenewedAt).getTime();
  const now = Date.now();
  const hrs = (now - last) / (1000 * 3600);
  if (hrs >= 24) return { allowed: true, hoursLeft: 0 };
  return { allowed: false, hoursLeft: Math.ceil(24 - hrs) };
}

// ---- Generate integration code ----
function generateYtPy(apiKey: string, apiUrl: string): string {
  return `"""
youtube.py  —  UpperMoon Tunes API client + YouTube stream extractor.
Generated for API key: ${maskKey(apiKey)}

Edit API_KEY below or set the UPPERMOON_API_KEY env variable.
"""

from __future__ import annotations
import asyncio, os, re
from typing import Any, Optional
import aiohttp, yt_dlp

API_KEY: str = os.getenv("UPPERMOON_API_KEY", "${apiKey}")
BASE_URL: str = os.getenv("UPPERMOON_BASE_URL", "${apiUrl}").rstrip("/")

YT_URL_RE = re.compile(
    r"(?:youtube\\.com/(?:watch\\?v=|shorts/|embed/)|youtu\\.be/)([A-Za-z0-9_-]{11})"
)

def _is_youtube_url(text: str) -> Optional[str]:
    m = YT_URL_RE.search(text or "")
    return m.group(1) if m else None

class YouTubeAPIError(Exception):
    pass

class YouTubeAPI:
    def __init__(self, api_key: str = API_KEY, base_url: str = BASE_URL):
        if not api_key or "REPLACE" in api_key:
            raise YouTubeAPIError("Set UPPERMOON_API_KEY or edit API_KEY in youtube.py")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self._session: Optional[aiohttp.ClientSession] = None

    async def _sess(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                headers={"X-API-Key": self.api_key},
                timeout=aiohttp.ClientTimeout(total=30),
            )
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def _get(self, path: str, **params: Any) -> dict:
        sess = await self._sess()
        url = f"{self.base_url}/{path.lstrip('/')}"
        async with sess.get(url, params=params) as r:
            data = await r.json(content_type=None)
            if r.status >= 400:
                raise YouTubeAPIError(data.get("error") or f"HTTP {r.status}")
            return data

    async def _post(self, path: str, payload: dict) -> dict:
        sess = await self._sess()
        url = f"{self.base_url}/{path.lstrip('/')}"
        async with sess.post(url, json=payload) as r:
            data = await r.json(content_type=None)
            if r.status >= 400:
                raise YouTubeAPIError(data.get("error") or f"HTTP {r.status}")
            return data

    async def search(self, query: str, limit: int = 10) -> list[dict]:
        vid = _is_youtube_url(query)
        if vid:
            res = await self._get("play", q=f"https://youtu.be/{vid}")
            return [res["track"]]
        res = await self._get("search", q=query, limit=limit)
        return res.get("results", [])

    async def shorts(self, query: str, limit: int = 10) -> list[dict]:
        res = await self._get("shorts", q=query, limit=limit)
        return res.get("results", [])

    async def top_match(self, query: str) -> dict:
        if _is_youtube_url(query):
            results = await self.search(query, 1)
        else:
            res = await self._get("play", q=query)
            results = [res["track"]]
        if not results:
            raise YouTubeAPIError(f"No results for '{query}'")
        return results[0]

    async def update_now_playing(
        self, title: str, artist: str = "", cover: str = "",
        video_id: str = "", duration: int = 0, position: int = 0,
        is_playing: bool = True,
    ) -> None:
        try:
            await self._post("nowplaying", {
                "title": title, "artist": artist, "cover": cover,
                "video_id": video_id, "duration": int(duration),
                "position": int(position), "is_playing": is_playing,
            })
        except YouTubeAPIError:
            pass

    async def extract_stream(self, video_url: str) -> dict:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_sync, video_url)

    @staticmethod
    def _extract_sync(video_url: str) -> dict:
        ydl_opts = {
            "format": "bestaudio/best",
            "quiet": True, "no_warnings": True,
            "noplaylist": True, "geo_bypass": True,
            "nocheckcertificate": True,
            "source_address": "0.0.0.0",
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            if "entries" in info:
                info = info["entries"][0]
            return {
                "url": info["url"],
                "title": info.get("title", ""),
                "duration": info.get("duration", 0),
                "thumbnail": info.get("thumbnail", ""),
                "webpage_url": info.get("webpage_url", video_url),
            }

yt = YouTubeAPI()
`;
}

function generatePlayPy(apiKey: string): string {
  return `"""
play.py  —  UpperMoon Tunes music handler (Pyrogram + PyTgCalls)
Generated for API key: ${maskKey(apiKey)}

Setup:
  pip install pyrogram tgcrypto py-tgcalls yt-dlp aiohttp
  apt install ffmpeg

Config (add to your config.py or .env):
  API_ID, API_HASH, BOT_TOKEN, STRING_SESSION
  UPPERMOON_API_KEY = "${apiKey}"
"""

from __future__ import annotations
import asyncio, logging, os
from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Deque, Optional

from pyrogram import Client, filters, idle
from pyrogram.types import (
    CallbackQuery, InlineKeyboardButton,
    InlineKeyboardMarkup, Message,
)

try:
    from pytgcalls import PyTgCalls
    from pytgcalls.types import MediaStream, Update
    from pytgcalls.types.stream import StreamAudioEnded
except ImportError as e:
    raise SystemExit("py-tgcalls required: pip install py-tgcalls") from e

# ---- Import your config ----
from config import API_ID, API_HASH, BOT_TOKEN, STRING_SESSION
try:
    from config import LOG_GROUP_ID
except Exception:
    LOG_GROUP_ID = 0

os.environ.setdefault("UPPERMOON_API_KEY", "${apiKey}")
from youtube import yt, YouTubeAPIError

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("play")

app = Client("bot", api_id=API_ID, api_hash=API_HASH, bot_token=BOT_TOKEN, in_memory=True)
assistant = Client("ass", api_id=API_ID, api_hash=API_HASH, session_string=STRING_SESSION, in_memory=True)
calls = PyTgCalls(assistant)


@dataclass
class Track:
    title: str; artist: str; duration: int; thumbnail: str
    video_id: str; stream_url: str; webpage_url: str
    requester: str; chat_id: int


_queues: dict[int, Deque[Track]] = defaultdict(deque)
_current: dict[int, Track] = {}


def _fmt(s: int) -> str:
    return f"{s//60}:{s%60:02d}"


def _markup(chat_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([[
        InlineKeyboardButton("Pause", callback_data=f"pp:pause:{chat_id}"),
        InlineKeyboardButton("Resume", callback_data=f"pp:resume:{chat_id}"),
        InlineKeyboardButton("Skip", callback_data=f"pp:skip:{chat_id}"),
    ], [
        InlineKeyboardButton("Stop", callback_data=f"pp:stop:{chat_id}"),
        InlineKeyboardButton("Close", callback_data=f"pp:close:{chat_id}"),
    ]])


async def _resolve(query: str, requester: str, chat_id: int) -> Track:
    meta = await yt.top_match(query)
    url = meta.get("youtube_url") or meta.get("webpage_url") or f"https://youtu.be/{meta['video_id']}"
    stream = await yt.extract_stream(url)
    return Track(
        title=meta.get("title") or stream["title"],
        artist=meta.get("artist") or meta.get("channel") or "",
        duration=int(meta.get("duration") or stream.get("duration") or 0),
        thumbnail=meta.get("thumbnail") or stream.get("thumbnail", ""),
        video_id=meta.get("video_id") or "",
        stream_url=stream["url"],
        webpage_url=stream.get("webpage_url", url),
        requester=requester, chat_id=chat_id,
    )


async def _play_track(t: Track) -> None:
    await calls.play(t.chat_id, MediaStream(t.stream_url, video_flags=MediaStream.Flags.IGNORE))
    _current[t.chat_id] = t
    await yt.update_now_playing(
        title=t.title, artist=t.artist, cover=t.thumbnail,
        video_id=t.video_id, duration=t.duration, position=0, is_playing=True,
    )
    cap = (f"<b>Now Playing</b>\\n\\n<b>{t.title}</b>\\n"
           f"Artist: {t.artist or 'Unknown'}\\n"
           f"Duration: {_fmt(t.duration)}\\n"
           f"Requested by: {t.requester}")
    try:
        if t.thumbnail:
            await app.send_photo(t.chat_id, t.thumbnail, caption=cap, reply_markup=_markup(t.chat_id))
        else:
            await app.send_message(t.chat_id, cap, reply_markup=_markup(t.chat_id))
    except Exception as e:
        log.warning("send card failed: %s", e)
        await app.send_message(t.chat_id, cap)


async def _advance(chat_id: int, notice: Optional[Message] = None) -> None:
    q = _queues[chat_id]
    if not q:
        _current.pop(chat_id, None)
        try: await calls.leave_call(chat_id)
        except Exception: pass
        if notice: await notice.reply("Queue finished.")
        return
    nxt = q.popleft()
    try:
        await _play_track(nxt)
        if notice: await notice.reply(f"Now playing: <b>{nxt.title}</b>")
    except Exception as e:
        log.exception("advance failed")
        if notice: await notice.reply(f"Error: {e}")
        await _advance(chat_id, notice)


@app.on_message(filters.command("start") & filters.private)
async def _start(_, m: Message):
    await m.reply("Add me to a group, start a voice chat, then /play song")


@app.on_message(filters.command(["play", "p"]) & ~filters.private)
async def _play(_, m: Message):
    if len(m.command) < 2:
        return await m.reply("Usage: /play song name")
    query = m.text.split(None, 1)[1]
    msg = await m.reply(f"Searching <b>{query}</b>...")
    try:
        requester = m.from_user.mention if m.from_user else "Anonymous"
        track = await _resolve(query, requester, m.chat.id)
    except Exception as e:
        return await msg.edit(f"Error: {e}")
    if m.chat.id in _current:
        _queues[m.chat.id].append(track)
        return await msg.edit(f"Queued: {track.title}")
    await msg.delete()
    try: await _play_track(track)
    except Exception as e:
        await m.reply(f"Failed: {e}")


@app.on_message(filters.command("pause") & ~filters.private)
async def _pause(_, m: Message):
    try: await calls.pause_stream(m.chat.id); await m.reply("Paused")
    except Exception as e: await m.reply(f"Error: {e}")


@app.on_message(filters.command("resume") & ~filters.private)
async def _resume(_, m: Message):
    try: await calls.resume_stream(m.chat.id); await m.reply("Resumed")
    except Exception as e: await m.reply(f"Error: {e}")


@app.on_message(filters.command(["skip", "next"]) & ~filters.private)
async def _skip(_, m: Message): await _advance(m.chat.id, m)


@app.on_message(filters.command(["stop", "end"]) & ~filters.private)
async def _stop(_, m: Message):
    _queues[m.chat.id].clear(); _current.pop(m.chat.id, None)
    try: await calls.leave_call(m.chat.id)
    except Exception: pass
    await m.reply("Stopped and cleared queue.")


@app.on_message(filters.command("queue") & ~filters.private)
async def _queue(_, m: Message):
    q = _queues[m.chat.id]; cur = _current.get(m.chat.id)
    if not cur and not q: return await m.reply("Queue is empty.")
    lines = []
    if cur: lines.append(f"Now: {cur.title}")
    for i, t in enumerate(q, 1): lines.append(f"{i}. {t.title}")
    await m.reply("\\n".join(lines))


@app.on_callback_query(filters.regex(r"^pp:(pause|resume|skip|stop|close):(-?\\d+)$"))
async def _btn(_, cq: CallbackQuery):
    action = cq.matches[0].group(1)
    chat_id = int(cq.matches[0].group(2))
    try:
        if action == "pause": await calls.pause_stream(chat_id); await cq.answer("Paused")
        elif action == "resume": await calls.resume_stream(chat_id); await cq.answer("Resumed")
        elif action == "skip": await _advance(chat_id); await cq.answer("Skipped")
        elif action == "stop":
            _queues[chat_id].clear(); _current.pop(chat_id, None)
            try: await calls.leave_call(chat_id)
            except Exception: pass
            await cq.answer("Stopped")
        elif action == "close":
            try: await cq.message.delete()
            except Exception: pass
            await cq.answer()
    except Exception as e:
        await cq.answer(str(e)[:180], show_alert=True)


@calls.on_update()
async def _on_update(_, update: Update):
    if isinstance(update, StreamAudioEnded):
        await _advance(update.chat_id)


async def main() -> None:
    await assistant.start()
    await app.start()
    await calls.start()
    me = await app.get_me()
    log.info("Bot started: @%s", me.username)
    await idle()
    await app.stop()
    await assistant.stop()


if __name__ == "__main__":
    asyncio.run(main())
`;
}

// ---- Format API usage stats ----
function formatUsage(keyRow: any): string {
  const used = keyRow.requests_used || 0;
  const quota = keyRow.monthly_quota || 1;
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const barLen = 15;
  const filled = Math.round((pct / 100) * barLen);
  const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
  const expiry = keyRow.expires_at
    ? `Expires: ${new Date(keyRow.expires_at).toLocaleDateString("en-GB")}`
    : "Never expires";
  const renewInfo = keyRow.last_renewed_at
    ? `Last renewed: ${new Date(keyRow.last_renewed_at).toLocaleDateString("en-GB")}`
    : "Never renewed";
  return (
    `<b>API Usage Stats</b>\n\n` +
    `Key: <code>${maskKey(keyRow.api_key)}</code>\n` +
    `Plan: <b>${keyRow.plan}</b>\n` +
    `Status: ${keyRow.is_active ? "Active" : "Inactive"}\n\n` +
    `Requests used:\n${bar} ${pct}%\n${used.toLocaleString()} / ${keyRow.is_owner ? "Unlimited" : quota.toLocaleString()}\n\n` +
    `${expiry}\n${renewInfo}`
  );
}

// ---- Main webhook handler ----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check + one-shot webhook setup
  if (req.method === "GET") {
    const u = new URL(req.url);
    if (u.searchParams.get("setup") === "1") {
      const projectId =
        Deno.env.get("SUPABASE_PROJECT_ID") ||
        (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)/)?.[1];
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/snowy-bot`;
      const res = await tgCall("setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      });
      return json({ webhook_url: webhookUrl, telegram_response: res });
    }
    return json({ ok: true, service: "snowy-bot webhook", hint: "append ?setup=1 to register webhook" });
  }


  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let update: any;
  try {
    update = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const projectId =
    Deno.env.get("SUPABASE_PROJECT_ID") ||
    (Deno.env.get("SUPABASE_URL") || "").match(/https:\/\/([^.]+)/)?.[1];
  const apiBase = `https://${projectId}.supabase.co/functions/v1/bot-api`;

  try {
    // ---- Handle callback queries (button presses) ----
    if (update.callback_query) {
      const cq = update.callback_query;
      const userId = cq.from?.id;
      const msgId = cq.message?.message_id;
      const chatId = cq.message?.chat?.id;
      const data = cq.data || "";

      if (data === "generate_key") {
        await answerCallback(cq.id);
        // Check if user already has a key
        const { data: existing } = await supabase
          .from("telegram_api_users")
          .select("*, api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (existing?.api_key) {
          const { data: keyRow } = await supabase
            .from("api_keys")
            .select("*")
            .eq("api_key", existing.api_key)
            .maybeSingle();

          if (keyRow?.is_active) {
            const { allowed, hoursLeft } = canRenew(keyRow.last_renewed_at);
            const markup = {
              inline_keyboard: [
                [{ text: "API Usage", callback_data: "api_usage" }],
                allowed
                  ? [{ text: "Renew API Key", callback_data: "renew_key" }]
                  : [{ text: `Renew in ${hoursLeft}h`, callback_data: "renew_blocked" }],
                [{ text: "Get Integration Files", callback_data: "get_files" }],
              ],
            };
            await editMessage(
              chatId,
              msgId,
              `You already have an active API key!\n\n` +
                `<code>${maskKey(keyRow.api_key)}</code>\n\n` +
                `Plan: <b>${keyRow.plan}</b>\n` +
                `Requests: ${keyRow.requests_used} / ${keyRow.is_owner ? "Unlimited" : keyRow.monthly_quota.toLocaleString()}`,
              markup,
            );
            return json({ ok: true });
          }
        }

        // Generate new free key
        const newKey = generateKey("um");
        const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

        const { error: keyErr } = await supabase.from("api_keys").insert({
          name: `Telegram - ${cq.from?.first_name || "User"}`,
          api_key: newKey,
          plan: "free",
          is_owner: false,
          monthly_quota: 100,
          expires_at: expiresAt,
          contact_info: cq.from?.username ? `@${cq.from.username}` : null,
          telegram_user_id: userId,
          last_renewed_at: new Date().toISOString(),
        });

        if (keyErr) {
          await answerCallback(cq.id, "Failed to generate key. Try again.", true);
          return json({ ok: true });
        }

        // Upsert telegram user record
        await supabase.from("telegram_api_users").upsert(
          {
            telegram_user_id: userId,
            telegram_username: cq.from?.username || null,
            first_name: cq.from?.first_name || "",
            api_key: newKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "telegram_user_id" },
        );

        const markup = {
          inline_keyboard: [
            [{ text: "API Usage", callback_data: "api_usage" }],
            [{ text: "Renew API Key (24h)", callback_data: "renew_blocked" }],
            [{ text: "Get Integration Files", callback_data: "get_files" }],
            [{ text: "Support Group", url: "https://t.me/theinfinity_support" }],
          ],
        };

        await editMessage(
          chatId,
          msgId,
          `<b>API Key Generated!</b>\n\n` +
            `<code>${newKey}</code>\n\n` +
            `<b>Plan:</b> Free Trial (7 days)\n` +
            `<b>Quota:</b> 100 requests\n` +
            `<b>Base URL:</b> <code>${apiBase}</code>\n\n` +
            `<b>Usage:</b>\n<code>curl -H "X-API-Key: ${newKey}" "${apiBase}/search?q=arijit+singh"</code>\n\n` +
            `Key auto-renews every 24 hours. Use /renew to manually renew.\n\n` +
            `<b>Save this key securely!</b>`,
          markup,
        );

        // Log to logger group
        const loggerChat = LOGGER_CHAT_ID();
        if (loggerChat) {
          await sendMessage(
            loggerChat,
            `New API Key Generated\n\nUser: ${cq.from?.first_name} (@${cq.from?.username || "no_username"})\nID: <code>${userId}</code>\nKey: <code>${maskKey(newKey)}</code>\nPlan: Free`,
          );
        }
        return json({ ok: true });
      }

      if (data === "api_usage") {
        await answerCallback(cq.id);
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (!tgUser?.api_key) {
          await answerCallback(cq.id, "No API key found. Generate one first.", true);
          return json({ ok: true });
        }

        // Get stats + recent request logs
        const { data: keyRow } = await supabase
          .from("api_keys")
          .select("*")
          .eq("api_key", tgUser.api_key)
          .maybeSingle();

        const { data: logs } = await supabase
          .from("api_request_logs")
          .select("endpoint, status, created_at")
          .eq("api_key", tgUser.api_key)
          .order("created_at", { ascending: false })
          .limit(5);

        let statsText = keyRow ? formatUsage(keyRow) : "Key not found.";
        if (logs && logs.length > 0) {
          statsText += "\n\n<b>Recent Requests:</b>\n";
          for (const l of logs) {
            const t = new Date(l.created_at).toLocaleTimeString("en-GB");
            statsText += `${t}  /${l.endpoint}  ${l.status}\n`;
          }
        }

        const markup = {
          inline_keyboard: [[{ text: "Back", callback_data: "back_main" }]],
        };
        await editMessage(chatId, msgId, statsText, markup);
        return json({ ok: true });
      }

      if (data === "renew_key") {
        await answerCallback(cq.id);
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (!tgUser?.api_key) {
          await answerCallback(cq.id, "No API key found.", true);
          return json({ ok: true });
        }

        const { data: keyRow } = await supabase
          .from("api_keys")
          .select("*")
          .eq("api_key", tgUser.api_key)
          .maybeSingle();

        if (!keyRow) {
          await answerCallback(cq.id, "Key not found.", true);
          return json({ ok: true });
        }

        const { allowed, hoursLeft } = canRenew(keyRow.last_renewed_at);
        if (!allowed) {
          await answerCallback(cq.id, `Can renew in ${hoursLeft} hours.`, true);
          return json({ ok: true });
        }

        // Generate new key, keep same plan/quota
        const newKey = generateKey("um");
        const newExpiry = new Date(Date.now() + 7 * 86400000).toISOString();

        await supabase.from("api_keys").update({ is_active: false }).eq("api_key", keyRow.api_key);
        await supabase.from("api_keys").insert({
          name: keyRow.name,
          api_key: newKey,
          plan: keyRow.plan,
          is_owner: keyRow.is_owner,
          monthly_quota: keyRow.monthly_quota,
          expires_at: keyRow.expires_at ? newExpiry : null,
          contact_info: keyRow.contact_info,
          telegram_user_id: userId,
          last_renewed_at: new Date().toISOString(),
          requests_used: 0,
        });

        await supabase
          .from("telegram_api_users")
          .update({ api_key: newKey, updated_at: new Date().toISOString() })
          .eq("telegram_user_id", userId);

        const markup = {
          inline_keyboard: [
            [{ text: "API Usage", callback_data: "api_usage" }],
            [{ text: "Get Integration Files", callback_data: "get_files" }],
          ],
        };
        await editMessage(
          chatId,
          msgId,
          `<b>API Key Renewed!</b>\n\n` +
            `New key: <code>${newKey}</code>\n\n` +
            `<b>Plan:</b> ${keyRow.plan}\n` +
            `<b>Quota reset.</b> Next renewal available in 24 hours.`,
          markup,
        );
        return json({ ok: true });
      }

      if (data === "renew_blocked") {
        await answerCallback(cq.id, "You can renew your key once every 24 hours.", true);
        return json({ ok: true });
      }

      if (data === "get_files") {
        await answerCallback(cq.id);
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (!tgUser?.api_key) {
          await answerCallback(cq.id, "Generate an API key first.", true);
          return json({ ok: true });
        }

        const ytCode = generateYtPy(tgUser.api_key, apiBase);
        const playCode = generatePlayPy(tgUser.api_key);

        // Send both files as real Telegram documents (multipart)
        await sendDocumentFile(
          chatId,
          "youtube.py",
          ytCode,
          "<b>youtube.py</b> — UpperMoon API client + yt-dlp extractor\n\nDrop next to your bot. Reads UPPERMOON_API_KEY env var.",
        );
        await sendDocumentFile(
          chatId,
          "play.py",
          playCode,
          "<b>play.py</b> — Pyrogram + PyTgCalls handlers\n\nNeeds: <code>pip install pyrogram tgcrypto py-tgcalls yt-dlp aiohttp</code> and ffmpeg.\nReplace API_ID / API_HASH / BOT_TOKEN / STRING_SESSION in your <code>config.py</code>.",
        );

        await sendMessage(
          chatId,
          `<b>Quick start</b>\n\n` +
            `1. Put <code>youtube.py</code> + <code>play.py</code> next to your bot\n` +
            `2. Set <code>UPPERMOON_API_KEY=${tgUser.api_key}</code>\n` +
            `3. <code>python3 play.py</code>\n\n` +
            `Then in any group with active VC: <code>/play song name</code>`,
        );
        return json({ ok: true });
      }


      if (data === "support") {
        await answerCallback(cq.id);
        const markup = {
          inline_keyboard: [
            [{ text: "Support Group", url: "https://t.me/theinfinity_support" }],
            [{ text: "Back", callback_data: "back_main" }],
          ],
        };
        await editMessage(
          chatId,
          msgId,
          `<b>Support & Resources</b>\n\n` +
            `Need help? Join our support group.\n\n` +
            `<b>API Docs:</b>\n` +
            `<code>GET /search?q=query&limit=10</code> - Search music\n` +
            `<code>GET /shorts?q=query&limit=10</code> - Search Shorts\n` +
            `<code>GET /play?q=query</code> - Top match\n` +
            `<code>POST /nowplaying</code> - Update status\n` +
            `<code>GET /nowplaying</code> - Get status\n\n` +
            `Auth: <code>X-API-Key: your_key</code>`,
          markup,
        );
        return json({ ok: true });
      }

      if (data === "back_main") {
        await answerCallback(cq.id);
        const markup = {
          inline_keyboard: [
            [{ text: "Generate API Key", callback_data: "generate_key" }],
            [{ text: "API Usage & Stats", callback_data: "api_usage" }],
            [
              { text: "Support Group", callback_data: "support" },
              { text: "Our Channel", url: "https://t.me/theinfinity_support" },
            ],
          ],
        };
        await editMessage(
          chatId,
          msgId,
          `<b>UpperMoon Tunes API Bot</b>\n\n` +
            `Get API keys to search YouTube music for your Telegram bots.\n\n` +
            `Free plan: 100 requests / 7 days\nKey renews every 24 hours.`,
          markup,
        );
        return json({ ok: true });
      }

      return json({ ok: true });
    }

    // ---- Handle messages / commands ----
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const userId = msg.from?.id;
      const text: string = msg.text || "";
      const firstName = msg.from?.first_name || "there";

      // /start command
      if (text.startsWith("/start")) {
        const mainMarkup = {
          inline_keyboard: [
            [{ text: "Generate API Key", callback_data: "generate_key" }],
            [{ text: "API Usage & Stats", callback_data: "api_usage" }],
            [
              { text: "Support Group", url: "https://t.me/theinfinity_support" },
              { text: "Our Channel", url: "https://t.me/theinfinity_support" },
            ],
          ],
        };
        const caption =
          `Hello <b>${firstName}</b>!\n\n` +
          `Welcome to <b>UpperMoon Tunes API Bot</b>.\n\n` +
          `Search YouTube music for your Telegram bots — clean metadata, no quota headaches.\n\n` +
          `<b>Free plan:</b> 100 requests / 7 days\n` +
          `<b>Renewal:</b> Every 24 hours (or upgrade for more)\n\n` +
          `Press <b>Generate API Key</b> to get started.`;

        await sendPhoto(chatId, START_IMAGE, caption, mainMarkup);
        return json({ ok: true });
      }

      // /mykey command
      if (text.startsWith("/mykey")) {
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (!tgUser?.api_key) {
          await sendMessage(chatId, "No API key found. Use /start and generate one.");
          return json({ ok: true });
        }

        const { data: keyRow } = await supabase
          .from("api_keys")
          .select("*")
          .eq("api_key", tgUser.api_key)
          .maybeSingle();

        if (!keyRow) {
          await sendMessage(chatId, "Key not found in database.");
          return json({ ok: true });
        }

        const { allowed, hoursLeft } = canRenew(keyRow.last_renewed_at);
        const markup = {
          inline_keyboard: [
            allowed
              ? [{ text: "Renew Key", callback_data: "renew_key" }]
              : [{ text: `Renew in ${hoursLeft}h`, callback_data: "renew_blocked" }],
            [{ text: "Get Integration Files", callback_data: "get_files" }],
          ],
        };
        await sendMessage(
          chatId,
          `Your API Key:\n<code>${keyRow.api_key}</code>\n\n` +
            `Plan: ${keyRow.plan}\n` +
            `Requests: ${keyRow.requests_used} / ${keyRow.is_owner ? "Unlimited" : keyRow.monthly_quota}\n` +
            `Base URL: <code>${apiBase}</code>`,
          markup,
        );
        return json({ ok: true });
      }

      // /renew command
      if (text.startsWith("/renew")) {
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (!tgUser?.api_key) {
          await sendMessage(chatId, "No API key found. Use /start first.");
          return json({ ok: true });
        }

        const { data: keyRow } = await supabase
          .from("api_keys")
          .select("*")
          .eq("api_key", tgUser.api_key)
          .maybeSingle();

        if (!keyRow) {
          await sendMessage(chatId, "Key not found.");
          return json({ ok: true });
        }

        const { allowed, hoursLeft } = canRenew(keyRow.last_renewed_at);
        if (!allowed) {
          await sendMessage(chatId, `You can renew your key in <b>${hoursLeft} hours</b>.`);
          return json({ ok: true });
        }

        const newKey = generateKey("um");
        const newExpiry = keyRow.expires_at ? new Date(Date.now() + 7 * 86400000).toISOString() : null;

        await supabase.from("api_keys").update({ is_active: false }).eq("api_key", keyRow.api_key);
        await supabase.from("api_keys").insert({
          name: keyRow.name,
          api_key: newKey,
          plan: keyRow.plan,
          is_owner: keyRow.is_owner,
          monthly_quota: keyRow.monthly_quota,
          expires_at: newExpiry,
          contact_info: keyRow.contact_info,
          telegram_user_id: userId,
          last_renewed_at: new Date().toISOString(),
          requests_used: 0,
        });

        await supabase
          .from("telegram_api_users")
          .update({ api_key: newKey, updated_at: new Date().toISOString() })
          .eq("telegram_user_id", userId);

        await sendMessage(
          chatId,
          `Key renewed!\n\nNew key:\n<code>${newKey}</code>\n\nPlan: ${keyRow.plan}\nNext renewal in 24 hours.`,
        );
        return json({ ok: true });
      }

      // /usage command
      if (text.startsWith("/usage")) {
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        if (!tgUser?.api_key) {
          await sendMessage(chatId, "No API key. Use /start to generate one.");
          return json({ ok: true });
        }

        const { data: keyRow } = await supabase
          .from("api_keys")
          .select("*")
          .eq("api_key", tgUser.api_key)
          .maybeSingle();

        const { data: logs } = await supabase
          .from("api_request_logs")
          .select("endpoint, status, created_at")
          .eq("api_key", tgUser.api_key)
          .order("created_at", { ascending: false })
          .limit(10);

        let text2 = keyRow ? formatUsage(keyRow) : "Key not found.";
        if (logs && logs.length > 0) {
          text2 += "\n\n<b>Recent Requests:</b>\n";
          for (const l of logs) {
            const t = new Date(l.created_at).toLocaleTimeString("en-GB");
            text2 += `${t}  /${l.endpoint}  ${l.status}\n`;
          }
        }
        await sendMessage(chatId, text2);
        return json({ ok: true });
      }

      // /getplaypy command
      if (text.startsWith("/getplaypy")) {
        const { data: tgUser } = await supabase
          .from("telegram_api_users")
          .select("api_key")
          .eq("telegram_user_id", userId)
          .maybeSingle();

        const key = tgUser?.api_key || "YOUR_API_KEY_HERE";
        const playCode = generatePlayPy(key);

        // Send in chunks (Telegram 4096 char limit)
        const chunks = [];
        for (let i = 0; i < playCode.length; i += 3500) {
          chunks.push(playCode.slice(i, i + 3500));
        }
        for (let i = 0; i < chunks.length; i++) {
          await sendMessage(
            chatId,
            `<b>play.py</b> (${i + 1}/${chunks.length})\n\n<pre>${chunks[i]}</pre>`,
          );
        }
        return json({ ok: true });
      }

      // /help command
      if (text.startsWith("/help")) {
        await sendMessage(
          chatId,
          `<b>UpperMoon Tunes API Bot Commands</b>\n\n` +
            `/start - Welcome & main menu\n` +
            `/mykey - View your current API key\n` +
            `/renew - Renew your API key (once/24h)\n` +
            `/usage - View API usage stats\n` +
            `/getplaypy - Get play.py integration code\n` +
            `/help - This message\n\n` +
            `<b>API Base URL:</b>\n<code>${apiBase}</code>\n\n` +
            `<b>Endpoints:</b>\n` +
            `GET /search?q=query\n` +
            `GET /shorts?q=query\n` +
            `GET /play?q=query\n` +
            `GET /nowplaying\n` +
            `POST /nowplaying`,
        );
        return json({ ok: true });
      }
    }
  } catch (e: any) {
    console.error("snowy-bot error:", e);
    return json({ error: e?.message }, 500);
  }

  return json({ ok: true });
});
