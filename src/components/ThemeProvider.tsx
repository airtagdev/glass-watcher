import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";

/**
 * Applies the current theme to <html> by toggling theme classes.
 * Default theme ("obsidian") = no class. Alternate themes = `theme-{name}`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-aurora");
    if (settings.theme === "aurora") root.classList.add("theme-aurora");
  }, [settings.theme]);

  return <>{children}</>;
}
