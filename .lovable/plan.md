# Community Overhaul Plan

Build a Telegram-style community section with proper auth, group management, admin roles, bans, and live in-browser voice chat.

## 1. Authentication (prerequisite)
- Add Email/Password + Google sign-in using Lovable Cloud managed OAuth.
- New `/auth` page (sign in / sign up tabs) + `/reset-password` page.
- `useAuth` hook with `onAuthStateChange` listener.
- Profiles auto-created via existing `handle_new_user` trigger (already present).
- Community routes require sign-in; show a "Sign in to join the community" gate for guests.
- Header chip in Sidebar showing avatar + sign out.

## 2. Database (migrations)
New tables (all with GRANTs + RLS + policies):

- `app_role` enum: `owner`, `admin`, `member`
- `chat_rooms` (extend existing): add `owner_id`, `is_private`, `avatar_url`, `created_at`
- `room_members` (user_id, room_id, role, joined_at, muted) — unique(user_id, room_id)
- `room_bans` (room_id, user_id, banned_by, reason, created_at)
- `voice_participants` (room_id, user_id, joined_at, is_speaking, is_muted) — ephemeral presence
- `voice_signals` (from_user, to_user, room_id, payload jsonb, created_at) — WebRTC offer/answer/ICE relay, auto-cleaned

Security-definer helpers:
- `is_room_member(_uid, _room)`, `is_room_admin(_uid, _room)`, `is_banned(_uid, _room)`

Realtime: enable on `chat_messages`, `room_members`, `voice_participants`, `voice_signals`.

## 3. Group management UI (`/community`)
Telegram-like 3-column layout:

```
┌─────────┬───────────────────┬──────────┐
│ Rooms   │ Active room       │ Members  │
│ + New   │ - voice bar (top) │ + admins │
│ list    │ - messages        │ + actions│
│         │ - composer        │          │
└─────────┴───────────────────┴──────────┘
```

- **Rooms panel**: search, "+ New Group" dialog (name, description, genre, private toggle), shows joined rooms + public discovery. Owner can delete from context menu.
- **Members panel**: avatar list with role badges; owner/admin can promote/demote/kick/ban via dropdown. Banned users panel toggle.
- **Chat area**: same realtime messages as today but scoped to membership; show member name (joined to profiles).

## 4. Live voice chat (WebRTC mesh, in-browser)
Separate from Telegram VC. Pure browser-to-browser audio via WebRTC, signaling through Supabase realtime.

- "Join Voice" button at top of active room.
- On join: insert `voice_participants` row, request mic, create `RTCPeerConnection` per existing participant, exchange offers/answers/ICE through `voice_signals` table (insert + realtime subscribe + delete after consume).
- Floating voice bar shows speaking avatars (Web Audio level meter → `is_speaking`), mute, leave.
- Cleanup on unmount / tab close (`beforeunload` + presence heartbeat; rows older than 60s pruned client-side on read).
- Mesh is fine for small rooms (<=8). Show notice if room is larger.

## 5. Files (new / changed)
New:
- `supabase/migrations/<ts>_community.sql`
- `src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`
- `src/hooks/useAuth.tsx`
- `src/hooks/useVoiceRoom.ts` (WebRTC mesh)
- `src/components/Community/RoomsList.tsx`
- `src/components/Community/MembersPanel.tsx`
- `src/components/Community/VoiceBar.tsx`
- `src/components/Community/NewRoomDialog.tsx`
- `src/components/AuthGate.tsx`

Changed:
- `src/App.tsx` — add `/auth`, `/reset-password` routes, wrap with auth provider.
- `src/pages/Community.tsx` — rewrite using new components.
- `src/components/Layout/Sidebar.tsx` — auth chip.

## 6. Out of scope (for this pass)
- Screen share / video in voice rooms.
- Push notifications.
- File uploads in chat (text only for now).
- SFU server (mesh only).

After approval I'll ship it in one batch (migration + auth + community + voice).