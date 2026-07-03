## Goal
Three deliverables:
1. Friendly microphone-permission handling in Community voice chat.
2. Google sign-in on `/auth` (managed by Lovable Cloud, alongside email/password).
3. A Telegram-inspired **BotFather** system with two bot types:
   - **In-app bots** that live in Community rooms (commands, buttons, AI replies, music).
   - **Telegram bot clones** where a user pastes their own Telegram bot token and it's registered with our existing worker (extends `bot_clones`).

---

## 1. Microphone permission fix

Files: `src/hooks/useVoiceRoom.ts`, `src/components/Community/VoiceBar.tsx`, new `src/components/Community/MicPermissionDialog.tsx`.

- Wrap `navigator.mediaDevices.getUserMedia({ audio: true })` in a try/catch inside `useVoiceRoom`.
- On `NotAllowedError` / `PermissionDeniedError`: return a typed error, do NOT auto-request.
- `VoiceBar` catches it and opens `MicPermissionDialog` with:
  - Icon + heading "Microphone access needed"
  - Browser-specific hint ("Click the 🔒 icon in the address bar → Site settings → Microphone → Allow")
  - "Try again" button that re-invokes join
  - "Cancel" button
- Also handle `NotFoundError` (no mic) and `NotReadableError` (mic in use) with distinct messages.

## 2. Google sign-in

Files: `src/pages/Auth.tsx` (edit).

- Use `configure_social_auth` tool to enable `google` (Lovable Cloud managed — no keys needed).
- Add "Continue with Google" button on the Auth page using `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` from `@/integrations/lovable`.
- Keep existing email/password flow.
- `profiles` trigger `handle_new_user` already reads `raw_user_meta_data->>'avatar_url'` and `full_name`, so Google avatars/names populate automatically.

## 3. BotFather system

### 3a. Database (single migration)

New tables:

**`bots`** — user-created in-app bots
- `id`, `owner_id → auth.users`, `username` (unique, `@name` style), `display_name`, `description`, `avatar_url`, `bot_type` enum(`in_app`, `telegram_clone`), `is_active`, `ai_enabled` bool, `ai_persona` text, `created_at`, `updated_at`.

**`bot_commands`** — command/response pairs
- `id`, `bot_id`, `command` (e.g. `/help`), `response_text`, `response_kind` enum(`static`, `music_play`, `music_queue`, `ai`), `buttons` jsonb (array of `{label, payload}` for inline keyboards), `sort_order`.

**`bot_room_installs`** — which bots are added to which Community rooms
- `id`, `bot_id`, `room_id → chat_rooms`, `installed_by`, `installed_at`.

**`bot_telegram_configs`** — links a `bots` row of type `telegram_clone` to a `bot_clones` worker row
- `id`, `bot_id` (unique), `clone_id → bot_clones.id`, `phone_string_session` (nullable, for VC assistant).

Extend **`chat_messages`**:
- `sender_kind` enum(`user`, `bot`) default `user`.
- `bot_id` nullable → `bots.id`.
- `buttons` jsonb nullable.
- `reply_to_message_id` nullable self-FK.

GRANTs on every new table; RLS:
- Anyone authenticated can read active bots.
- Only `owner_id` can update/delete their bot & commands.
- Installs readable to room members (uses existing `is_room_member`), insertable by room admins.
- `bot_telegram_configs` owner-scoped.

### 3b. BotFather UI (in-app command interface)

New page: `src/pages/BotFather.tsx` at `/botfather`.

Mimics Telegram's BotFather with a chat-like command list on the left, a working panel on the right. Supported commands:
- `/newbot` → wizard: choose type (In-app / Telegram clone) → name → username → (if Telegram, request token via existing add_secret-like flow that stores in `bot_clones` + optional string session).
- `/mybots` → list all bots the user owns; select one to open its settings.
- `/setname`, `/setdescription`, `/setuserpic` (avatar upload to existing `avatars` bucket).
- `/setcommands` → visual editor: add command, response type dropdown (Static / Music /play / Music /queue / AI reply), inline-keyboard button rows editor.
- `/setai` → toggle AI-powered replies + persona textarea.
- `/deletebot` with confirm dialog.
- `/addtogroup` → pick a Community room the user belongs to, install the bot.

Uses shadcn `Command`, `Dialog`, `Tabs`, `Form`.

### 3c. Bot runtime in Community

Files: `src/pages/Community.tsx` (edit), new `src/lib/bots.ts`, new `supabase/functions/bot-dispatch/index.ts`.

- When a message is sent starting with `/`, client publishes it to `chat_messages` as usual (unchanged).
- A new edge function `bot-dispatch` is invoked (Realtime trigger via `supabase.functions.invoke` from the sender) with `{ room_id, message_id, text }`.
- Function:
  1. Loads installed bots for the room.
  2. Matches command prefix per bot; ignores unmatched.
  3. Resolves response:
     - `static` → inserts a `chat_messages` row with `sender_kind='bot'`, `bot_id`, `buttons` from command row.
     - `music_play` / `music_queue` → inserts a bot message like "Now playing …" and publishes a Postgres NOTIFY-style row into `now_playing` (already exists) — client picks it up.
     - `ai` → calls Lovable AI (`google/gemini-3-flash-preview`) with the bot's persona as system prompt and the message text; inserts reply.
- Messages with `sender_kind='bot'` render with the bot's avatar + name + a small "BOT" badge. Buttons render as clickable pills; clicking sends a new user message `/<command> <payload>` back to dispatch.

### 3d. Telegram clone integration

- Reuses existing `bot_clones` table + worker.
- Creating a `telegram_clone` bot in BotFather:
  - Asks for bot token (via `add_secret`-style form).
  - Inserts a row into `bot_clones` (assistant string session optional, stored per existing pattern) and a row into `bots` + `bot_telegram_configs` linking them.
  - Owner can toggle active, rotate token, delete.
- No new worker code required — worker already reads `bot_clones` on heartbeat.

### 3e. Sidebar entry

- Add "BotFather" link in `src/components/Layout/Sidebar.tsx` (Bot icon from lucide) that navigates to `/botfather`. Requires auth (redirects to `/auth`).

---

## Out of scope
- No inline keyboards on Telegram-clone messages (handled by user's own bot code on VPS).
- No cross-user bot marketplace / discovery; users install bots they own or that are public via direct link (`/botfather?add=@botname`) — later.
- No slash-command autocomplete popup — plain text parsing for v1.

## Rollout order
1. Migration for bot tables + chat_messages extension.
2. Google OAuth + Auth page button.
3. Mic permission dialog.
4. BotFather page + bot CRUD.
5. Community bot rendering + `bot-dispatch` edge function.
6. Telegram-clone token registration flow.
