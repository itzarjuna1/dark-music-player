import { useState } from 'react';
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
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading] = useState(false);

  const loadPlaylists = async () => {};

  const createPlaylist = async (name: string, description?: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description: description || null,
      cover_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      track_count: 0,
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    toast.success('Playlist created');
    return newPlaylist;
  };

  const deletePlaylist = async (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    toast.success('Playlist deleted');
  };

  return { playlists, loading, createPlaylist, deletePlaylist, loadPlaylists };
};
