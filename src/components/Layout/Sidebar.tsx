import { Home, Search, Library, Music2, User, Settings, Clock, Sparkles, Users, Crown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import WallpaperSettings from '@/components/WallpaperSettings';
import ThemeToggle from '@/components/ThemeToggle';

const Sidebar = () => {
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
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col relative z-20">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌙</span>
            <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">
              ✦ ᴜᴘᴘєʀϻσσɴ ᴛᴜηєꜱ 🎶
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
    </aside>
  );
};

export default Sidebar;
