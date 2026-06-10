import { useState, useEffect } from 'react';
import TrackCard from '@/components/TrackCard';
import { usePlayer } from '@/contexts/PlayerContext';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
}

const Home = () => {
  const [featuredTracks, setFeaturedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { dominantColor } = usePlayer();

  useEffect(() => {
    fetchFeaturedTracks();
  }, []);

  const fetchFeaturedTracks = async () => {
    try {
      // Fetch popular tracks from iTunes API
      const response = await fetch('https://itunes.apple.com/search?term=top+hits+2024&media=music&entity=song&limit=50');
      const data = await response.json();
      
      const tracks: Track[] = data.results
        .filter((track: any) => track.previewUrl) // Only tracks with previews
        .slice(0, 12)
        .map((track: any) => ({
          id: track.trackId,
          title: track.trackName,
          artist: track.artistName,
          album: track.collectionName,
          cover: track.artworkUrl100.replace('100x100', '600x600'),
          preview: track.previewUrl,
          duration: Math.floor(track.trackTimeMillis / 1000),
        }));

      setFeaturedTracks(tracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      <div 
        className="min-h-[20rem] sm:min-h-[22rem] flex items-end px-6 sm:px-8 lg:px-12 pt-20 md:pt-10 pb-10 mb-8 sm:mb-10 border-b border-border"
        style={{
          background: `linear-gradient(180deg, hsl(${dominantColor} / 0.18) 0%, hsl(var(--background)) 72%)`
        }}
      >
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-4">Editorial listening</p>
          <h1 className="text-4xl sm:text-6xl font-serif font-semibold mb-5 sm:mb-6 tracking-tight leading-[0.95]">UpperMoon Tunes</h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl">
            A cleaner music experience with full-track discovery, calmer hierarchy, and a more polished listening surface.
          </p>
        </div>
      </div>

      <div className="px-6 sm:px-8">
        <h2 className="text-3xl font-serif font-semibold mb-6">Featured Tracks</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-4 animate-pulse">
                <div className="w-full aspect-square bg-muted rounded-md mb-4" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {featuredTracks.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
