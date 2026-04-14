import { Home, TrendingUp, Bitcoin, Briefcase, MoreHorizontal, Newspaper, Flame, Map, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const mainTabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/stocks", icon: TrendingUp, label: "Stocks" },
  { path: "/crypto", icon: Bitcoin, label: "Crypto" },
  { path: "/portfolio", icon: Briefcase, label: "Portfolio" },
];

const moreTabs = [
  { path: "/news", icon: Newspaper, label: "News" },
  { path: "/trending", icon: Flame, label: "Trending" },
  { path: "/market-map", icon: Map, label: "Market Map" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isMoreActive = moreTabs.some((t) => t.path === location.pathname);

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu */}
      {moreOpen && (
        <div className="fixed bottom-[4.5rem] right-4 z-50 glass border border-glass-border/30 rounded-2xl p-2 min-w-[200px] animate-fade-in">
          {moreTabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => {
                  navigate(tab.path);
                  setMoreOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
                  active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-glass-border/30">
        <div className="flex items-center justify-around h-16 pb-safe max-w-lg mx-auto">
          {mainTabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => {
                  navigate(tab.path);
                  setMoreOpen(false);
                }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[9px] font-medium">{tab.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
              isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? "stroke-[2.5]" : ""}`} />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
