import { Play, Heart, Download, ExternalLink } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
  source?: string;
  videoId?: string;
}

interface TrackCardProps {
  track: Track;
  onCustomClick?: () => void;
}

const TrackCard = ({ track, onCustomClick }: TrackCardProps) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isCurrentTrack = currentTrack?.id === track.id;
  const favorite = isFavorite(track.id);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (track.source === 'youtube' && track.videoId) {
      // Open YouTube link in new tab
      window.open(`https://youtube.com/watch?v=${track.videoId}`, '_blank');
      toast.info('Opened YouTube video in a new tab');
      return;
    }

    // For Jamendo and iTunes — direct download of the audio file
    if (track.preview && track.preview.startsWith('http')) {
      const link = document.createElement('a');
      link.href = track.preview;
      link.download = `${track.artist} - ${track.title}.mp3`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } else {
      toast.error('No downloadable source available');
    }
  };

  return (
    <div className="group relative bg-card rounded-lg p-4 hover:bg-secondary smooth-transition cursor-pointer">
      <div className="relative mb-4">
        <img
          src={track.cover}
          alt={track.title}
          className="w-full aspect-square object-cover rounded-md"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(track);
          }}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 smooth-transition shadow-lg hover:scale-110",
            favorite ? "bg-primary text-primary-foreground opacity-100" : "bg-background/80 text-foreground"
          )}
        >
          <Heart className={cn("w-4 h-4", favorite && "fill-current")} />
        </button>
        {/* Download button */}
        <button
          onClick={handleDownload}
          className="absolute top-2 left-2 w-8 h-8 rounded-full bg-background/80 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 smooth-transition shadow-lg hover:scale-110"
          title={track.source === 'youtube' ? 'Open on YouTube' : 'Download'}
        >
          {track.source === 'youtube' ? (
            <ExternalLink className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onCustomClick ? onCustomClick() : playTrack(track)}
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 smooth-transition shadow-lg hover:scale-110"
        >
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        </button>
      </div>
      
      <h3 className="font-semibold truncate mb-1">{track.title}</h3>
      <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
    </div>
  );
};

export default TrackCard;
