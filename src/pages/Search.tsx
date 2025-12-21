import { useState } from 'react';
import { Search as SearchIcon, Sparkles, Music, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TrackCard from '@/components/TrackCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useJamendoSearch, JamendoTrack } from '@/hooks/useJamendoSearch';
import { Badge } from '@/components/ui/badge';

interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
  source?: 'itunes' | 'jamendo';
}

type SearchSource = 'itunes' | 'jamendo' | 'both';

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>('both');
  
  const { tracks: jamendoTracks, loading: jamendoLoading, searchJamendo } = useJamendoSearch();

  const handleSmartSearch = async (naturalQuery: string) => {
    if (!naturalQuery || naturalQuery.length < 3) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('smart-search', {
        body: { query: naturalQuery }
      });

      if (error) throw error;
      
      await handleSearch(data.searchTerm);
      toast.success(`Searching for: ${data.searchTerm}`);
    } catch (error) {
      console.error('Error with smart search:', error);
      toast.error('Smart search failed, using regular search');
      await handleSearch(naturalQuery);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    try {
      const promises: Promise<Track[]>[] = [];
      
      // Search iTunes (30-second previews)
      if (searchSource === 'itunes' || searchSource === 'both') {
        promises.push(
          fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=music&entity=song&limit=30`)
            .then(res => res.json())
            .then(data => 
              data.results
                .filter((track: any) => track.previewUrl)
                .map((track: any) => ({
                  id: track.trackId,
                  title: track.trackName,
                  artist: track.artistName,
                  album: track.collectionName,
                  cover: track.artworkUrl100.replace('100x100', '600x600'),
                  preview: track.previewUrl,
                  duration: Math.floor(track.trackTimeMillis / 1000),
                  source: 'itunes' as const,
                }))
            )
            .catch(() => [])
        );
      }
      
      // Search Jamendo (full tracks!)
      if (searchSource === 'jamendo' || searchSource === 'both') {
        promises.push(
          supabase.functions.invoke('jamendo-search', {
            body: { query: searchQuery, limit: 30 }
          })
            .then(({ data, error }) => {
              if (error) throw error;
              return (data.tracks || []).map((track: any) => ({
                ...track,
                source: 'jamendo' as const,
              }));
            })
            .catch(() => [])
        );
      }
      
      const allResults = await Promise.all(promises);
      const combinedResults = allResults.flat();
      
      // Interleave results if both sources are used
      if (searchSource === 'both' && allResults.length === 2) {
        const [itunesResults, jamendoResults] = allResults;
        const interleaved: Track[] = [];
        const maxLength = Math.max(itunesResults.length, jamendoResults.length);
        
        for (let i = 0; i < maxLength; i++) {
          if (i < jamendoResults.length) interleaved.push(jamendoResults[i]);
          if (i < itunesResults.length) interleaved.push(itunesResults[i]);
        }
        setResults(interleaved);
      } else {
        setResults(combinedResults);
      }
    } catch (error) {
      console.error('Error searching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || jamendoLoading;

  return (
    <div className="flex-1 overflow-y-auto pb-32 p-8 animate-fade-in">
      <div className="max-w-3xl mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-4xl font-bold gradient-text">Search</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSmartSearchEnabled(!smartSearchEnabled)}
              variant={smartSearchEnabled ? 'default' : 'outline'}
              size="sm"
              className="hover-glow"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Smart
            </Button>
          </div>
        </div>
        
        {/* Source Toggle */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-muted-foreground">Source:</span>
          <Button
            onClick={() => { setSearchSource('both'); if (query.length >= 2) handleSearch(query); }}
            variant={searchSource === 'both' ? 'default' : 'outline'}
            size="sm"
          >
            All
          </Button>
          <Button
            onClick={() => { setSearchSource('jamendo'); if (query.length >= 2) handleSearch(query); }}
            variant={searchSource === 'jamendo' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Radio className="w-4 h-4" />
            Jamendo
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">Full Track</Badge>
          </Button>
          <Button
            onClick={() => { setSearchSource('itunes'); if (query.length >= 2) handleSearch(query); }}
            variant={searchSource === 'itunes' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Music className="w-4 h-4" />
            iTunes
            <Badge variant="secondary" className="text-xs">Preview</Badge>
          </Button>
        </div>
        
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={smartSearchEnabled ? "Try: 'songs that make me happy' or 'music for studying'" : "What do you want to listen to?"}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && smartSearchEnabled && query) {
                handleSmartSearch(query);
              }
            }}
            className="pl-12 h-12 bg-card border-border text-lg glass hover-glow"
          />
        </div>
        {smartSearchEnabled && (
          <p className="text-sm text-muted-foreground mt-2">
            💡 Use natural language! Try "workout music" or "relaxing jazz for studying"
          </p>
        )}
        {searchSource === 'jamendo' && (
          <p className="text-sm text-green-400 mt-2">
            🎵 Jamendo tracks are royalty-free and play in full!
          </p>
        )}
      </div>

      {isLoading ? (
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
          <h2 className="text-2xl font-bold mb-6">
            Results for "{query}"
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({results.length} tracks)
            </span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {results.map((track, index) => (
              <div key={`${track.source}-${track.id}-${index}`} className="relative">
                {track.source === 'jamendo' && (
                  <Badge 
                    className="absolute top-2 left-2 z-10 bg-green-500/90 text-white text-xs"
                  >
                    Full Track
                  </Badge>
                )}
                <TrackCard track={track} />
              </div>
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
          <p className="text-sm mt-2">
            Switch to <span className="text-green-400 font-medium">Jamendo</span> for free full-track playback!
          </p>
        </div>
      )}
    </div>
  );
};

export default Search;
