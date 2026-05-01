import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
  videoId?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  queue: Track[];
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  addToQueue: (track: Track) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  dominantColor: string;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const [dominantColor, setDominantColor] = useState('190 95% 50%');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playHistory, setPlayHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener('ended', () => {
        handleTrackEnd();
      });
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (currentTrack?.cover) {
      extractDominantColor(currentTrack.cover);
    }
  }, [currentTrack]);

  const handleTrackEnd = () => {
    if (repeat === 'one') {
      audioRef.current?.play();
    } else {
      nextTrack();
    }
  };

  const sendTelegramLog = async (track: Track) => {
    try {
      await supabase.functions.invoke('telegram-log', {
        body: {
          title: track.title,
          artist: track.artist,
          album: track.album,
          cover: track.cover,
          duration: track.duration,
          userName: 'Guest',
          videoId: (track as any).videoId || null,
        },
      });
    } catch (error) {
      console.error('Error sending Telegram log:', error);
    }
  };

  // Sync now-playing to bot-api so connected Telegram bot can show track info
  const syncNowPlaying = async (track: Track | null, position: number, playing: boolean) => {
    try {
      const apiKey = localStorage.getItem('um_bot_api_key');
      if (!apiKey || !track) return;
      const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
      if (!projectId) return;
      await fetch(`https://${projectId}.supabase.co/functions/v1/bot-api/nowplaying`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          album: track.album,
          cover: track.cover,
          video_id: (track as any).videoId || null,
          duration: Math.floor(track.duration || 0),
          position: Math.floor(position),
          is_playing: playing,
        }),
      });
    } catch (e) {
      // silent
    }
  };

  const extractDominantColor = async (imageUrl: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] + data[i + 1] + data[i + 2] > 50) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        const hsl = rgbToHsl(r, g, b);
        setDominantColor(`${hsl.h} ${hsl.s}% ${Math.max(hsl.l, 50)}%`);
      };
    } catch (error) {
      console.error('Error extracting color:', error);
    }
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    
    if (audioRef.current && track.preview && !track.videoId) {
      audioRef.current.src = track.preview;
      audioRef.current.play();
    } else if (audioRef.current && track.videoId) {
      audioRef.current.pause();
    }
    
    sendTelegramLog(track);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    let nextIndex;

    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (repeat === 'all' && currentIndex === queue.length - 1) {
      nextIndex = 0;
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex < queue.length) {
      playTrack(queue[nextIndex]);
    }
  };

  const previousTrack = () => {
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      playTrack(queue[prevIndex]);
    } else if (repeat === 'all') {
      playTrack(queue[queue.length - 1]);
    }
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };

  const toggleShuffle = () => {
    setShuffle(prev => !prev);
  };

  const toggleRepeat = () => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        currentTime,
        duration,
        queue,
        shuffle,
        repeat,
        playTrack,
        togglePlay,
        nextTrack,
        previousTrack,
        setVolume,
        seek,
        addToQueue,
        toggleShuffle,
        toggleRepeat,
        dominantColor,
      }}
    >
      <div style={{ '--dynamic-primary': dominantColor } as React.CSSProperties}>
        {children}
      </div>
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
