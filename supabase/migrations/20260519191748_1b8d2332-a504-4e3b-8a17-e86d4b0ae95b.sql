CREATE TABLE public.bot_clones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_api_key TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Clone',
  bot_token TEXT NOT NULL,
  logger_chat_id TEXT NOT NULL,
  assistant_string_session TEXT NOT NULL,
  assistant_name TEXT,
  api_id TEXT,
  api_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_clones ENABLE ROW LEVEL SECURITY;

-- Access is gated server-side in edge functions (validates X-API-Key + owner status).
-- Block all direct PostgREST access from the anon client.
CREATE POLICY "No direct client access to bot_clones"
  ON public.bot_clones FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE INDEX idx_bot_clones_owner ON public.bot_clones(owner_api_key);

CREATE TRIGGER update_bot_clones_updated_at
  BEFORE UPDATE ON public.bot_clones
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();