import { Music, ListMusic } from 'lucide-react';

const Library = () => {
  return (
    <div className="flex-1 overflow-y-auto pb-32 p-8">
      <h1 className="text-4xl font-bold mb-6">Your Library</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="glass rounded-lg p-8 border border-border hover:border-primary smooth-transition cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Music className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Liked Songs</h2>
          <p className="text-muted-foreground">0 songs</p>
        </div>

        <div className="glass rounded-lg p-8 border border-border hover:border-primary smooth-transition cursor-pointer">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
            <ListMusic className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Playlists</h2>
          <p className="text-muted-foreground">0 playlists</p>
        </div>
      </div>

      <div className="mt-12 text-center max-w-md mx-auto">
        <p className="text-muted-foreground mb-4">
          Start building your music library by searching for your favorite songs and artists.
        </p>
        <button className="px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:scale-105 smooth-transition glow">
          Explore Music
        </button>
      </div>
    </div>
  );
};

export default Library;
