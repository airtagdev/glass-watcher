import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import { useAuth } from "@/contexts/AuthContext";

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

function rowToAlert(d: any): PriceAlert {
  return {
    id: d.id,
    tickerSymbol: d.ticker_symbol,
    tickerName: d.ticker_name,
    tickerType: d.ticker_type,
    alertType: d.alert_type,
    value: Number(d.value),
    direction: d.direction || undefined,
    triggered: d.triggered,
    createdAt: d.created_at,
  };
}

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const deviceId = getDeviceId();

  const fetchAlerts = useCallback(async () => {
    let query = supabase.from("price_alerts").select("*").order("created_at", { ascending: false });
    if (user) {
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("device_id", deviceId).is("user_id", null);
    }
    const { data } = await query;
    if (data) setAlerts(data.map(rowToAlert));
    setLoading(false);
  }, [deviceId, user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime when signed in
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`price_alerts:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "price_alerts", filter: `user_id=eq.${user.id}` },
        () => fetchAlerts()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAlerts]);

  const addAlert = useCallback(
    async (alert: Omit<PriceAlert, "id" | "createdAt" | "triggered">) => {
      const { error } = await supabase.from("price_alerts").insert({
        device_id: deviceId,
        user_id: user?.id ?? null,
        ticker_symbol: alert.tickerSymbol,
        ticker_name: alert.tickerName,
        ticker_type: alert.tickerType,
        alert_type: alert.alertType,
        value: alert.value,
        direction: alert.direction || null,
      });
      if (!error) fetchAlerts();
    },
    [deviceId, user, fetchAlerts]
  );

  const removeAlert = useCallback(async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alerts, loading, addAlert, removeAlert };
}
