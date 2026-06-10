"""
UpperMoon Tunes — Bot Worker
============================
Single file that:
  • Polls https://<your-site>/functions/v1/bot-api/clones every 20s
  • Spawns a Pyrogram Bot + Userbot (assistant) per clone
  • Joins Telegram Voice Chats via PyTgCalls
  • Streams YouTube audio via yt-dlp
  • Sends rich /start, log messages, now-playing cards with inline buttons
  • Auto-(re)starts when website adds/removes a clone

Run on your VPS alongside the website (systemd unit recommended).

ENV (.env next to this file or system env):
  WEBSITE_BASE_URL   e.g. https://ydvaruzgftvizgymwalw.supabase.co/functions/v1/bot-api
  OWNER_API_KEY      Owner API key from Developer Portal (umowner_...)
  API_ID             my.telegram.org App API ID
  API_HASH           my.telegram.org App API Hash
  POLL_INTERVAL      seconds between clone polls (default 20)
"""

import asyncio
import logging
import os
import re
import signal
import sys
import tempfile
import contextlib
from typing import Dict, Optional

import aiohttp
from dotenv import load_dotenv
from pyrogram import Client, filters, idle
from pyrogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    CallbackQuery,
)
from pyrogram.enums import ChatType
from pytgcalls import PyTgCalls
from pytgcalls.types import MediaStream, AudioQuality
from pytgcalls.exceptions import NoActiveGroupCall
import yt_dlp

# ---------------- config ----------------
load_dotenv()
WEBSITE = os.getenv("WEBSITE_BASE_URL", "").rstrip("/")
OWNER_KEY = os.getenv("OWNER_API_KEY", "")
API_ID = int(os.getenv("API_ID", "0") or 0)
API_HASH = os.getenv("API_HASH", "")
POLL = int(os.getenv("POLL_INTERVAL", "5"))

if not (WEBSITE and OWNER_KEY and API_ID and API_HASH):
    print("[FATAL] WEBSITE_BASE_URL, OWNER_API_KEY, API_ID, API_HASH required in .env")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("bot-worker")

SESSION_DIR = os.path.join(tempfile.gettempdir(), "uppermoon_sessions")
os.makedirs(SESSION_DIR, exist_ok=True)

YDL_OPTS = {
    "format": "bestaudio/best",
    "noplaylist": True,
    "quiet": True,
    "no_warnings": True,
    "default_search": "ytsearch1",
    "geo_bypass": True,
    "source_address": "0.0.0.0",
}

START_IMG = "https://envs.sh/CSn.jpg"  # banner image (replaceable)


# ---------------- helpers ----------------
async def api_get(session: aiohttp.ClientSession, path: str):
    async with session.get(
        f"{WEBSITE}{path}",
        headers={"X-API-Key": OWNER_KEY},
        timeout=aiohttp.ClientTimeout(total=20),
    ) as r:
        return await r.json()


async def api_post(session: aiohttp.ClientSession, path: str, body: dict):
    async with session.post(
        f"{WEBSITE}{path}",
        headers={"X-API-Key": OWNER_KEY, "Content-Type": "application/json"},
        json=body,
        timeout=aiohttp.ClientTimeout(total=20),
    ) as r:
        return await r.json()


async def patch_playback_job(
    session: aiohttp.ClientSession,
    job_id: str,
    clone_id: str,
    status: str,
    error: Optional[str] = None,
):
    return await api_post(session, "/playback-jobs", {
        "action": "complete",
        "job_id": job_id,
        "clone_id": clone_id,
        "status": status,
        "error": error,
    })


def fmt_duration(sec: int) -> str:
    sec = int(sec or 0)
    return f"{sec // 60}:{sec % 60:02d}"


def yt_extract(query: str) -> Optional[dict]:
    """Run yt-dlp in a thread-safe way to extract a streamable URL."""
    try:
        with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
            info = ydl.extract_info(query, download=False)
            if "entries" in info:
                info = info["entries"][0]
            return {
                "title": info.get("title"),
                "uploader": info.get("uploader"),
                "duration": info.get("duration") or 0,
                "thumbnail": info.get("thumbnail"),
                "webpage_url": info.get("webpage_url"),
                "stream_url": info["url"],
                "video_id": info.get("id"),
            }
    except Exception as e:
        log.error("yt-dlp error: %s", e)
        return None


