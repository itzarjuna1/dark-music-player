import { Play, Heart } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
}

interface TrackCardProps {
  track: Track;
}

const TrackCard = ({ track }: TrackCardProps) => {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();
  const isCurrentTrack = currentTrack?.id === track.id;
  const favorite = isFavorite(track.id);

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
        <button
          onClick={() => playTrack(track)}
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 smooth-transition shadow-lg hover:scale-110 glow"
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
