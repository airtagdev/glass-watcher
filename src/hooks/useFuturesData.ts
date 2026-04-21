import { useQuery } from "@tanstack/react-query";
import type { StockQuote } from "./useStockData";

async function fetchFutures(): Promise<StockQuote[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-proxy?action=futures`;
  const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
  if (!res.ok) return [];
  return res.json();
}

export function usePopularFutures() {
  return useQuery({
    queryKey: ["popularFutures"],
    queryFn: fetchFutures,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}