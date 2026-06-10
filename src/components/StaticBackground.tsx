import { useState, useEffect } from 'react';
import catImage from '@/assets/cat-decoration.jpg';

const StaticBackground = () => {
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);

  useEffect(() => {
    const savedWallpaper = localStorage.getItem('musify-wallpaper');
    if (savedWallpaper) {
      setCustomWallpaper(savedWallpaper);
    }

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
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Custom wallpaper layer */}
      {customWallpaper && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: `url(${customWallpaper})`,
            opacity: 0.3
          }}
        />
      )}
      
      {/* Cat decoration — right side to avoid sidebar overlap */}
      <div className="absolute right-3 bottom-28 opacity-15 md:opacity-30 md:right-4 md:bottom-24">
        <img
          src={catImage}
          alt="Decoration"
          className="w-16 h-16 md:w-24 md:h-24 object-cover rounded-full rotate-[-15deg]"
        />
      </div>
    </div>
  );
};

export default StaticBackground;
