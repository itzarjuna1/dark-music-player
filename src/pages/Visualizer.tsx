import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MusicVisualizer from '@/components/MusicVisualizer';
import { usePlayer } from '@/contexts/PlayerContext';

const Visualizer = () => {
  const navigate = useNavigate();
  const { currentTrack } = usePlayer();
  const [mode, setMode] = useState<'bars' | 'circular' | 'wave'>('bars');

  if (!currentTrack) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No track playing</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-card to-background z-50 flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-center glass">
        <div className="flex items-center gap-4">
          <img src={currentTrack.cover} alt="" className="w-16 h-16 rounded-lg" />
          <div>
            <p className="font-bold text-xl gradient-text">{currentTrack.title}</p>
            <p className="text-muted-foreground">{currentTrack.artist}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMode('bars')}
            className={mode === 'bars' ? 'bg-primary text-primary-foreground' : ''}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMode('circular')}
            className={mode === 'circular' ? 'bg-primary text-primary-foreground' : ''}
          >
            ◉
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMode('wave')}
            className={mode === 'wave' ? 'bg-primary text-primary-foreground' : ''}
          >
            ~
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Visualizer */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-6xl aspect-video bg-card/50 rounded-2xl overflow-hidden glass">
          <MusicVisualizer mode={mode} />
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
