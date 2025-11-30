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
        className="h-80 flex items-end p-8 mb-6"
        style={{
          background: `linear-gradient(180deg, hsl(${dominantColor}) 0%, hsl(var(--background)) 100%)`
        }}
      >
        <div>
          <h1 className="text-6xl font-bold mb-4">Welcome to MUSIFY</h1>
          <p className="text-xl text-foreground/80">
            Discover your sound. Experience music like never before.
          </p>
        </div>
      </div>

      <div className="px-8">
        <h2 className="text-3xl font-bold mb-6">Featured Tracks</h2>
        
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
