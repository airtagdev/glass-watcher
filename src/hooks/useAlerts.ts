import { useState, useCallback, useEffect } from "react";

export interface PriceAlert {
  id: string;
  tickerSymbol: string;
  tickerName: string;
  tickerType: "stock" | "crypto";
  alertType: "price" | "percentage";
  /** For price alerts: target price. For percentage: the % value */
  value: number;
  /** For percentage alerts: "increase" or "decrease" */
  direction?: "increase" | "decrease";
  createdAt: string;
}

const STORAGE_KEY = "ticker-alerts";

function loadAlerts(): PriceAlert[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  }, [alerts]);

  const addAlert = useCallback((alert: Omit<PriceAlert, "id" | "createdAt">) => {
    setAlerts((prev) => [
      ...prev,
      { ...alert, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
    ]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alerts, addAlert, removeAlert };
}
