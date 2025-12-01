-- Phase 3: Collaborative Playlists Tables
CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.playlist_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('added', 'removed', 'reordered', 'created', 'deleted', 'updated')),
  track_id INTEGER,
  track_title TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playlist_collaborators
CREATE POLICY "Users can view collaborators on their playlists"
ON public.playlist_collaborators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_collaborators.playlist_id
    AND (playlists.user_id = auth.uid() OR playlist_collaborators.user_id = auth.uid())
  )
);

CREATE POLICY "Playlist owners can add collaborators"
ON public.playlist_collaborators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_collaborators.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

CREATE POLICY "Playlist owners can remove collaborators"
ON public.playlist_collaborators
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_collaborators.playlist_id
    AND playlists.user_id = auth.uid()
  )
);

-- RLS Policies for playlist_activity
CREATE POLICY "Users can view activity on accessible playlists"
ON public.playlist_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_activity.playlist_id
    AND (
      playlists.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM playlist_collaborators
        WHERE playlist_collaborators.playlist_id = playlist_activity.playlist_id
        AND playlist_collaborators.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Collaborators can add activity"
ON public.playlist_activity
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_activity.playlist_id
    AND (
      playlists.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM playlist_collaborators
        WHERE playlist_collaborators.playlist_id = playlist_activity.playlist_id
        AND playlist_collaborators.user_id = auth.uid()
      )
    )
  )
);

-- Enable Realtime for collaborative features
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_activity;

-- Phase 5: Community Features Tables
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  genre TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id INTEGER NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT NOT NULL,
  track_cover TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('playing', 'liked', 'added_to_playlist')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms (public read)
CREATE POLICY "Anyone can view chat rooms"
ON public.chat_rooms
FOR SELECT
USING (true);

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can view messages"
ON public.chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_activity
CREATE POLICY "Anyone can view user activity"
ON public.user_activity
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own activity"
ON public.user_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for follows
CREATE POLICY "Anyone can view follows"
ON public.follows
FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON public.follows
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.follows
FOR DELETE
USING (auth.uid() = follower_id);

-- Enable Realtime for community features
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;

-- Insert default chat rooms
INSERT INTO public.chat_rooms (name, genre, description) VALUES
  ('Pop Lounge', 'Pop', 'Discuss the latest pop hits and classics'),
  ('Hip-Hop Hub', 'Hip-Hop', 'Rap, beats, and urban culture'),
  ('Electronic Waves', 'Electronic', 'EDM, techno, house, and more'),
  ('Rock Arena', 'Rock', 'From classic rock to modern alternative'),
  ('Jazz Cafe', 'Jazz', 'Smooth jazz and experimental sounds'),
  ('Global Sounds', 'World', 'Music from around the world')
ON CONFLICT DO NOTHING;