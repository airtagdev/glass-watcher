import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";

export interface AppExportData {
  version: 1;
  exportedAt: string;
  watchlist: unknown[];
  pinnedIds: string[];
  portfolio: unknown[];
  settings: Record<string, unknown>;
  alerts: unknown[];
}

const KEYS = {
  watchlist: "ticker-watchlist",
  pinned: "ticker-pinned",
  portfolio: "ticker-portfolio",
  settings: "app-settings",
};

function safeJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function fetchAlerts(): Promise<unknown[]> {
  try {
    const deviceId = getDeviceId();
    const { data } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("device_id", deviceId);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function exportData(): Promise<void> {
  const alerts = await fetchAlerts();

  const data: AppExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    watchlist: (safeJSON(KEYS.watchlist) as unknown[]) ?? [],
    pinnedIds: (safeJSON(KEYS.pinned) as string[]) ?? [],
    portfolio: (safeJSON(KEYS.portfolio) as unknown[]) ?? [],
    settings: (safeJSON(KEYS.settings) as Record<string, unknown>) ?? {},
    alerts,
  };

  const filename = `tradex-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "TradeX Data Export" });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export function importData(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string) as AppExportData;

        if (!data.version || !data.exportedAt) {
          resolve({ success: false, error: "Invalid backup file format" });
          return;
        }

        if (Array.isArray(data.watchlist)) {
          localStorage.setItem(KEYS.watchlist, JSON.stringify(data.watchlist));
        }
        if (Array.isArray(data.pinnedIds)) {
          localStorage.setItem(KEYS.pinned, JSON.stringify(data.pinnedIds));
        }
        if (Array.isArray(data.portfolio)) {
          localStorage.setItem(KEYS.portfolio, JSON.stringify(data.portfolio));
        }
        if (data.settings && typeof data.settings === "object") {
          localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
        }

        // Restore alerts to Supabase
        if (Array.isArray(data.alerts) && data.alerts.length > 0) {
          const deviceId = getDeviceId();
          // Clear existing alerts for this device
          await supabase.from("price_alerts").delete().eq("device_id", deviceId);
          // Insert imported alerts (strip id/created_at to let DB regenerate)
          const rows = data.alerts.map((a: any) => ({
            device_id: deviceId,
            ticker_symbol: a.ticker_symbol,
            ticker_name: a.ticker_name,
            ticker_type: a.ticker_type,
            alert_type: a.alert_type,
            value: a.value,
            direction: a.direction || null,
            triggered: a.triggered ?? false,
          }));
          await supabase.from("price_alerts").insert(rows);
        }

        resolve({ success: true });
      } catch {
        resolve({ success: false, error: "Could not parse file" });
      }
    };
    reader.onerror = () => resolve({ success: false, error: "Could not read file" });
    reader.readAsText(file);
  });
}
