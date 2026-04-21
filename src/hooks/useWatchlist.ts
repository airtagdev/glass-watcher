import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  type: "stock" | "crypto" | "forex" | "futures";
}

const STORAGE_KEY = "ticker-watchlist";
const PINNED_KEY = "ticker-pinned";
const MAX_PINS = 5;

function loadLocalWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function loadLocalPinned(): string[] {
  try {
    const data = localStorage.getItem(PINNED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadLocalWatchlist);
  const [pinnedIds, setPinnedIds] = useState<string[]>(loadLocalPinned);

  // Persist to localStorage as cache for offline & guest mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  // When signed in, load from cloud + subscribe to realtime
  useEffect(() => {
    if (!user) return;

    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("user_watchlist")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      if (!active || !data) return;
      setWatchlist(
        data.map((d) => ({ id: d.ticker_id, symbol: d.symbol, name: d.name, type: d.type as "stock" | "crypto" }))
      );
      setPinnedIds(data.filter((d) => d.pinned).map((d) => d.ticker_id));
    };
    load();

    const channel = supabase
      .channel(`user_watchlist:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_watchlist", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addToWatchlist = useCallback(
    (item: WatchlistItem) => {
      setWatchlist((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]));
      if (user) {
        supabase
          .from("user_watchlist")
          .upsert(
            {
              user_id: user.id,
              ticker_id: item.id,
              symbol: item.symbol,
              name: item.name,
              type: item.type,
              pinned: false,
            },
            { onConflict: "user_id,ticker_id" }
          )
          .then();
      }
    },
    [user]
  );

  const removeFromWatchlist = useCallback(
    (id: string) => {
      setWatchlist((prev) => prev.filter((i) => i.id !== id));
      setPinnedIds((prev) => prev.filter((pid) => pid !== id));
      if (user) {
        supabase.from("user_watchlist").delete().eq("user_id", user.id).eq("ticker_id", id).then();
      }
    },
    [user]
  );

  const isInWatchlist = useCallback((id: string) => watchlist.some((i) => i.id === id), [watchlist]);

  const togglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        let next: string[];
        if (prev.includes(id)) next = prev.filter((pid) => pid !== id);
        else if (prev.length >= MAX_PINS) next = prev;
        else next = [...prev, id];

        if (user && next !== prev) {
          const isPinning = next.includes(id);
          supabase
            .from("user_watchlist")
            .update({ pinned: isPinning })
            .eq("user_id", user.id)
            .eq("ticker_id", id)
            .then();
        }
        return next;
      });
    },
    [user]
  );

  const isPinned = useCallback((id: string) => pinnedIds.includes(id), [pinnedIds]);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    togglePin,
    isPinned,
    pinnedIds,
    pinCount: pinnedIds.length,
    maxPins: MAX_PINS,
  };
}
