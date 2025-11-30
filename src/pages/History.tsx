import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { Play, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoryTrack {
  id: string;
  track_id: number;
  track_title: string;
  track_artist: string;
  track_album: string;
  track_cover: string;
  track_preview: string;
  track_duration: number;
  played_at: string;
}

const History = () => {
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const [history, setHistory] = useState<HistoryTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('play_history' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as unknown as HistoryTrack[]);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track: HistoryTrack) => {
    playTrack({
      id: track.track_id,
      title: track.track_title,
      artist: track.track_artist,
      album: track.track_album,
      cover: track.track_cover,
      preview: track.track_preview,
      duration: track.track_duration,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-primary" />
          <h1 className="text-4xl font-bold">Recently Played</h1>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No listening history yet</h3>
            <p className="text-muted-foreground">
              Start playing some tracks to see your history here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((track) => (
              <div
                key={track.id}
                className="group flex items-center gap-4 p-4 rounded-lg hover:bg-secondary smooth-transition"
              >
                <div className="relative">
                  <img
                    src={track.track_cover}
                    alt={track.track_title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <button
                    onClick={() => handlePlay(track)}
                    className="absolute inset-0 w-16 h-16 rounded-lg bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 smooth-transition"
                  >
                    <Play className="w-6 h-6 text-white" fill="white" />
                  </button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{track.track_title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.track_artist}
                  </p>
                </div>

                <div className="text-sm text-muted-foreground">
                  {formatDate(track.played_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;