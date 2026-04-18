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
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase.from("price_alerts").select("*");
    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("device_id", getDeviceId()).is("user_id", null);
    }
    const { data } = await query;
    return data ?? [];
  } catch {
    return [];
  }
}

async function fetchCloudIfSignedIn(): Promise<{
  watchlist: unknown[];
  pinnedIds: string[];
  portfolio: unknown[];
  settings: Record<string, unknown>;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: wl }, { data: pf }, { data: st }] = await Promise.all([
    supabase.from("user_watchlist").select("*").eq("user_id", user.id),
    supabase.from("user_portfolio").select("*").eq("user_id", user.id),
    supabase.from("user_settings").select("settings").eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    watchlist: (wl ?? []).map((w: any) => ({ id: w.ticker_id, symbol: w.symbol, name: w.name, type: w.type })),
    pinnedIds: (wl ?? []).filter((w: any) => w.pinned).map((w: any) => w.ticker_id),
    portfolio: (pf ?? []).map((t: any) => ({
      id: t.id,
      tickerId: t.ticker_id,
      tickerSymbol: t.ticker_symbol,
      tickerName: t.ticker_name,
      tickerType: t.ticker_type,
      type: t.trade_type,
      price: Number(t.price),
      quantity: Number(t.quantity),
      date: t.trade_date,
    })),
    settings: (st?.settings as Record<string, unknown>) ?? {},
  };
}

export async function exportData(): Promise<void> {
  const cloud = await fetchCloudIfSignedIn();
  const alerts = await fetchAlerts();

  const data: AppExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    watchlist: cloud?.watchlist ?? ((safeJSON(KEYS.watchlist) as unknown[]) ?? []),
    pinnedIds: cloud?.pinnedIds ?? ((safeJSON(KEYS.pinned) as string[]) ?? []),
    portfolio: cloud?.portfolio ?? ((safeJSON(KEYS.portfolio) as unknown[]) ?? []),
    settings: cloud?.settings ?? ((safeJSON(KEYS.settings) as Record<string, unknown>) ?? {}),
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

        if (Array.isArray(data.watchlist)) localStorage.setItem(KEYS.watchlist, JSON.stringify(data.watchlist));
        if (Array.isArray(data.pinnedIds)) localStorage.setItem(KEYS.pinned, JSON.stringify(data.pinnedIds));
        if (Array.isArray(data.portfolio)) localStorage.setItem(KEYS.portfolio, JSON.stringify(data.portfolio));
        if (data.settings && typeof data.settings === "object") {
          localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
        }

        const { data: { user } } = await supabase.auth.getUser();

        // Restore alerts
        if (Array.isArray(data.alerts) && data.alerts.length > 0) {
          if (user) {
            await supabase.from("price_alerts").delete().eq("user_id", user.id);
            const rows = data.alerts.map((a: any) => ({
              device_id: getDeviceId(),
              user_id: user.id,
              ticker_symbol: a.ticker_symbol,
              ticker_name: a.ticker_name,
              ticker_type: a.ticker_type,
              alert_type: a.alert_type,
              value: a.value,
              direction: a.direction || null,
              triggered: a.triggered ?? false,
            }));
            await supabase.from("price_alerts").insert(rows);
          } else {
            const deviceId = getDeviceId();
            await supabase.from("price_alerts").delete().eq("device_id", deviceId).is("user_id", null);
            const rows = data.alerts.map((a: any) => ({
              device_id: deviceId,
              user_id: null,
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
        }

        // If signed in, also push imported data to cloud
        if (user) {
          if (Array.isArray(data.watchlist)) {
            await supabase.from("user_watchlist").delete().eq("user_id", user.id);
            if (data.watchlist.length) {
              await supabase.from("user_watchlist").insert(
                (data.watchlist as any[]).map((w, idx) => ({
                  user_id: user.id,
                  ticker_id: w.id,
                  symbol: w.symbol,
                  name: w.name,
                  type: w.type,
                  pinned: (data.pinnedIds ?? []).includes(w.id),
                  sort_order: idx,
                }))
              );
            }
          }
          if (Array.isArray(data.portfolio)) {
            await supabase.from("user_portfolio").delete().eq("user_id", user.id);
            if (data.portfolio.length) {
              await supabase.from("user_portfolio").insert(
                (data.portfolio as any[]).map((t) => ({
                  id: t.id,
                  user_id: user.id,
                  ticker_id: t.tickerId,
                  ticker_symbol: t.tickerSymbol,
                  ticker_name: t.tickerName,
                  ticker_type: t.tickerType,
                  trade_type: t.type,
                  price: t.price,
                  quantity: t.quantity,
                  trade_date: t.date,
                }))
              );
            }
          }
          if (data.settings && typeof data.settings === "object") {
            await supabase
              .from("user_settings")
              .upsert({ user_id: user.id, settings: data.settings as any }, { onConflict: "user_id" });
          }
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
