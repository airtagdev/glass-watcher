import { useQuery } from "@tanstack/react-query";
import type { StockQuote } from "./useStockData";

async function fetchForex(): Promise<StockQuote[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-proxy?action=forex`;
  const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
  if (!res.ok) return [];
  return res.json();
}

export function usePopularForex() {
  return useQuery({
    queryKey: ["popularForex"],
    queryFn: fetchForex,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}