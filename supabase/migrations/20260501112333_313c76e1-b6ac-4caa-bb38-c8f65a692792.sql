-- API keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My API Key',
  api_key TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','month','six_months','year','owner')),
  is_owner BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  monthly_quota INTEGER NOT NULL DEFAULT 1000,
  requests_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  contact_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_key ON public.api_keys(api_key);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view api keys"
  ON public.api_keys FOR SELECT USING (true);

CREATE POLICY "Anyone can create api keys"
  ON public.api_keys FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update api keys"
  ON public.api_keys FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete api keys"
  ON public.api_keys FOR DELETE USING (true);

-- Now-playing snapshot per api key (used by bot for progress bar / track info)
CREATE TABLE public.now_playing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID,
  api_key TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  cover TEXT,
  video_id TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  is_playing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_now_playing_key ON public.now_playing(api_key);

ALTER TABLE public.now_playing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read now playing"
  ON public.now_playing FOR SELECT USING (true);

CREATE POLICY "Anyone can write now playing"
  ON public.now_playing FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update now playing"
  ON public.now_playing FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete now playing"
  ON public.now_playing FOR DELETE USING (true);

-- Request logs
CREATE TABLE public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_logs_key ON public.api_request_logs(api_key);

ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read api logs"
  ON public.api_request_logs FOR SELECT USING (true);

CREATE POLICY "Anyone can insert api logs"
  ON public.api_request_logs FOR INSERT WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();