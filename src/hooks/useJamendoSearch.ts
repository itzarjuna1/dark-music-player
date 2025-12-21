import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JamendoTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
  source: 'jamendo';
  license: string;
}

export const useJamendoSearch = () => {
  const [tracks, setTracks] = useState<JamendoTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchJamendo = useCallback(async (query: string) => {
    if (!query.trim()) {
      setTracks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('jamendo-search', {
        body: { query, limit: 20 },
      });

      if (fnError) throw fnError;

      setTracks(data.tracks || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search Jamendo';
      console.error('Jamendo search error:', errorMessage);
      setError(errorMessage);
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tracks, loading, error, searchJamendo };
};
