import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";

export interface PriceAlert {
  id: string;
  tickerSymbol: string;
  tickerName: string;
  tickerType: "stock" | "crypto";
  alertType: "price" | "percentage";
  value: number;
  direction?: "increase" | "decrease";
  triggered: boolean;
  createdAt: string;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });

    if (data) {
      setAlerts(
        data.map((d: any) => ({
          id: d.id,
          tickerSymbol: d.ticker_symbol,
          tickerName: d.ticker_name,
          tickerType: d.ticker_type,
          alertType: d.alert_type,
          value: Number(d.value),
          direction: d.direction || undefined,
          triggered: d.triggered,
          createdAt: d.created_at,
        }))
      );
    }
    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const addAlert = useCallback(
    async (alert: Omit<PriceAlert, "id" | "createdAt" | "triggered">) => {
      const { error } = await supabase.from("price_alerts").insert({
        device_id: deviceId,
        ticker_symbol: alert.tickerSymbol,
        ticker_name: alert.tickerName,
        ticker_type: alert.tickerType,
        alert_type: alert.alertType,
        value: alert.value,
        direction: alert.direction || null,
      });
      if (!error) fetchAlerts();
    },
    [deviceId, fetchAlerts]
  );

  const removeAlert = useCallback(
    async (id: string) => {
      await supabase.from("price_alerts").delete().eq("id", id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    []
  );

  return { alerts, loading, addAlert, removeAlert };
}
