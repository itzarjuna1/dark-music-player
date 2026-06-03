
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS last_renewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS api_keys_tg_user_idx ON public.api_keys(telegram_user_id);

CREATE TABLE IF NOT EXISTS public.telegram_api_users (
  telegram_user_id BIGINT PRIMARY KEY,
  telegram_username TEXT,
  first_name TEXT,
  api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_api_users TO authenticated;
GRANT ALL ON public.telegram_api_users TO service_role;

ALTER TABLE public.telegram_api_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to telegram_api_users"
  ON public.telegram_api_users FOR ALL
  USING (false) WITH CHECK (false);
