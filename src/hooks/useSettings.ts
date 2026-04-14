import { useState, useCallback, useEffect } from "react";

const SETTINGS_KEY = "app-settings";

export interface AppSettings {
  showConfidenceScore: boolean;
  pushNotificationsEnabled: boolean;
}

const defaults: AppSettings = {
  showConfidenceScore: true,
  pushNotificationsEnabled: false,
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(load);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetAllData = useCallback(() => {
    localStorage.removeItem("ticker-portfolio");
    localStorage.removeItem("ticker-watchlist");
    localStorage.removeItem("ticker-pinned");
    localStorage.removeItem("disclaimer_accepted");
    localStorage.removeItem(SETTINGS_KEY);
    window.location.reload();
  }, []);

  return { settings, update, resetAllData };
}
