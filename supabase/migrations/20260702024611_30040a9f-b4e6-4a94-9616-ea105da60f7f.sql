
-- =========================================================
-- Community overhaul: roles, membership, bans, voice chat
-- =========================================================

-- Role enum for room membership
DO $$ BEGIN
  CREATE TYPE public.room_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend chat_rooms
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ---------- room_members ----------
CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.room_role NOT NULL DEFAULT 'member',
  muted boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- ---------- room_bans ----------
CREATE TABLE IF NOT EXISTS public.room_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_bans TO authenticated;
GRANT ALL ON public.room_bans TO service_role;
ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;

-- ---------- voice_participants ----------
CREATE TABLE IF NOT EXISTS public.voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_muted boolean NOT NULL DEFAULT false,
  is_speaking boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.voice_participants TO authenticated;
GRANT ALL ON public.voice_participants TO service_role;
ALTER TABLE public.voice_participants ENABLE ROW LEVEL SECURITY;

-- ---------- voice_signals ----------
CREATE TABLE IF NOT EXISTS public.voice_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.voice_signals TO authenticated;
GRANT ALL ON public.voice_signals TO service_role;
ALTER TABLE public.voice_signals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS voice_signals_to_user_idx ON public.voice_signals (to_user, room_id, created_at);

-- =========================================================
-- Security-definer helpers (avoid RLS recursion)
-- =========================================================

CREATE OR REPLACE FUNCTION public.is_room_member(_uid uuid, _room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_members WHERE user_id = _uid AND room_id = _room);
$$;

CREATE OR REPLACE FUNCTION public.is_room_admin(_uid uuid, _room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE user_id = _uid AND room_id = _room AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(_uid uuid, _room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE user_id = _uid AND room_id = _room AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_banned(_uid uuid, _room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.room_bans WHERE user_id = _uid AND room_id = _room);
$$;

CREATE OR REPLACE FUNCTION public.room_is_public(_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT NOT is_private FROM public.chat_rooms WHERE id = _room), false);
$$;

-- =========================================================
-- Policies
-- =========================================================

-- chat_rooms: drop legacy, add new
DROP POLICY IF EXISTS "Anyone can view chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Public rooms are viewable" ON public.chat_rooms;
DROP POLICY IF EXISTS "Members can view private rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Owners can update rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Owners can delete rooms" ON public.chat_rooms;

CREATE POLICY "Public rooms are viewable"
  ON public.chat_rooms FOR SELECT
  USING (NOT is_private OR public.is_room_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create rooms"
  ON public.chat_rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update rooms"
  ON public.chat_rooms FOR UPDATE TO authenticated
  USING (public.is_room_owner(auth.uid(), id))
  WITH CHECK (public.is_room_owner(auth.uid(), id));

CREATE POLICY "Owners can delete rooms"
  ON public.chat_rooms FOR DELETE TO authenticated
  USING (public.is_room_owner(auth.uid(), id));

-- chat_messages: drop legacy, add scoped
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can post messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authors or admins can delete messages" ON public.chat_messages;

CREATE POLICY "Members can view messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can post messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_room_member(auth.uid(), room_id)
    AND NOT public.is_banned(auth.uid(), room_id)
  );

CREATE POLICY "Authors or admins can delete messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_room_admin(auth.uid(), room_id));

-- room_members
CREATE POLICY "Members can view membership of their rooms"
  ON public.room_members FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id) OR public.room_is_public(room_id));

CREATE POLICY "Users can join rooms"
  ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT public.is_banned(auth.uid(), room_id)
    AND (public.room_is_public(room_id) OR public.is_room_admin(auth.uid(), room_id))
  );

CREATE POLICY "Admins can update roles, users can update self"
  ON public.room_members FOR UPDATE TO authenticated
  USING (public.is_room_admin(auth.uid(), room_id) OR auth.uid() = user_id)
  WITH CHECK (public.is_room_admin(auth.uid(), room_id) OR auth.uid() = user_id);

CREATE POLICY "Admins can kick, users can leave"
  ON public.room_members FOR DELETE TO authenticated
  USING (public.is_room_admin(auth.uid(), room_id) OR auth.uid() = user_id);

-- room_bans
CREATE POLICY "Admins can view bans"
  ON public.room_bans FOR SELECT TO authenticated
  USING (public.is_room_admin(auth.uid(), room_id));

CREATE POLICY "Admins can ban"
  ON public.room_bans FOR INSERT TO authenticated
  WITH CHECK (public.is_room_admin(auth.uid(), room_id) AND auth.uid() = banned_by);

CREATE POLICY "Admins can unban"
  ON public.room_bans FOR DELETE TO authenticated
  USING (public.is_room_admin(auth.uid(), room_id));

-- voice_participants
CREATE POLICY "Members can view voice presence"
  ON public.voice_participants FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Members can join voice"
  ON public.voice_participants FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_room_member(auth.uid(), room_id)
    AND NOT public.is_banned(auth.uid(), room_id)
  );

CREATE POLICY "Users update their own voice presence"
  ON public.voice_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users leave voice"
  ON public.voice_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_room_admin(auth.uid(), room_id));

-- voice_signals
CREATE POLICY "Recipients can read their signals"
  ON public.voice_signals FOR SELECT TO authenticated
  USING (auth.uid() = to_user OR auth.uid() = from_user);

CREATE POLICY "Members can send signals"
  ON public.voice_signals FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = from_user
    AND public.is_room_member(auth.uid(), room_id)
  );

CREATE POLICY "Recipients can clean up signals"
  ON public.voice_signals FOR DELETE TO authenticated
  USING (auth.uid() = to_user OR auth.uid() = from_user);

-- profiles readable to any authenticated user for member lists
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- =========================================================
-- Auto-add creator as owner
-- =========================================================
CREATE OR REPLACE FUNCTION public.add_room_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.room_members (room_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_chat_room_created ON public.chat_rooms;
CREATE TRIGGER on_chat_room_created
  AFTER INSERT ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.add_room_owner();

-- =========================================================
-- Realtime
-- =========================================================
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.room_members REPLICA IDENTITY FULL;
ALTER TABLE public.voice_participants REPLICA IDENTITY FULL;
ALTER TABLE public.voice_signals REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_participants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_signals;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
