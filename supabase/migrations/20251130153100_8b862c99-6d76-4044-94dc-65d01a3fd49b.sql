-- Create play history table
CREATE TABLE IF NOT EXISTS public.play_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id INTEGER NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT NOT NULL,
  track_album TEXT NOT NULL,
  track_cover TEXT NOT NULL,
  track_preview TEXT NOT NULL,
  track_duration INTEGER NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.play_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own play history"
ON public.play_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their play history"
ON public.play_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_play_history_user_id ON public.play_history(user_id);
CREATE INDEX idx_play_history_played_at ON public.play_history(played_at DESC);