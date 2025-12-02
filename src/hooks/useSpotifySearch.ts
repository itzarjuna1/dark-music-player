import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string | null;
  duration: number;
  spotifyUri: string;
  externalUrl: string;
}

export const useSpotifySearch = () => {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchSpotify = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTracks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('spotify-search', {
        body: { query, type: 'track', limit: 20 },
      });

      if (fnError) throw fnError;

      setTracks(data.tracks || []);
    } catch (err: any) {
      console.error('Spotify search error:', err);
      setError(err.message || 'Failed to search Spotify');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tracks, loading, error, searchSpotify };
};
