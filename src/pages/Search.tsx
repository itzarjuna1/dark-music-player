import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TrackCard from '@/components/TrackCard';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
}

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=50`);
      const data = await response.json();
      
      const tracks: Track[] = data.results
        .filter((track: any) => track.previewUrl) // Only tracks with previews
        .map((track: any) => ({
          id: track.trackId,
          title: track.trackName,
          artist: track.artistName,
          album: track.collectionName,
          cover: track.artworkUrl100.replace('100x100', '600x600'),
          preview: track.previewUrl,
          duration: Math.floor(track.trackTimeMillis / 1000),
        }));

      setResults(tracks);
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 p-8">
      <div className="max-w-2xl mb-8">
        <h1 className="text-4xl font-bold mb-6">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-12 h-12 bg-secondary border-border text-lg"
          />
        </div>
      </div>

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
      ) : results.length > 0 ? (
        <>
          <h2 className="text-2xl font-bold mb-6">Results for "{query}"</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {results.map((track) => (
              <TrackCard key={track.id} track={track} />
            ))}
          </div>
        </>
      ) : query.length >= 2 ? (
        <div className="text-center text-muted-foreground mt-12">
          <p>No results found for "{query}"</p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground mt-12">
          <p>Start typing to search for music</p>
        </div>
      )}
    </div>
  );
};

export default Search;
