import { useQuery } from "@tanstack/react-query";

export interface ChartData {
  symbol: string;
  interval: string;
  range: string;
  timestamp: number[];
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

async function fetchChart(symbol: string, interval: string, range: string): Promise<ChartData> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-proxy?action=chart&symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error("Failed to fetch chart");
  return res.json();
}

export function useChartData(symbol: string, interval: string, range: string) {
  const isIntraday = ["1m", "5m", "15m", "30m", "1h", "4h"].includes(interval);
  return useQuery({
    queryKey: ["chart", symbol, interval, range],
    queryFn: () => fetchChart(symbol, interval, range),
    enabled: !!symbol,
    refetchInterval: isIntraday ? 30000 : 300000,
    staleTime: isIntraday ? 15000 : 120000,
  });
}