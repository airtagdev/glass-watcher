import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(load);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Sync from cloud when signed in
  useEffect(() => {
    if (!user) return;
    let active = true;

    const fetchCloud = async () => {
      const { data } = await supabase.from("user_settings").select("settings").eq("user_id", user.id).maybeSingle();
      if (!active) return;
      if (data?.settings) {
        setSettings((prev) => ({ ...prev, ...(data.settings as Partial<AppSettings>) }));
      }
    };
    fetchCloud();

    const channel = supabase
      .channel(`user_settings:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newSettings = (payload.new as any)?.settings;
          if (newSettings) setSettings((prev) => ({ ...prev, ...newSettings }));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const update = useCallback(
    (partial: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        if (user) {
          supabase
            .from("user_settings")
            .upsert({ user_id: user.id, settings: next as any }, { onConflict: "user_id" })
            .then();
        }
        return next;
      });
    },
    [user]
  );

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
