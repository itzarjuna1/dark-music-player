import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Shuffle, Repeat, Repeat1, List, Maximize2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const Player = () => {
  const navigate = useNavigate();
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    shuffle,
    repeat,
    queue,
    togglePlay,
    nextTrack,
    previousTrack,
    setVolume,
    seek,
    toggleShuffle,
    toggleRepeat,
  } = usePlayer();

  const { isFavorite, toggleFavorite } = useFavorites();
  const [showVolume, setShowVolume] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return null;
  }

  const favorite = isFavorite(currentTrack.id);

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-24 bg-player border-t border-border glass z-50 animate-slide-in-up">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="w-14 h-14 rounded-lg object-cover animate-fade-in"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{currentTrack.title}</p>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={cn(
              "text-muted-foreground hover:text-primary smooth-transition",
              favorite && "text-primary"
            )}
          >
            <Heart className={cn("w-5 h-5", favorite && "fill-current")} />
          </button>
        </div>

        {/* Player Controls */}
        <div className="flex-1 flex flex-col items-center gap-2 max-w-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={cn(
                "text-muted-foreground hover:text-foreground smooth-transition",
                shuffle && "text-primary"
              )}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            
            <button
              onClick={previousTrack}
              className="text-muted-foreground hover:text-foreground smooth-transition"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 smooth-transition glow"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            
            <button
              onClick={nextTrack}
              className="text-muted-foreground hover:text-foreground smooth-transition"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRepeat}
              className={cn(
                "text-muted-foreground hover:text-foreground smooth-transition",
                repeat !== 'off' && "text-primary"
              )}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-muted-foreground min-w-[40px] text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={([value]) => seek(value)}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Queue Controls */}
        <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
          <button
            onClick={() => navigate('/visualizer')}
            className="text-muted-foreground hover:text-foreground smooth-transition hover-glow"
            title="Open Visualizer"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              "text-muted-foreground hover:text-foreground smooth-transition",
              showQueue && "text-primary"
            )}
          >
            <List className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowVolume(!showVolume)}
            className="text-muted-foreground hover:text-foreground smooth-transition"
          >
            {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {showVolume && (
            <div className="w-24 animate-fade-in">
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={([value]) => setVolume(value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Queue Panel */}
      {showQueue && (
        <div className="absolute bottom-24 right-4 w-80 max-h-96 bg-card border border-border rounded-lg shadow-lg overflow-auto animate-slide-in-right">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Queue ({queue.length})</h3>
            <div className="space-y-2">
              {queue.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md hover:bg-secondary smooth-transition",
                    currentTrack?.id === track.id && "bg-secondary"
                  )}
                >
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  <img src={track.cover} alt={track.title} className="w-10 h-10 rounded" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{track.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Player;