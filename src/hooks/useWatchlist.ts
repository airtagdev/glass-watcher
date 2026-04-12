import { useState, useCallback, useEffect } from "react";

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  type: "stock" | "crypto";
}

const STORAGE_KEY = "ticker-watchlist";
const PINNED_KEY = "ticker-pinned";
const MAX_PINS = 5;

function loadWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function loadPinned(): string[] {
  try {
    const data = localStorage.getItem(PINNED_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadWatchlist);
  const [pinnedIds, setPinnedIds] = useState<string[]>(loadPinned);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  const addToWatchlist = useCallback((item: WatchlistItem) => {
    setWatchlist((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => prev.filter((i) => i.id !== id));
    setPinnedIds((prev) => prev.filter((pid) => pid !== id));
  }, []);

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((i) => i.id === id),
    [watchlist]
  );

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev.filter((pid) => pid !== id);
      if (prev.length >= MAX_PINS) return prev;
      return [...prev, id];
    });
  }, []);

  const isPinned = useCallback(
    (id: string) => pinnedIds.includes(id),
    [pinnedIds]
  );

  const pinCount = pinnedIds.length;

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    togglePin,
    isPinned,
    pinnedIds,
    pinCount,
    maxPins: MAX_PINS,
  };
}
