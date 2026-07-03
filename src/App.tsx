import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { AuthProvider } from "@/hooks/useAuth";
import Sidebar from "@/components/Layout/Sidebar";
import Player from "@/components/Layout/Player";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Discover from "./pages/Discover";
import Library from "./pages/Library";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Visualizer from "./pages/Visualizer";
import Premium from "./pages/Premium";
import NotFound from "./pages/NotFound";
import DeveloperPortal from "./pages/DeveloperPortal";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import BotFather from "./pages/BotFather";
import StaticBackground from "./components/StaticBackground";

import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  // Initialize Telegram WebApp if running inside Telegram
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('secondary_bg_color');
        document.documentElement.classList.add('tg-webapp');
      } catch {}
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <PlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex h-[100dvh] overflow-hidden relative">
              <StaticBackground />
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden relative z-10 pt-12 md:pt-0">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/visualizer" element={<Visualizer />} />
                  <Route path="/premium" element={<Premium />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/developer" element={<DeveloperPortal />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/botfather" element={<BotFather />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Player />
            </div>
          </BrowserRouter>
        </PlayerProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
