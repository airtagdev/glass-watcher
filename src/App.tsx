import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { AppLoader } from "@/components/AppLoader";
import { ScrollToTop } from "@/components/ScrollToTop";
import { DisclaimerModal } from "@/components/DisclaimerModal";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncGate } from "@/components/SyncGate";
import Index from "./pages/Index";
import StocksPage from "./pages/StocksPage";
import CryptoPage from "./pages/CryptoPage";
import PortfolioPage from "./pages/PortfolioPage";
import NewsPage from "./pages/NewsPage";
import TrendingPage from "./pages/TrendingPage";
import NotFound from "./pages/NotFound";
import MarketMapPage from "./pages/MarketMapPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DisclaimerModal />
          <SyncGate />
          <ScrollToTop />
          <AppLoader>
            <div className="min-h-screen bg-background">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/stocks" element={<StocksPage />} />
                <Route path="/crypto" element={<CryptoPage />} />
                <Route path="/portfolio" element={<PortfolioPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/market-map" element={<MarketMapPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNav />
            </div>
          </AppLoader>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
