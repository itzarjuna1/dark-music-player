import { useState, useEffect } from 'react';
import { Home, Search, Library, Music2, LogOut, User, Settings, Clock, Sparkles, Users, Crown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import WallpaperSettings from '@/components/WallpaperSettings';
import ThemeToggle from '@/components/ThemeToggle';

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/discover', icon: Sparkles, label: 'Discover' },
    { to: '/library', icon: Library, label: 'Your Library' },
    { to: '/community', icon: Users, label: 'Community' },
    { to: '/history', icon: Clock, label: 'History' },
    { to: '/premium', icon: Crown, label: 'Premium', highlight: true },
    { to: '/profile', icon: Settings, label: 'Profile' },
  ];

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Music2 className="w-8 h-8 text-foreground" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              MUSIFY
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <WallpaperSettings />
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent smooth-transition ${
                item.highlight ? 'bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30' : ''
              }`}
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
            >
              <item.icon className={`w-5 h-5 ${item.highlight ? 'text-primary' : ''}`} />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {user ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <Avatar className="w-10 h-10">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{displayName}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            Sign In
          </Button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
