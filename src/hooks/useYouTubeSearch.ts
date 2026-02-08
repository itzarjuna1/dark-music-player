import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  duration: number;
  source: 'youtube';
}

export const useYouTubeSearch = () => {
  const [tracks, setTracks] = useState<YouTubeTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchYouTube = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTracks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('youtube-search', {
        body: { query, limit: 20 },
      });

      if (fnError) throw fnError;

      setTracks(data.tracks || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search YouTube';
      console.error('YouTube search error:', errorMessage);
      setError(errorMessage);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tracks, loading, error, searchYouTube };
};
