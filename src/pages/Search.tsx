import { useState } from 'react';
import { Search as SearchIcon, Sparkles, Music, Radio, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TrackCard from '@/components/TrackCard';
import YouTubePlayer from '@/components/YouTubePlayer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useJamendoSearch } from '@/hooks/useJamendoSearch';
import { YouTubeTrack } from '@/hooks/useYouTubeSearch';
import { Badge } from '@/components/ui/badge';
import { usePlayer } from '@/contexts/PlayerContext';

interface Track {
  id: number | string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  preview: string;
  duration: number;
  source?: 'itunes' | 'jamendo' | 'youtube';
  videoId?: string;
}

type SearchSource = 'itunes' | 'jamendo' | 'youtube' | 'all';

const Search = () => {
  const { playTrack } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [smartSearchEnabled, setSmartSearchEnabled] = useState(false);
  const [searchSource, setSearchSource] = useState<SearchSource>('youtube');
  
  // YouTube Player state
  const [youtubeTrack, setYoutubeTrack] = useState<YouTubeTrack | null>(null);
  const [youtubeQueue, setYoutubeQueue] = useState<YouTubeTrack[]>([]);
  const [currentYoutubeIndex, setCurrentYoutubeIndex] = useState(0);
  
  const { loading: jamendoLoading } = useJamendoSearch();

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
      
      // Search YouTube (full songs via embedded player!)
      if (searchSource === 'youtube' || searchSource === 'all') {
        promises.push(
          supabase.functions.invoke('youtube-search', {
            body: { query: searchQuery, limit: 30 }
          })
            .then(({ data, error }) => {
              if (error) throw error;
              const ytTracks = (data.tracks || []).map((track: any) => ({
                id: track.id,
                title: track.title,
                artist: track.artist,
                album: 'YouTube',
                cover: track.thumbnail,
                preview: `https://youtube.com/watch?v=${track.id}`,
                duration: track.duration,
                source: 'youtube' as const,
                videoId: track.id,
              }));
              // Store for queue
              setYoutubeQueue(data.tracks || []);
              return ytTracks;
            })
            .catch((err) => {
              console.error('YouTube search error:', err);
              return [];
            })
        );
      }
      
      // Search iTunes (30-second previews)
      if (searchSource === 'itunes' || searchSource === 'all') {
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
      if (searchSource === 'jamendo' || searchSource === 'all') {
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
      
      // Interleave results if multiple sources are used
      if (searchSource === 'all' && allResults.length > 1) {
        const interleaved: Track[] = [];
        const maxLength = Math.max(...allResults.map(arr => arr.length));
        
        for (let i = 0; i < maxLength; i++) {
          for (const sourceResults of allResults) {
            if (i < sourceResults.length) {
              interleaved.push(sourceResults[i]);
            }
          }
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

  const handleTrackClick = (track: Track) => {
    if (track.source === 'youtube' && track.videoId) {
      const ytTrack: YouTubeTrack = {
        id: track.videoId,
        title: track.title,
        artist: track.artist,
        album: 'YouTube',
        thumbnail: track.cover,
        duration: track.duration,
        source: 'youtube',
      };
      setYoutubeTrack(ytTrack);
      const idx = youtubeQueue.findIndex(t => t.id === track.videoId);
      setCurrentYoutubeIndex(idx >= 0 ? idx : 0);

      // Also update the PlayerContext so the bottom bar shows the track
      playTrack({
        id: typeof track.id === 'string' ? parseInt(track.id.replace(/\D/g, '').slice(0, 8) || '0', 10) || Date.now() : track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        cover: track.cover,
        preview: '', // YouTube doesn't use audio preview
        duration: track.duration,
        videoId: track.videoId,
      });
    }
  };

  const handleYoutubeNext = () => {
    if (youtubeQueue.length === 0) return;
    const nextIndex = (currentYoutubeIndex + 1) % youtubeQueue.length;
    setCurrentYoutubeIndex(nextIndex);
    setYoutubeTrack(youtubeQueue[nextIndex]);
  };

  const handleYoutubePrevious = () => {
    if (youtubeQueue.length === 0) return;
    const prevIndex = currentYoutubeIndex === 0 ? youtubeQueue.length - 1 : currentYoutubeIndex - 1;
    setCurrentYoutubeIndex(prevIndex);
    setYoutubeTrack(youtubeQueue[prevIndex]);
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
            onClick={() => { setSearchSource('all'); if (query.length >= 2) handleSearch(query); }}
            variant={searchSource === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            All
          </Button>
          <Button
            onClick={() => { setSearchSource('youtube'); if (query.length >= 2) handleSearch(query); }}
            variant={searchSource === 'youtube' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Youtube className="w-4 h-4" />
            YouTube
            <Badge variant="secondary" className="border border-destructive/30 text-destructive/70 text-xs">Full Song</Badge>
          </Button>
          <Button
            onClick={() => { setSearchSource('jamendo'); if (query.length >= 2) handleSearch(query); }}
            variant={searchSource === 'jamendo' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <Radio className="w-4 h-4" />
            Jamendo
            <Badge variant="secondary" className="border border-primary/30 text-primary/70 text-xs">Full Track</Badge>
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
        {searchSource === 'youtube' && (
          <p className="text-sm text-destructive mt-2">
            🎬 YouTube plays full songs via embedded player!
          </p>
        )}
        {searchSource === 'jamendo' && (
          <p className="text-sm text-primary mt-2">
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
              <div 
                key={`${track.source}-${track.id}-${index}`} 
                className="relative"
                onClick={() => track.source === 'youtube' ? handleTrackClick(track) : undefined}
              >
                {track.source === 'youtube' && (
                  <Badge 
                    className="absolute top-12 left-2 z-10 bg-destructive text-white text-xs"
                  >
                    YouTube
                  </Badge>
                )}
                {track.source === 'jamendo' && (
                  <Badge 
                    className="absolute top-12 left-2 z-10 bg-primary text-white text-xs"
                  >
                    Full Track
                  </Badge>
                )}
                <TrackCard 
                  track={{
                    id: typeof track.id === 'string' ? parseInt(track.id.replace(/\D/g, '').slice(0, 8) || '0', 10) || Date.now() : track.id,
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    cover: track.cover,
                    preview: track.preview,
                    duration: track.duration,
                    source: track.source,
                    videoId: track.videoId,
                  }} 
                  onCustomClick={track.source === 'youtube' ? () => handleTrackClick(track) : undefined}
                />
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
            Try <span className="text-destructive font-medium">YouTube</span> for full-length songs!
          </p>
        </div>
      )}

      {/* YouTube Player */}
      {youtubeTrack && (
        <YouTubePlayer
          videoId={youtubeTrack.id}
          title={youtubeTrack.title}
          artist={youtubeTrack.artist}
          thumbnail={youtubeTrack.thumbnail}
          onClose={() => setYoutubeTrack(null)}
          onNext={handleYoutubeNext}
          onPrevious={handleYoutubePrevious}
        />
      )}
    </div>
  );
};

export default Search;
