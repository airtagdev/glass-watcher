import { Home, TrendingUp, Bitcoin, Briefcase, MoreHorizontal, Newspaper, Flame, Map, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* More menu */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="fixed bottom-[4.5rem] right-4 z-50 glass border border-glass-border/30 rounded-2xl p-2 min-w-[200px]"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-glass-border to-transparent" />
        <div className="bg-glass/70 backdrop-blur-2xl">
          <div className="flex items-center justify-around h-16 pb-safe max-w-lg mx-auto relative">
            {mainTabs.map((tab) => {
              const active = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => {
                    navigate(tab.path);
                    setMoreOpen(false);
                  }}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors duration-200 active:animate-scale-press ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary/15 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <motion.div
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <tab.icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                  </motion.div>
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors duration-200 active:animate-scale-press ${
                isMoreActive || moreOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isMoreActive && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary/15 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isMoreActive || moreOpen ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <MoreHorizontal className={`w-5 h-5 ${isMoreActive ? "stroke-[2.5]" : ""}`} />
              </motion.div>
              <span className="text-[9px] font-medium">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