# ---------------- Clone instance ----------------
class Clone:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.id = cfg["id"]
        self.name = cfg.get("name") or "Clone"
        self.log_chat = int(cfg["logger_chat_id"])
        self.notes = cfg.get("notes") or ""
        self.webhook_only = "external-webhook" in self.notes.lower()
        self.bot: Optional[Client] = None
        self.assistant: Optional[Client] = None
        self.calls: Optional[PyTgCalls] = None
        self.queues: Dict[int, list] = {}      # chat_id -> [tracks]
        self.now: Dict[int, dict] = {}          # chat_id -> current track
        self._stopped = False
        self._job_task: Optional[asyncio.Task] = None

    async def _bot_api(self, method: str, payload: dict):
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"https://api.telegram.org/bot{self.cfg['bot_token']}/{method}",
                json=payload,
                timeout=aiohttp.ClientTimeout(total=20),
            ) as response:
                data = await response.json(content_type=None)
                if not data.get("ok"):
                    raise RuntimeError(data.get("description") or f"Telegram API {method} failed")
                return data.get("result")

    async def _send_message(self, chat_id: int, text: str, **extra):
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "html", **extra}
        if self.bot and not self.webhook_only:
            return await self.bot.send_message(chat_id, text, parse_mode="html", **extra)
        result = await self._bot_api("sendMessage", payload)
        return {"chat_id": chat_id, "message_id": result["message_id"]}

    async def _send_photo(self, chat_id: int, photo: str, caption: str, **extra):
        if self.bot and not self.webhook_only:
            return await self.bot.send_photo(chat_id, photo, caption=caption, parse_mode="html", **extra)
        payload = {
            "chat_id": chat_id,
            "photo": photo,
            "caption": caption,
            "parse_mode": "html",
            **extra,
        }
        result = await self._bot_api("sendPhoto", payload)
        return {"chat_id": chat_id, "message_id": result["message_id"]}

    async def _edit_message(self, status, text: str):
        if hasattr(status, "edit"):
            return await status.edit(text, parse_mode="html")
        return await self._bot_api("editMessageText", {
            "chat_id": status["chat_id"],
            "message_id": status["message_id"],
            "text": text,
            "parse_mode": "html",
            "disable_web_page_preview": True,
        })

    async def _delete_message(self, status):
        if hasattr(status, "delete"):
            return await status.delete()
        return await self._bot_api("deleteMessage", {
            "chat_id": status["chat_id"],
            "message_id": status["message_id"],
        })

    async def _export_invite_link(self, chat_id: int) -> str:
        if self.bot and not self.webhook_only:
            return await self.bot.export_chat_invite_link(chat_id)
        return await self._bot_api("exportChatInviteLink", {"chat_id": chat_id})

    # ----- lifecycle -----
    async def start(self):
        bot_name = f"bot_{self.id}"
        ass_name = f"ass_{self.id}"

        if not self.webhook_only:
            self.bot = Client(
                name=bot_name,
                api_id=API_ID,
                api_hash=API_HASH,
                bot_token=self.cfg["bot_token"],
                workdir=SESSION_DIR,
                in_memory=False,
            )
        self.assistant = Client(
            name=ass_name,
            api_id=int(self.cfg.get("api_id") or API_ID),
            api_hash=self.cfg.get("api_hash") or API_HASH,
            session_string=self.cfg["assistant_string_session"],
            workdir=SESSION_DIR,
            in_memory=True,
        )

        if self.bot:
            self._register_handlers()
            await self.bot.start()
        await self.assistant.start()

        self.calls = PyTgCalls(self.assistant)
        await self.calls.start()
        self._register_calls_handlers()
        self._job_task = asyncio.create_task(self._playback_job_loop())

        # Notify log group from BOTH bot and assistant
        try:
            me_ass = await self.assistant.get_me()
            me_bot = await self.bot.get_me() if self.bot else None
            txt_bot = (
                f"🚀 <b>{self.name}</b> is now <b>online</b>!\n\n"
                f"🤖 Bot: @{me_bot.username if me_bot else 'Snowy'}\n"
                f"🎧 Assistant: <a href='tg://user?id={me_ass.id}'>{me_ass.first_name}</a>\n"
                f"🌐 Hosted via <b>UpperMoon Tunes</b> website"
            )
            await self._send_photo(
                self.log_chat, START_IMG, caption=txt_bot, parse_mode="html"
            )
            await self.assistant.send_message(
                self.log_chat,
                f"✅ Assistant <b>{me_ass.first_name}</b> connected and ready for VC.",
                parse_mode="html",
            )
        except Exception as e:
            log.warning("[%s] log group notify failed: %s", self.id, e)

        log.info("[%s] clone started ✓", self.id)

    async def _ensure_assistant_in_chat(self, chat_id: int):
        try:
            await self.assistant.get_chat(chat_id)
            return
        except Exception:
            pass

        try:
            invite = await self._export_invite_link(chat_id)
            await self.assistant.join_chat(invite)
        except Exception as e:
            raise RuntimeError(
                "Assistant could not join the group. Add the assistant account to the group and allow it in voice chat first. "
                f"({e})"
            )

    async def _playback_job_loop(self):
        while not self._stopped:
            try:
                async with aiohttp.ClientSession() as session:
                    data = await api_get(session, f"/playback-jobs?clone_id={self.id}&limit=5")
                    jobs = data.get("jobs", []) or []
                    for job in jobs:
                        claim = await api_post(session, "/playback-jobs", {
                            "action": "claim",
                            "job_id": job["id"],
                            "clone_id": self.id,
                        })
                        claimed = claim.get("job")
                        if not claim.get("claimed") or not claimed:
                            continue
                        await self._handle_playback_job(session, claimed)
            except asyncio.CancelledError:
                raise
            except Exception as e:
                log.warning("[%s] playback job loop error: %s", self.id, e)

            await asyncio.sleep(2)

    async def _handle_playback_job(self, session: aiohttp.ClientSession, job: dict):
        chat_id = int(job["chat_id"])
        query = job["query"]
        requester = job.get("requested_by") or "Guest"

        try:
            await self._ensure_assistant_in_chat(chat_id)

            loop = asyncio.get_event_loop()
            resolved = await loop.run_in_executor(None, yt_extract, query)
            if not resolved:
                raise RuntimeError("Couldn't fetch that track.")

            track = {**resolved, "requested_by": requester}
            if chat_id in self.now:
                self.queues.setdefault(chat_id, []).append(track)
                await patch_playback_job(session, job["id"], self.id, "queued")
                try:
                    await self._send_message(
                        chat_id,
                        f"➕ Added to queue: <b>{track['title']}</b>",
                    )
                except Exception:
                    pass
                return

            status = await self._send_message(
                chat_id,
                "🎧 Assistant is joining voice chat…",
            )
            started = await self._start_stream(chat_id, track, status)
            if not started:
                raise RuntimeError("Assistant could not start playback in voice chat.")
            await patch_playback_job(session, job["id"], self.id, "completed")
        except Exception as e:
            log.error("[%s] playback job failed %s: %s", self.id, job.get("id"), e)
            await patch_playback_job(session, job["id"], self.id, "failed", str(e))
            try:
                await self._send_message(chat_id, f"❌ {e}")
            except Exception:
                pass

    async def stop(self):
        self._stopped = True
        if self._job_task:
            self._job_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._job_task
        try:
            if self.calls:
                await self.calls.stop()
        except Exception:
            pass
        for c in (self.bot, self.assistant):
            try:
                if c and c.is_connected:
                    await c.stop()
            except Exception:
                pass
        log.info("[%s] clone stopped", self.id)

    async def heartbeat(self, session: aiohttp.ClientSession):
        try:
            await api_post(session, "/clones", {"heartbeat": True, "clone_id": self.id})
        except Exception:
            pass

    # ----- handlers -----
    def _register_handlers(self):
        bot = self.bot

        @bot.on_message(filters.command("start"))
        async def _start(_, m: Message):
            me = await bot.get_me()
            kb = InlineKeyboardMarkup(
                [
                    [
                        InlineKeyboardButton("➕ Add me to your group",
                                             url=f"https://t.me/{me.username}?startgroup=true"),
                    ],
                    [
                        InlineKeyboardButton("🎵 Commands", callback_data="help"),
                        InlineKeyboardButton("🌐 Website",
                                             url="https://uppermoon-tunes.lovable.app"),
                    ],
                ]
            )
            await m.reply_photo(
                START_IMG,
                caption=(
                    f"👋 Hey <b>{m.from_user.first_name}</b>!\n\n"
                    f"I'm <b>{me.first_name}</b> — your music companion for voice chats.\n"
                    f"Hosted on <b>UpperMoon Tunes</b>.\n\n"
                    f"Use <code>/play song name</code> in a group VC to start jamming."
                ),
                reply_markup=kb,
                parse_mode="html",
            )

        @bot.on_message(filters.command("help"))
        async def _help(_, m: Message):
            await m.reply(self._help_text(), parse_mode="html",
                          disable_web_page_preview=True)

        @bot.on_message(filters.command(["ping", "alive"]))
        async def _ping(_, m: Message):
            await m.reply("🏓 <b>Alive</b> — streaming on UpperMoon.", parse_mode="html")

        @bot.on_message(filters.command("play") & filters.group)
        async def _play(_, m: Message):
            await self.cmd_play(m)

        @bot.on_message(filters.command(["pause"]) & filters.group)
        async def _pause(_, m: Message):
            try:
                await self.calls.pause(m.chat.id)
                await m.reply("⏸ Paused.")
            except Exception as e:
                await m.reply(f"❌ {e}")

        @bot.on_message(filters.command(["resume"]) & filters.group)
        async def _resume(_, m: Message):
            try:
                await self.calls.resume(m.chat.id)
                await m.reply("▶️ Resumed.")
            except Exception as e:
                await m.reply(f"❌ {e}")

        @bot.on_message(filters.command(["skip", "next"]) & filters.group)
        async def _skip(_, m: Message):
            await self.next_in_queue(m.chat.id, m)

        @bot.on_message(filters.command(["stop", "end"]) & filters.group)
        async def _stop(_, m: Message):
            self.queues.pop(m.chat.id, None)
            self.now.pop(m.chat.id, None)
            try:
                await self.calls.leave_call(m.chat.id)
            except Exception:
                pass
            await m.reply("⏹ Stopped & left VC.")

        @bot.on_message(filters.command("queue") & filters.group)
        async def _queue(_, m: Message):
            q = self.queues.get(m.chat.id, [])
            if not q:
                return await m.reply("📭 Queue empty.")
            txt = "🎶 <b>Up Next</b>\n" + "\n".join(
                [f"{i+1}. {t['title']}" for i, t in enumerate(q[:10])]
            )
            await m.reply(txt, parse_mode="html")

        # ----- group management -----
        @bot.on_message(filters.command("ban") & filters.group)
        async def _ban(_, m: Message):
            if not m.reply_to_message:
                return await m.reply("Reply to a user.")
            await bot.ban_chat_member(m.chat.id, m.reply_to_message.from_user.id)
            await m.reply("🔨 Banned.")

        @bot.on_message(filters.command("unban") & filters.group)
        async def _unban(_, m: Message):
            if not m.reply_to_message:
                return await m.reply("Reply to a user.")
            await bot.unban_chat_member(m.chat.id, m.reply_to_message.from_user.id)
            await m.reply("✅ Unbanned.")

        @bot.on_message(filters.command(["mute"]) & filters.group)
        async def _mute(_, m: Message):
            if not m.reply_to_message:
                return await m.reply("Reply to a user.")
            from pyrogram.types import ChatPermissions
            await bot.restrict_chat_member(
                m.chat.id, m.reply_to_message.from_user.id, ChatPermissions()
            )
            await m.reply("🔇 Muted.")

        @bot.on_message(filters.command(["unmute"]) & filters.group)
        async def _unmute(_, m: Message):
            if not m.reply_to_message:
                return await m.reply("Reply to a user.")
            from pyrogram.types import ChatPermissions
            await bot.restrict_chat_member(
                m.chat.id, m.reply_to_message.from_user.id,
                ChatPermissions(
                    can_send_messages=True, can_send_media_messages=True,
                    can_send_other_messages=True, can_add_web_page_previews=True,
                ),
            )
            await m.reply("🔊 Unmuted.")

        # ----- callback buttons -----
        @bot.on_callback_query()
        async def _cb(_, c: CallbackQuery):
            data = c.data
            chat_id = c.message.chat.id if c.message else None
            try:
                if data == "help":
                    await c.message.reply(self._help_text(), parse_mode="html")
                elif data == "pause" and chat_id:
                    await self.calls.pause(chat_id); await c.answer("Paused")
                elif data == "resume" and chat_id:
                    await self.calls.resume(chat_id); await c.answer("Resumed")
                elif data == "skip" and chat_id:
                    await c.answer("Skipping...")
                    await self.next_in_queue(chat_id, c.message)
                elif data == "close":
                    await c.message.delete(); await c.answer()
                else:
                    await c.answer()
            except Exception as e:
                await c.answer(str(e)[:180], show_alert=True)

    def _help_text(self) -> str:
        return (
            "<b>🎵 UpperMoon Music Commands</b>\n\n"
            "<b>Playback</b>\n"
            "• <code>/play &lt;song&gt;</code> — play in VC\n"
            "• <code>/pause</code> · <code>/resume</code> · <code>/skip</code> · <code>/stop</code>\n"
            "• <code>/queue</code> — show upcoming\n\n"
            "<b>Utility</b>\n"
            "• <code>/ping</code> · <code>/alive</code>\n\n"
            "<b>Group Admin</b>\n"
            "• <code>/ban</code> · <code>/unban</code> · <code>/mute</code> · <code>/unmute</code>"
        )

    # ----- play logic -----
    async def cmd_play(self, m: Message):
        if len(m.command) < 2:
            return await m.reply("Usage: <code>/play song name</code>", parse_mode="html")
        query = m.text.split(None, 1)[1]
        status = await m.reply("🔎 Searching…")

        # 1. Ask website for metadata (uses YouTube key pool)
        info = None
        try:
            async with aiohttp.ClientSession() as s:
                data = await api_get(
                    s, f"/play?q={aiohttp.helpers.quote(query, safe='')}"
                )
                if data.get("ok") and data.get("track"):
                    t = data["track"]
                    info = {
                        "title": t["title"],
                        "uploader": t.get("artist") or t.get("channel"),
                        "duration": t.get("duration") or 0,
                        "thumbnail": t.get("thumbnail"),
                        "webpage_url": t["youtube_url"],
                        "video_id": t["video_id"],
                    }
        except Exception as e:
            log.warning("website /play failed: %s", e)

        # 2. yt-dlp to resolve streamable URL (always needed)
        loop = asyncio.get_event_loop()
        resolved = await loop.run_in_executor(
            None, yt_extract, info["webpage_url"] if info else query
        )
        if not resolved:
            return await status.edit("❌ Couldn't fetch that track.")
        if info:
            resolved.update({k: v for k, v in info.items() if v})

        # 3. Queue or play
        chat_id = m.chat.id
        track = {**resolved, "requested_by": m.from_user.first_name}
        if chat_id in self.now:
            self.queues.setdefault(chat_id, []).append(track)
            return await status.edit(
                f"➕ Added to queue: <b>{track['title']}</b>", parse_mode="html"
            )

        await self._start_stream(chat_id, track, status)

    async def _start_stream(self, chat_id: int, track: dict, status: Message):
        try:
            await self._ensure_assistant_in_chat(chat_id)
            await self.calls.play(
                chat_id,
                MediaStream(track["stream_url"], audio_flags=MediaStream.IGNORE),
            )
        except NoActiveGroupCall:
            await status.edit(
                "⚠️ No active voice chat. Start one and try again."
            )
            return False
        except Exception as e:
            await status.edit(f"❌ Stream error: <code>{e}</code>",
                              parse_mode="html")
            return False

        self.now[chat_id] = track
        try: await status.delete()
        except Exception: pass
        await self._send_now_card(chat_id, track)

        # Mirror to logger group + website
        asyncio.create_task(self._log_play(chat_id, track))
        asyncio.create_task(self._sync_now(track))
        return True

    async def _send_now_card(self, chat_id: int, t: dict):
        kb = InlineKeyboardMarkup(
            [
                [
                    InlineKeyboardButton("⏸ Pause", callback_data="pause"),
                    InlineKeyboardButton("▶️ Resume", callback_data="resume"),
                    InlineKeyboardButton("⏭ Skip", callback_data="skip"),
                ],
                [InlineKeyboardButton("✖ Close", callback_data="close")],
            ]
        )
        cap = (
            f"🎶 <b>Now Playing</b>\n\n"
            f"🎵 <b>{t['title']}</b>\n"
            f"👤 {t.get('uploader') or 'Unknown'}\n"
            f"⏱ {fmt_duration(t.get('duration'))}\n"
            f"🙋 Requested by: {t.get('requested_by','?')}"
        )
        try:
            await self.bot.send_photo(chat_id, t.get("thumbnail") or START_IMG,
                                      caption=cap, reply_markup=kb, parse_mode="html")
        except Exception:
            await self.bot.send_message(chat_id, cap, reply_markup=kb,
                                        parse_mode="html")

    async def _log_play(self, chat_id: int, t: dict):
        """Send a per-play notification to the clone's logger chat."""
        try:
            chat = await self.bot.get_chat(chat_id)
            cap = (
                f"🎶 <b>New Play</b>\n\n"
                f"🎵 <b>{t['title']}</b>\n"
                f"👤 {t.get('uploader') or 'Unknown'}\n"
                f"⏱ {fmt_duration(t.get('duration'))}\n"
                f"💬 Chat: <b>{getattr(chat, 'title', chat_id)}</b> (<code>{chat_id}</code>)\n"
                f"🙋 By: {t.get('requested_by', '?')}"
            )
            try:
                await self.bot.send_photo(
                    self.log_chat, t.get("thumbnail") or START_IMG,
                    caption=cap, parse_mode="html",
                )
            except Exception:
                await self.bot.send_message(self.log_chat, cap, parse_mode="html")
        except Exception as e:
            log.warning("[%s] log_play failed: %s", self.id, e)

    def _register_calls_handlers(self):
        """Auto-advance the queue when PyTgCalls finishes a stream."""
        try:
            from pytgcalls.types import Update
            from pytgcalls.types.stream import StreamAudioEnded
        except Exception:
            StreamAudioEnded = None

        calls = self.calls

        @calls.on_update()
        async def _on_update(_, update):
            try:
                if StreamAudioEnded and isinstance(update, StreamAudioEnded):
                    chat_id = update.chat_id
                    q = self.queues.get(chat_id, [])
                    if q:
                        nxt = q.pop(0)
                        self.now[chat_id] = nxt
                        try:
                            await calls.play(
                                chat_id,
                                MediaStream(nxt["stream_url"], audio_flags=MediaStream.IGNORE),
                            )
                            await self._send_now_card(chat_id, nxt)
                            asyncio.create_task(self._log_play(chat_id, nxt))
                            asyncio.create_task(self._sync_now(nxt))
                        except Exception as e:
                            log.error("[%s] auto-next failed: %s", self.id, e)
                    else:
                        self.now.pop(chat_id, None)
                        try: await calls.leave_call(chat_id)
                        except Exception: pass
                        try:
                            await self.bot.send_message(chat_id, "📭 Queue ended. Left VC.")
                        except Exception: pass
            except Exception as e:
                log.warning("[%s] update handler err: %s", self.id, e)

    async def _sync_now(self, t: dict):
        try:
            async with aiohttp.ClientSession() as s:
                await api_post(s, "/nowplaying", {
                    "title": t["title"],
                    "artist": t.get("uploader"),
                    "cover": t.get("thumbnail"),
                    "video_id": t.get("video_id"),
                    "duration": int(t.get("duration") or 0),
                    "position": 0,
                    "is_playing": True,
                })
        except Exception:
            pass

    async def next_in_queue(self, chat_id: int, m: Message):
        q = self.queues.get(chat_id, [])
        if not q:
            self.now.pop(chat_id, None)
            try: await self.calls.leave_call(chat_id)
            except Exception: pass
            return await m.reply("📭 Queue ended. Left VC.")
        nxt = q.pop(0)
        status = await m.reply("⏭ Loading next…")
        await self._start_stream(chat_id, nxt, status)


