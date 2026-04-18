import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceId } from "@/lib/deviceId";
import type { SyncChoice } from "@/components/SyncConflictDialog";

const SYNCED_USERS_KEY = "ticker-synced-users";

interface LocalSnapshot {
  watchlist: any[];
  pinnedIds: string[];
  trades: any[];
  settings: Record<string, any>;
  alerts: any[]; // from DB rows for this device with no user_id
}

interface CloudCounts {
  watchlist: number;
  trades: number;
  alerts: number;
}

function loadLocal(): LocalSnapshot {
  const safe = (k: string) => {
    try {
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch {
      return null;
    }
  };
  return {
    watchlist: safe("ticker-watchlist") ?? [],
    pinnedIds: safe("ticker-pinned") ?? [],
    trades: safe("ticker-portfolio") ?? [],
    settings: safe("app-settings") ?? {},
    alerts: [],
  };
}

function getSyncedUsers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SYNCED_USERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function markUserSynced(userId: string) {
  const set = new Set(getSyncedUsers());
  set.add(userId);
  localStorage.setItem(SYNCED_USERS_KEY, JSON.stringify([...set]));
}

export function useCloudSync() {
  const { user } = useAuth();
  const [needsChoice, setNeedsChoice] = useState(false);
  const [localCounts, setLocalCounts] = useState({ watchlist: 0, trades: 0, alerts: 0 });
  const [cloudCounts, setCloudCounts] = useState<CloudCounts>({ watchlist: 0, trades: 0, alerts: 0 });
  const [snapshot, setSnapshot] = useState<LocalSnapshot | null>(null);
  const [guestAlerts, setGuestAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setNeedsChoice(false);
      return;
    }
    if (getSyncedUsers().includes(user.id)) return;

    let active = true;
    (async () => {
      const local = loadLocal();
      const deviceId = getDeviceId();
      // Pull guest alerts on this device
      const { data: gAlerts } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("device_id", deviceId)
        .is("user_id", null);

      const [{ count: wlCount }, { count: pCount }, { count: aCount }] = await Promise.all([
        supabase.from("user_watchlist").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_portfolio").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("price_alerts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (!active) return;

      const lCounts = {
        watchlist: local.watchlist.length,
        trades: local.trades.length,
        alerts: gAlerts?.length ?? 0,
      };
      const cCounts = {
        watchlist: wlCount ?? 0,
        trades: pCount ?? 0,
        alerts: aCount ?? 0,
      };
      setLocalCounts(lCounts);
      setCloudCounts(cCounts);
      setSnapshot(local);
      setGuestAlerts(gAlerts ?? []);

      const localEmpty = lCounts.watchlist + lCounts.trades + lCounts.alerts === 0;
      const cloudEmpty = cCounts.watchlist + cCounts.trades + cCounts.alerts === 0;

      if (localEmpty && cloudEmpty) {
        markUserSynced(user.id);
      } else if (localEmpty) {
        // Nothing to merge — cloud wins automatically
        markUserSynced(user.id);
      } else if (cloudEmpty) {
        // Auto-upload local → cloud
        await applyChoice("upload", local, gAlerts ?? [], user.id);
        markUserSynced(user.id);
      } else {
        setNeedsChoice(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const choose = useCallback(
    async (choice: SyncChoice) => {
      if (!user || !snapshot) return;
      await applyChoice(choice, snapshot, guestAlerts, user.id);
      markUserSynced(user.id);
      setNeedsChoice(false);
    },
    [user, snapshot, guestAlerts]
  );

  return { needsChoice, localCounts, cloudCounts, choose };
}

async function applyChoice(choice: SyncChoice, local: LocalSnapshot, guestAlerts: any[], userId: string) {
  if (choice === "download") {
    // Wipe local — reload will pull from cloud
    localStorage.removeItem("ticker-watchlist");
    localStorage.removeItem("ticker-pinned");
    localStorage.removeItem("ticker-portfolio");
    localStorage.removeItem("app-settings");
    return;
  }

  if (choice === "upload") {
    // Replace cloud with local
    await supabase.from("user_watchlist").delete().eq("user_id", userId);
    await supabase.from("user_portfolio").delete().eq("user_id", userId);
    await supabase.from("price_alerts").delete().eq("user_id", userId);

    if (local.watchlist.length) {
      await supabase.from("user_watchlist").insert(
        local.watchlist.map((w: any, idx: number) => ({
          user_id: userId,
          ticker_id: w.id,
          symbol: w.symbol,
          name: w.name,
          type: w.type,
          pinned: local.pinnedIds.includes(w.id),
          sort_order: idx,
        }))
      );
    }
    if (local.trades.length) {
      await supabase.from("user_portfolio").insert(
        local.trades.map((t: any) => ({
          id: t.id,
          user_id: userId,
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
    if (Object.keys(local.settings).length) {
      await supabase.from("user_settings").upsert(
        { user_id: userId, settings: local.settings },
        { onConflict: "user_id" }
      );
    }
    // Claim guest alerts
    if (guestAlerts.length) {
      await supabase
        .from("price_alerts")
        .update({ user_id: userId })
        .in(
          "id",
          guestAlerts.map((a: any) => a.id)
        );
    }
    return;
  }

  // merge: upsert (don't delete cloud)
  if (local.watchlist.length) {
    await supabase.from("user_watchlist").upsert(
      local.watchlist.map((w: any, idx: number) => ({
        user_id: userId,
        ticker_id: w.id,
        symbol: w.symbol,
        name: w.name,
        type: w.type,
        pinned: local.pinnedIds.includes(w.id),
        sort_order: idx,
      })),
      { onConflict: "user_id,ticker_id" }
    );
  }
  if (local.trades.length) {
    await supabase.from("user_portfolio").upsert(
      local.trades.map((t: any) => ({
        id: t.id,
        user_id: userId,
        ticker_id: t.tickerId,
        ticker_symbol: t.tickerSymbol,
        ticker_name: t.tickerName,
        ticker_type: t.tickerType,
        trade_type: t.type,
        price: t.price,
        quantity: t.quantity,
        trade_date: t.date,
      })),
      { onConflict: "id" }
    );
  }
  if (Object.keys(local.settings).length) {
    // For settings, prefer cloud values when conflict (only fill missing)
    const { data: existing } = await supabase.from("user_settings").select("settings").eq("user_id", userId).maybeSingle();
    const merged = { ...local.settings, ...((existing?.settings as object) ?? {}) };
    await supabase.from("user_settings").upsert({ user_id: userId, settings: merged }, { onConflict: "user_id" });
  }
  if (guestAlerts.length) {
    await supabase
      .from("price_alerts")
      .update({ user_id: userId })
      .in(
        "id",
        guestAlerts.map((a: any) => a.id)
      );
  }
}
