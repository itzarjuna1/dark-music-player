import { useState, useEffect } from 'react';
import catImage from '@/assets/cat-decoration.jpg';

const StaticBackground = () => {
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);

  useEffect(() => {
    const savedWallpaper = localStorage.getItem('musify-wallpaper');
    if (savedWallpaper) {
      setCustomWallpaper(savedWallpaper);
    }

    // Listen for wallpaper changes
    const handleStorageChange = () => {
      const wallpaper = localStorage.getItem('musify-wallpaper');
      setCustomWallpaper(wallpaper);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('wallpaper-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wallpaper-changed', handleStorageChange);
    };
  }, []);

  return (
    <>
      {/* Custom wallpaper layer */}
      {customWallpaper && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${customWallpaper})`,
            opacity: 0.3
          }}
        />
      )}
      
      {/* Rotating cat decoration on left side */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
        <img
          src={catImage}
          alt="Decoration"
          className="w-32 h-32 object-cover rounded-full opacity-40 rotate-[-15deg] shadow-lg"
          style={{
            filter: 'blur(0.5px)',
            border: '2px solid hsl(var(--primary) / 0.3)'
          }}
        />
      </div>
    </>
  );
};

export default StaticBackground;
