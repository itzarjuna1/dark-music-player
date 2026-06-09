CREATE TABLE public.playback_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_clone_id UUID NOT NULL REFERENCES public.bot_clones(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'snowy',
  chat_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  requested_by TEXT,
  requested_by_user_id BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT ALL ON public.playback_jobs TO service_role;
ALTER TABLE public.playback_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to playback_jobs"
ON public.playback_jobs
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
CREATE INDEX idx_playback_jobs_status_created_at
ON public.playback_jobs(status, created_at);
CREATE INDEX idx_playback_jobs_target_clone_status
ON public.playback_jobs(target_clone_id, status);
CREATE TRIGGER update_playback_jobs_updated_at
BEFORE UPDATE ON public.playback_jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();