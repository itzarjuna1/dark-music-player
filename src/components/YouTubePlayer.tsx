import React, { useEffect, useRef, useState } from 'react';
import { X, Minimize2, Maximize2, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Heart } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  title,
  artist,
  thumbnail,
  onClose,
  onNext,
  onPrevious,
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const intervalRef = useRef<number>();

  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Create a track-like object for favorites
  const trackForFavorite = {
    id: parseInt(videoId.replace(/\D/g, '').slice(0, 8) || '0', 10) || Date.now(),
    title,
    artist,
    album: 'YouTube',
    cover: thumbnail,
    preview: `https://youtube.com/watch?v=${videoId}`,
    duration,
  };

  const favorite = isFavorite(trackForFavorite.id);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            setDuration(event.target.getDuration());
            event.target.setVolume(volume);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            if (event.data === window.YT.PlayerState.ENDED && onNext) {
              onNext();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  useEffect(() => {
    if (isReady && isPlaying) {
      intervalRef.current = window.setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isReady, isPlaying]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (value: number[]) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(value[0], true);
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current) return;
    const newVolume = value[0];
    playerRef.current.setVolume(newVolume);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      playerRef.current.unMute();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 70);
    } else {
      playerRef.current.mute();
    }
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Expanded fullscreen view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 animate-fade-in">
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-foreground/10 smooth-transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center max-w-md w-full">
          {/* Video/Thumbnail */}
          <div 
            className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-2xl mb-8 cursor-pointer group"
            onClick={() => setShowVideo(!showVideo)}
          >
            {showVideo ? (
              <div id="youtube-player-expanded" className="w-full h-full" />
            ) : (
              <>
                <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 smooth-transition">
                  <span className="text-white text-sm">Click to show video</span>
                </div>
              </>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center mb-6 w-full">
            <h2 className="text-2xl font-bold truncate">{title}</h2>
            <p className="text-muted-foreground">{artist}</p>
          </div>

          {/* Progress */}
          <div className="w-full mb-6">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mb-6">
            <button onClick={onPrevious} className="text-foreground hover:scale-110 smooth-transition">
              <SkipBack className="w-8 h-8" />
            </button>
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 smooth-transition"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <button onClick={onNext} className="text-foreground hover:scale-110 smooth-transition">
              <SkipForward className="w-8 h-8" />
            </button>
          </div>

          {/* Volume & Favorite */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => toggleFavorite(trackForFavorite)}
              className={cn("smooth-transition", favorite ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              <Heart className={cn("w-6 h-6", favorite && "fill-current")} />
            </button>
            <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>
      </div>
    );
  }

  // Mini bar is handled by the global Player component (PlayerContext).
  // We just keep the hidden iframe alive so YouTube playback continues.
  return (
    <div className="hidden">
      <div id="youtube-player" />
    </div>
  );
};

export default YouTubePlayer;
