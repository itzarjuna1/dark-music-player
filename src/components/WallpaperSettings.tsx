import { useState, useRef } from 'react';
import { Image, Upload, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const WallpaperSettings = () => {
  const [open, setOpen] = useState(false);
  const [currentWallpaper, setCurrentWallpaper] = useState<string | null>(
    () => localStorage.getItem('musify-wallpaper')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      localStorage.setItem('musify-wallpaper', dataUrl);
      setCurrentWallpaper(dataUrl);
      window.dispatchEvent(new Event('wallpaper-changed'));
      toast.success('Wallpaper updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveWallpaper = () => {
    localStorage.removeItem('musify-wallpaper');
    setCurrentWallpaper(null);
    window.dispatchEvent(new Event('wallpaper-changed'));
    toast.success('Wallpaper removed');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Image className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Background Wallpaper</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentWallpaper ? (
            <div className="relative">
              <img
                src={currentWallpaper}
                alt="Current wallpaper"
                className="w-full h-40 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveWallpaper}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="w-full h-40 bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">No wallpaper set</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full btn-rgb text-primary-foreground"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Wallpaper
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WallpaperSettings;
