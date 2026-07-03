
-- BotFather system schema

-- Enums
CREATE TYPE public.bot_type AS ENUM ('in_app', 'telegram_clone');
CREATE TYPE public.response_kind AS ENUM ('static', 'music_play', 'music_queue', 'ai');
CREATE TYPE public.sender_kind AS ENUM ('user', 'bot');

-- Bots table
CREATE TABLE public.bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  avatar_url text,
  bot_type public.bot_type NOT NULL DEFAULT 'in_app',
  is_active boolean NOT NULL DEFAULT true,
  ai_enabled boolean NOT NULL DEFAULT false,
  ai_persona text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bots_owner ON public.bots(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bots TO authenticated;
GRANT ALL ON public.bots TO service_role;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bots_select_all" ON public.bots FOR SELECT TO authenticated USING (true);
CREATE POLICY "bots_insert_own" ON public.bots FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "bots_update_own" ON public.bots FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "bots_delete_own" ON public.bots FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TRIGGER bots_updated_at BEFORE UPDATE ON public.bots FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Bot commands
CREATE TABLE public.bot_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  command text NOT NULL,
  response_text text,
  response_kind public.response_kind NOT NULL DEFAULT 'static',
  buttons jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, command)
);
CREATE INDEX idx_bot_commands_bot ON public.bot_commands(bot_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_commands TO authenticated;
GRANT ALL ON public.bot_commands TO service_role;
ALTER TABLE public.bot_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot_commands_select_all" ON public.bot_commands FOR SELECT TO authenticated USING (true);
CREATE POLICY "bot_commands_manage_owner" ON public.bot_commands FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND b.owner_id = auth.uid()));

-- Bot room installs
CREATE TABLE public.bot_room_installs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  installed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, room_id)
);
CREATE INDEX idx_bot_room_installs_room ON public.bot_room_installs(room_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_room_installs TO authenticated;
GRANT ALL ON public.bot_room_installs TO service_role;
ALTER TABLE public.bot_room_installs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bri_select_members" ON public.bot_room_installs FOR SELECT TO authenticated
  USING (public.is_room_member(auth.uid(), room_id) OR public.room_is_public(room_id));
CREATE POLICY "bri_insert_admin" ON public.bot_room_installs FOR INSERT TO authenticated
  WITH CHECK (public.is_room_admin(auth.uid(), room_id) AND installed_by = auth.uid());
CREATE POLICY "bri_delete_admin" ON public.bot_room_installs FOR DELETE TO authenticated
  USING (public.is_room_admin(auth.uid(), room_id));

-- Bot telegram configs
CREATE TABLE public.bot_telegram_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL UNIQUE REFERENCES public.bots(id) ON DELETE CASCADE,
  clone_id uuid NOT NULL REFERENCES public.bot_clones(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_telegram_configs TO authenticated;
GRANT ALL ON public.bot_telegram_configs TO service_role;
ALTER TABLE public.bot_telegram_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "btc_manage_owner" ON public.bot_telegram_configs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bots b WHERE b.id = bot_id AND b.owner_id = auth.uid()));

-- Extend chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN sender_kind public.sender_kind NOT NULL DEFAULT 'user',
  ADD COLUMN bot_id uuid REFERENCES public.bots(id) ON DELETE SET NULL,
  ADD COLUMN buttons jsonb,
  ADD COLUMN reply_to_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Allow service_role to insert bot messages via dispatch fn even though message policies scope to user_id.
-- Add a policy so service_role bypass isn't required for reads by members already handled.
CREATE POLICY "chat_messages_insert_bot" ON public.chat_messages FOR INSERT TO service_role WITH CHECK (true);

-- Realtime for new bot tables + chat updates already enabled on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_room_installs;
