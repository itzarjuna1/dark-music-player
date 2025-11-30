import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  track_count?: number;
}

export const usePlaylists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlaylists();
    }
  }, [user]);

  const loadPlaylists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get track counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from('playlist_tracks')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);
          
          return { ...playlist, track_count: count || 0 };
        })
      );

      setPlaylists(playlistsWithCounts);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async (name: string, description?: string) => {
    if (!user) {
      toast.error('Please sign in to create playlists');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('playlists')
        .insert({
          user_id: user.id,
          name,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Playlist created');
      await loadPlaylists();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create playlist');
      return null;
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success('Playlist deleted');
      await loadPlaylists();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete playlist');
    }
  };

  return { playlists, loading, createPlaylist, deletePlaylist, loadPlaylists };
};
