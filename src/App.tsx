import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "@/contexts/PlayerContext";
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
import StaticBackground from "./components/StaticBackground";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PlayerProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex h-screen overflow-hidden relative">
            <StaticBackground />
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Player />
          </div>
        </BrowserRouter>
      </PlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
