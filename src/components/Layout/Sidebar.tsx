import { useEffect, useState } from 'react';
import { Home, Search, Library, User, Settings, Clock, Sparkles, Users, Crown, Code, Menu, X } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import WallpaperSettings from '@/components/WallpaperSettings';
import ThemeToggle from '@/components/ThemeToggle';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/discover', icon: Sparkles, label: 'Discover' },
  { to: '/library', icon: Library, label: 'Your Library' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/developer', icon: Code, label: 'Developer Portal', highlight: 'dev' as const },
  { to: '/premium', icon: Crown, label: 'Premium', highlight: 'premium' as const },
  { to: '/profile', icon: Settings, label: 'Profile' },
];

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close drawer when route changes
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const SidebarContent = (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">🌙</span>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground leading-tight truncate">
            ✦ ᴜᴘᴘєʀϻσσɴ ᴛᴜηєꜱ
          </h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <WallpaperSettings />
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-2 rounded-lg hover:bg-sidebar-accent smooth-transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={cn(
              'flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent smooth-transition select-none',
              item.highlight === 'premium' && 'bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/25',
              item.highlight === 'dev' && 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20'
            )}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
          >
            <item.icon
              className={cn(
                'w-5 h-5 shrink-0',
                item.highlight === 'premium' && 'text-primary',
                item.highlight === 'dev' && 'text-blue-500'
              )}
            />
            <span className="font-medium text-sm sm:text-base truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-card/80 backdrop-blur border border-border shadow-md smooth-transition active:scale-95"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-30 animate-fade-in"
        />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <aside
        className={cn(
          'bg-sidebar border-r border-sidebar-border flex flex-col z-40',
          'fixed md:static inset-y-0 left-0',
          'w-64 max-w-[85vw]',
          'transform smooth-transition will-change-transform',
          'overflow-y-auto',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {SidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
