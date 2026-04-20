import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Trade {
  id: string;
  tickerId: string;
  tickerSymbol: string;
  tickerName: string;
  tickerType: "stock" | "crypto";
  type: "buy" | "sell";
  price: number;
  quantity: number;
  date: string; // ISO string
}

export interface PortfolioHolding {
  tickerId: string;
  tickerSymbol: string;
  tickerName: string;
  tickerType: "stock" | "crypto";
  totalQuantity: number;
  avgCostBasis: number;
  totalCost: number;
  trades: Trade[];
  realizedPnl: number;
  totalBought: number;
  totalSold: number;
}

const STORAGE_KEY = "ticker-portfolio";

function loadLocalTrades(): Trade[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function rowToTrade(d: any): Trade {
  return {
    id: d.id,
    tickerId: d.ticker_id,
    tickerSymbol: d.ticker_symbol,
    tickerName: d.ticker_name,
    tickerType: d.ticker_type,
    type: d.trade_type,
    price: Number(d.price),
    quantity: Number(d.quantity),
    date: d.trade_date,
  };
}

export function usePortfolio() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>(loadLocalTrades);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("user_portfolio")
        .select("*")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: true });
      if (!active || !data) return;
      setTrades(data.map(rowToTrade));
    };
    load();

    const channel = supabase
      .channel(`user_portfolio:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_portfolio", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addTrade = useCallback(
    (trade: Omit<Trade, "id">) => {
      const id = crypto.randomUUID();
      setTrades((prev) => [...prev, { ...trade, id }]);
      if (user) {
        supabase
          .from("user_portfolio")
          .insert({
            id,
            user_id: user.id,
            ticker_id: trade.tickerId,
            ticker_symbol: trade.tickerSymbol,
            ticker_name: trade.tickerName,
            ticker_type: trade.tickerType,
            trade_type: trade.type,
            price: trade.price,
            quantity: trade.quantity,
            trade_date: trade.date,
          })
          .then();
      }
    },
    [user]
  );

  const removeTrade = useCallback(
    (id: string) => {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      if (user) supabase.from("user_portfolio").delete().eq("id", id).then();
    },
    [user]
  );

  const updateTrade = useCallback(
    (id: string, updates: Partial<Omit<Trade, "id">>) => {
      setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
      if (user) {
        const dbUpdates: any = {};
        if (updates.price !== undefined) dbUpdates.price = updates.price;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.type !== undefined) dbUpdates.trade_type = updates.type;
        if (updates.date !== undefined) dbUpdates.trade_date = updates.date;
        supabase.from("user_portfolio").update(dbUpdates).eq("id", id).then();
      }
    },
    [user]
  );

  const removeHolding = useCallback(
    (tickerId: string) => {
      setTrades((prev) => prev.filter((t) => t.tickerId !== tickerId));
      if (user) supabase.from("user_portfolio").delete().eq("user_id", user.id).eq("ticker_id", tickerId).then();
    },
    [user]
  );

  const holdings = useMemo<PortfolioHolding[]>(() => {
    const map = new Map<string, PortfolioHolding>();
    for (const trade of trades) {
      let h = map.get(trade.tickerId);
      if (!h) {
        h = {
          tickerId: trade.tickerId,
          tickerSymbol: trade.tickerSymbol,
          tickerName: trade.tickerName,
          tickerType: trade.tickerType,
          totalQuantity: 0,
          avgCostBasis: 0,
          totalCost: 0,
          trades: [],
          realizedPnl: 0,
          totalBought: 0,
          totalSold: 0,
        };
        map.set(trade.tickerId, h);
      }
      h.trades.push(trade);
      if (trade.type === "buy") {
        h.totalCost += trade.price * trade.quantity;
        h.totalQuantity += trade.quantity;
        h.totalBought += trade.quantity;
      } else {
        // Realized P/L based on avg cost at the time of sell
        const sellQty = Math.min(trade.quantity, h.totalQuantity);
        h.realizedPnl += (trade.price - h.avgCostBasis) * sellQty;
        h.totalSold += trade.quantity;
        h.totalQuantity -= trade.quantity;
        if (h.totalQuantity > 0) h.totalCost = h.avgCostBasis * h.totalQuantity;
        else h.totalCost = 0;
      }
      h.avgCostBasis = h.totalQuantity > 0 ? h.totalCost / h.totalQuantity : 0;
    }
    // Keep all holdings that have any trade history (so closed positions still display realized P/L)
    return Array.from(map.values());
  }, [trades]);

  return { trades, holdings, addTrade, removeTrade, updateTrade, removeHolding };
}
