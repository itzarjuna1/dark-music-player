import { Home, Search, Library, Music2, LogOut, User, Settings, Clock, Sparkles, Users, Crown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <Music2 className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            MUSIFY
          </h1>
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
              <span className={`font-medium ${item.highlight ? 'gradient-text' : ''}`}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {user ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
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
