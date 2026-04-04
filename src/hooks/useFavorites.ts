import { useState } from 'react';
import { toast } from 'sonner';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading] = useState(false);

  const toggleFavorite = async (track: Track) => {
    const isFav = favorites.includes(track.id);
    if (isFav) {
      setFavorites(prev => prev.filter(id => id !== track.id));
      toast.success('Removed from favorites');
    } else {
      setFavorites(prev => [...prev, track.id]);
      toast.success('Added to favorites');
    }
  };

  const isFavorite = (trackId: number) => favorites.includes(trackId);

  const loadFavorites = async () => {};

  return { favorites, loading, toggleFavorite, isFavorite, loadFavorites };
};
