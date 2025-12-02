import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Shuffle, Repeat, Repeat1, List, Maximize2, Music2 } from 'lucide-react';
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
    dominantColor,
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
  const [expanded, setExpanded] = useState(false);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) {
    return null;
  }

  const favorite = isFavorite(currentTrack.id);

  // Spotify-like Now Playing Card (Expanded View)
  if (expanded) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background: dominantColor 
            ? `linear-gradient(180deg, ${dominantColor}40 0%, hsl(270 50% 10%) 100%)`
            : 'linear-gradient(180deg, hsl(270 40% 20%) 0%, hsl(270 50% 10%) 100%)'
        }}
      >
        <button
          onClick={() => setExpanded(false)}
          className="absolute top-4 right-4 text-foreground/70 hover:text-foreground p-2"
        >
          ✕
        </button>

        <div className="flex flex-col items-center max-w-md w-full px-8">
          {/* Album Art */}
          <div className="relative mb-8 group">
            <div 
              className="absolute inset-0 rounded-2xl blur-3xl opacity-60"
              style={{ backgroundColor: dominantColor || 'hsl(193 100% 50%)' }}
            />
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className="relative w-72 h-72 rounded-2xl object-cover shadow-2xl group-hover:scale-105 smooth-transition"
            />
            {isPlaying && (
              <div className="absolute bottom-4 right-4 flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center mb-6 w-full">
            <h2 className="text-2xl font-bold truncate">{currentTrack.title}</h2>
            <p className="text-muted-foreground truncate">{currentTrack.artist}</p>
            <p className="text-sm text-muted-foreground/70 truncate">{currentTrack.album}</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full mb-4">
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={([value]) => seek(value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mb-8">
            <button
              onClick={toggleShuffle}
              className={cn(
                "text-muted-foreground hover:text-foreground smooth-transition",
                shuffle && "text-primary"
              )}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            
            <button
              onClick={previousTrack}
              className="text-foreground hover:scale-110 smooth-transition"
            >
              <SkipBack className="w-8 h-8 fill-current" />
            </button>
            
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-110 smooth-transition btn-rgb"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            
            <button
              onClick={nextTrack}
              className="text-foreground hover:scale-110 smooth-transition"
            >
              <SkipForward className="w-8 h-8 fill-current" />
            </button>

            <button
              onClick={toggleRepeat}
              className={cn(
                "text-muted-foreground hover:text-foreground smooth-transition",
                repeat !== 'off' && "text-primary"
              )}
            >
              {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Extra Controls */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => toggleFavorite(currentTrack)}
              className={cn(
                "text-muted-foreground hover:text-primary smooth-transition",
                favorite && "text-primary"
              )}
            >
              <Heart className={cn("w-6 h-6", favorite && "fill-current")} />
            </button>

            <button
              onClick={() => navigate('/visualizer')}
              className="text-muted-foreground hover:text-foreground smooth-transition"
            >
              <Maximize2 className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                className="text-muted-foreground hover:text-foreground smooth-transition"
              >
                {volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <Slider
                value={[volume]}
                max={1}
                step={0.01}
                onValueChange={([value]) => setVolume(value)}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mini Player Bar
  return (
    <footer 
      className="fixed bottom-0 left-0 right-0 h-20 border-t border-border z-50"
      style={{
        background: dominantColor 
          ? `linear-gradient(90deg, ${dominantColor}30 0%, hsl(270 60% 8% / 0.95) 50%, ${dominantColor}20 100%)`
          : 'hsl(270 60% 8% / 0.95)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Track Info - Clickable to expand */}
        <button 
          onClick={() => setExpanded(true)}
          className="flex items-center gap-3 min-w-0 flex-1 text-left hover:bg-foreground/5 rounded-lg p-1 smooth-transition"
        >
          <div className="relative">
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className="w-14 h-14 rounded-lg object-cover shadow-lg"
            />
            {isPlaying && (
              <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-background/30">
                <Music2 className="w-6 h-6 text-primary animate-pulse" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate text-foreground">{currentTrack.title}</p>
            <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
        </button>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(currentTrack);
          }}
          className={cn(
            "text-muted-foreground hover:text-primary smooth-transition shrink-0",
            favorite && "text-primary"
          )}
        >
          <Heart className={cn("w-5 h-5", favorite && "fill-current")} />
        </button>

        {/* Player Controls */}
        <div className="flex-1 flex flex-col items-center gap-1 max-w-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={cn(
                "text-muted-foreground hover:text-foreground smooth-transition hidden sm:block",
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
              className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-110 smooth-transition active:scale-95"
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
                "text-muted-foreground hover:text-foreground smooth-transition hidden sm:block",
                repeat !== 'off' && "text-primary"
              )}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          <div className="w-full flex items-center gap-2 hidden sm:flex">
            <span className="text-xs text-muted-foreground min-w-[35px] text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={([value]) => seek(value)}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground min-w-[35px]">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Extra Controls */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <button
            onClick={() => navigate('/visualizer')}
            className="text-muted-foreground hover:text-foreground smooth-transition hidden md:block"
            title="Open Visualizer"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowQueue(!showQueue)}
            className={cn(
              "text-muted-foreground hover:text-foreground smooth-transition hidden md:block",
              showQueue && "text-primary"
            )}
          >
            <List className="w-5 h-5" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
              className="text-muted-foreground hover:text-foreground smooth-transition"
            >
              {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={([value]) => setVolume(value)}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Queue Panel */}
      {showQueue && (
        <div className="absolute bottom-20 right-4 w-80 max-h-96 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-4">
            <h3 className="font-semibold mb-3 gradient-text">Queue ({queue.length})</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {queue.map((track, index) => (
                <div
                  key={`${track.id}-${index}`}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/5 smooth-transition cursor-pointer",
                    currentTrack?.id === track.id && "bg-primary/10 border border-primary/20"
                  )}
                >
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg shadow" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{track.title}</p>
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
