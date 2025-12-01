import { useState } from 'react';
import { Sparkles, Coffee, Dumbbell, Moon, Sun, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TrackCard from '@/components/TrackCard';
import { supabase } from '@/integrations/supabase/client';
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

const Discover = () => {
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const moods = [
    { id: 'happy', name: 'Happy', icon: Sparkles, color: 'from-yellow-500 to-orange-500' },
    { id: 'energetic', name: 'Energetic', icon: Dumbbell, color: 'from-red-500 to-pink-500' },
    { id: 'relaxed', name: 'Relaxed', icon: Coffee, color: 'from-blue-500 to-cyan-500' },
    { id: 'focus', name: 'Focus', icon: BookOpen, color: 'from-purple-500 to-indigo-500' },
    { id: 'sleep', name: 'Sleep', icon: Moon, color: 'from-indigo-500 to-blue-900' },
    { id: 'morning', name: 'Morning', icon: Sun, color: 'from-orange-400 to-yellow-400' },
  ];

  const activities = [
    { id: 'workout', name: 'Workout', queries: ['workout music', 'gym motivation'] },
    { id: 'study', name: 'Study', queries: ['study music', 'focus instrumental'] },
    { id: 'party', name: 'Party', queries: ['party music', 'dance hits'] },
    { id: 'chill', name: 'Chill', queries: ['chill music', 'relaxing vibes'] },
  ];

  const getRecommendations = async (mood: string, activity?: string) => {
    setLoading(true);
    setSelectedMood(mood);
    
    try {
      const timeOfDay = new Date().getHours() < 12 ? 'morning' : 
                       new Date().getHours() < 18 ? 'afternoon' : 'evening';

      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { mood, activity, timeOfDay }
      });

      if (error) throw error;

      // Fetch tracks for each query
      const allTracks: Track[] = [];
      for (const query of data.queries) {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`
        );
        const result = await response.json();
        
        const fetchedTracks = result.results
          .filter((item: any) => item.previewUrl)
          .map((item: any) => ({
            id: item.trackId,
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            cover: item.artworkUrl100.replace('100x100', '300x300'),
            preview: item.previewUrl,
            duration: Math.floor(item.trackTimeMillis / 1000),
          }));
        
        allTracks.push(...fetchedTracks);
      }

      // Remove duplicates and shuffle
      const uniqueTracks = Array.from(new Map(allTracks.map(t => [t.id, t])).values())
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      setTracks(uniqueTracks);
      toast.success('Recommendations loaded!');
    } catch (error) {
      console.error('Error getting recommendations:', error);
      toast.error('Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 gradient-text">Discover Music</h1>
        <p className="text-muted-foreground mb-8">AI-powered recommendations tailored to your mood and activity</p>

        {/* Mood Selector */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How are you feeling?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {moods.map((mood) => (
              <button
                key={mood.id}
                onClick={() => getRecommendations(mood.id)}
                disabled={loading}
                className={`
                  relative p-6 rounded-xl bg-gradient-to-br ${mood.color} 
                  hover:scale-105 smooth-transition hover-glow glass
                  ${selectedMood === mood.id ? 'ring-4 ring-primary' : ''}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <mood.icon className="w-8 h-8 text-white mb-2 mx-auto" />
                <p className="text-white font-semibold">{mood.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Selector */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What are you doing?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activities.map((activity) => (
              <Button
                key={activity.id}
                onClick={() => getRecommendations('any', activity.id)}
                disabled={loading}
                variant="outline"
                className="h-20 text-lg hover-glow"
              >
                {activity.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-2" />
                <div className="h-4 bg-muted rounded mb-1" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && tracks.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Your Personalized Mix</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </div>
        )}

        {!loading && tracks.length === 0 && (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
            <p className="text-muted-foreground text-lg">
              Select a mood or activity to discover personalized music
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;
