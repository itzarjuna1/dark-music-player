import { useState, useEffect } from 'react';
import { Music, ListMusic, Plus, Trash2, Play } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlaylists } from '@/hooks/usePlaylists';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface FavoriteTrack {
  id: string;
  track_id: number;
  track_title: string;
  track_artist: string;
  track_album: string;
  track_cover: string;
  track_preview: string;
  track_duration: number;
}

const Library = () => {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { playlists, createPlaylist, deletePlaylist } = usePlaylists();
  const { playTrack } = usePlayer();
  const [favoriteTracks, setFavoriteTracks] = useState<FavoriteTrack[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadFavoriteTracks();
  }, [favorites]);

  const loadFavoriteTracks = async () => {
    if (favorites.length === 0) {
      setFavoriteTracks([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .in('track_id', favorites);

      if (error) throw error;
      setFavoriteTracks(data || []);
    } catch (error) {
      console.error('Error loading favorite tracks:', error);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    await createPlaylist(newPlaylistName, newPlaylistDescription);
    setNewPlaylistName('');
    setNewPlaylistDescription('');
    setIsDialogOpen(false);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 p-8">
      <h1 className="text-4xl font-bold mb-6">Your Library</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mb-8">
        <div className="glass rounded-lg p-8 border border-border hover:border-primary smooth-transition cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Liked Songs</h2>
          <p className="text-muted-foreground">{favorites.length} songs</p>
        </div>

        <div className="glass rounded-lg p-8 border border-border hover:border-primary smooth-transition cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <ListMusic className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Playlists</h2>
          <p className="text-muted-foreground">{playlists.length} playlists</p>
        </div>
      </div>

      {favoriteTracks.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Recent Favorites</h2>
          <div className="grid grid-cols-1 gap-2">
            {favoriteTracks.slice(0, 5).map((track) => (
              <div
                key={track.id}
                className="glass rounded-lg p-4 flex items-center gap-4 hover:bg-secondary smooth-transition cursor-pointer group"
                onClick={() => playTrack({
                  id: track.track_id,
                  title: track.track_title,
                  artist: track.track_artist,
                  album: track.track_album,
                  cover: track.track_cover,
                  preview: track.track_preview,
                  duration: track.track_duration,
                })}
              >
                <img
                  src={track.track_cover}
                  alt={track.track_title}
                  className="w-12 h-12 rounded"
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{track.track_title}</h3>
                  <p className="text-sm text-muted-foreground">{track.track_artist}</p>
                </div>
                <Play className="w-5 h-5 opacity-0 group-hover:opacity-100 smooth-transition" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Your Playlists</h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Playlist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Playlist Name</Label>
                  <Input
                    id="name"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="My Awesome Playlist"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newPlaylistDescription}
                    onChange={(e) => setNewPlaylistDescription(e.target.value)}
                    placeholder="Add a description..."
                  />
                </div>
                <Button onClick={handleCreatePlaylist} className="w-full">
                  Create Playlist
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {playlists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="glass rounded-lg p-6 border border-border hover:border-primary smooth-transition group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <ListMusic className="w-6 h-6 text-white" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deletePlaylist(playlist.id)}
                    className="opacity-0 group-hover:opacity-100 smooth-transition"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <h3 className="font-bold text-lg mb-1">{playlist.name}</h3>
                {playlist.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {playlist.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {playlist.track_count || 0} tracks
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass rounded-lg border border-border">
            <ListMusic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              You haven't created any playlists yet
            </p>
          </div>
        )}
      </div>

      {favorites.length === 0 && playlists.length === 0 && (
        <div className="mt-12 text-center max-w-md mx-auto">
          <p className="text-muted-foreground mb-4">
            Start building your music library by searching for your favorite songs and artists.
          </p>
          <Button onClick={() => navigate('/search')} className="gap-2">
            Explore Music
          </Button>
        </div>
      )}
    </div>
  );
};

export default Library;
