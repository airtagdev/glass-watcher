import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDeviceId } from "@/lib/deviceId";

export interface Device {
  id: string;
  device_id: string;
  device_name: string;
  platform: string | null;
  user_agent: string | null;
  last_seen_at: string;
  created_at: string;
  isCurrent: boolean;
}

export function useDevices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDeviceId = getDeviceId();

  const fetchDevices = useCallback(async () => {
    if (!user) {
      setDevices([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .order("last_seen_at", { ascending: false });
    setDevices(
      (data || []).map((d) => ({
        id: d.id,
        device_id: d.device_id,
        device_name: d.device_name,
        platform: d.platform,
        user_agent: d.user_agent,
        last_seen_at: d.last_seen_at,
        created_at: d.created_at,
        isCurrent: d.device_id === currentDeviceId,
      }))
    );
    setLoading(false);
  }, [user, currentDeviceId]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const revokeDevice = useCallback(
    async (deviceRowId: string) => {
      await supabase.from("user_devices").delete().eq("id", deviceRowId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceRowId));
    },
    []
  );

  const renameDevice = useCallback(
    async (deviceRowId: string, newName: string) => {
      await supabase.from("user_devices").update({ device_name: newName }).eq("id", deviceRowId);
      setDevices((prev) => prev.map((d) => (d.id === deviceRowId ? { ...d, device_name: newName } : d)));
    },
    []
  );

  return { devices, loading, revokeDevice, renameDevice, refetch: fetchDevices };
}
