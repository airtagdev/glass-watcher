import { useState, useCallback, useEffect, useMemo } from "react";

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
}

const STORAGE_KEY = "ticker-portfolio";

function loadTrades(): Trade[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function usePortfolio() {
  const [trades, setTrades] = useState<Trade[]>(loadTrades);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  const addTrade = useCallback((trade: Omit<Trade, "id">) => {
    setTrades((prev) => [...prev, { ...trade, id: crypto.randomUUID() }]);
  }, []);

  const removeTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTrade = useCallback((id: string, updates: Partial<Omit<Trade, "id">>) => {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  const removeHolding = useCallback((tickerId: string) => {
    setTrades((prev) => prev.filter((t) => t.tickerId !== tickerId));
  }, []);

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
        };
        map.set(trade.tickerId, h);
      }
      h.trades.push(trade);

      if (trade.type === "buy") {
        h.totalCost += trade.price * trade.quantity;
        h.totalQuantity += trade.quantity;
      } else {
        h.totalQuantity -= trade.quantity;
        // Reduce cost proportionally
        if (h.totalQuantity > 0) {
          h.totalCost = h.avgCostBasis * h.totalQuantity;
        } else {
          h.totalCost = 0;
        }
      }
      h.avgCostBasis = h.totalQuantity > 0 ? h.totalCost / h.totalQuantity : 0;
    }

    return Array.from(map.values()).filter((h) => h.totalQuantity > 0);
  }, [trades]);

  return { trades, holdings, addTrade, removeTrade, updateTrade, removeHolding };
}
