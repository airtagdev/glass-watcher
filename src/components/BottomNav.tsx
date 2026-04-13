import { Home, TrendingUp, Bitcoin, Newspaper, Flame, Briefcase } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/stocks", icon: TrendingUp, label: "Stocks" },
  { path: "/crypto", icon: Bitcoin, label: "Crypto" },
  { path: "/news", icon: Newspaper, label: "News" },
  { path: "/trending", icon: Flame, label: "Trending" },
  { path: "/portfolio", icon: Briefcase, label: "Portfolio" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-glass-border/30">
      <div className="flex items-center justify-around h-16 pb-safe max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
