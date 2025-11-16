-- Create favorites table to store user's liked tracks
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id integer NOT NULL,
  track_title text NOT NULL,
  track_artist text NOT NULL,
  track_album text NOT NULL,
  track_cover text NOT NULL,
  track_preview text NOT NULL,
  track_duration integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own favorites"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their favorites"
  ON public.favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their favorites"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_track_id ON public.favorites(track_id);
CREATE UNIQUE INDEX idx_favorites_user_track ON public.favorites(user_id, track_id);