# ---------------- Supervisor ----------------
class Supervisor:
    def __init__(self):
        self.clones: Dict[str, Clone] = {}
        self._stop = asyncio.Event()

    async def loop(self):
        async with aiohttp.ClientSession() as session:
            while not self._stop.is_set():
                try:
                    data = await api_get(session, "/clones")
                    active = {c["id"]: c for c in data.get("clones", [])
                              if c.get("is_active")}

                    # start new
                    for cid, cfg in active.items():
                        if cid not in self.clones:
                            log.info("Starting new clone %s (%s)", cid, cfg.get("name"))
                            clone = Clone(cfg)
                            try:
                                await clone.start()
                                self.clones[cid] = clone
                            except Exception as e:
                                log.error("Failed to start %s: %s", cid, e)

                    # stop removed/disabled
                    for cid in list(self.clones.keys()):
                        if cid not in active:
                            log.info("Stopping removed clone %s", cid)
                            await self.clones[cid].stop()
                            self.clones.pop(cid, None)

                    # heartbeats
                    for clone in self.clones.values():
                        await clone.heartbeat(session)

                except Exception as e:
                    log.error("Supervisor poll error: %s", e)

                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=POLL)
                except asyncio.TimeoutError:
                    pass

    async def shutdown(self):
        log.info("Shutting down…")
        self._stop.set()
        await asyncio.gather(*(c.stop() for c in self.clones.values()),
                             return_exceptions=True)


async def main():
    sup = Supervisor()

    def _sig(*_):
        asyncio.create_task(sup.shutdown())

    for s in (signal.SIGINT, signal.SIGTERM):
        try: signal.signal(s, _sig)
        except Exception: pass

    log.info("UpperMoon bot worker starting — polling %s every %ss", WEBSITE, POLL)
    await sup.loop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
