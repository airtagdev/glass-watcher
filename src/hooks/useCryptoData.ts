import { useQuery } from "@tanstack/react-query";

export interface CryptoTicker {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_24h: number;
  market_cap: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  ath: number;
  atl: number;
  image: string;
}

async function fetchTopCryptos(): Promise<CryptoTicker[]> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h"
  );
  if (!res.ok) throw new Error("Failed to fetch crypto data");
  return res.json();
}

async function searchCryptos(query: string): Promise<{ id: string; symbol: string; name: string }[]> {
  if (!query || query.length < 1) return [];
  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search");
  const data = await res.json();
  return data.coins?.slice(0, 20) || [];
}

async function fetchCryptoById(id: string): Promise<CryptoTicker | null> {
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${id}&sparkline=false`
  );
  if (!res.ok) throw new Error("Failed to fetch crypto");
  const data = await res.json();
  return data[0] || null;
}

async function fetchCryptosByIds(ids: string[]): Promise<CryptoTicker[]> {
  if (ids.length === 0) return [];
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}&sparkline=false`
  );
  if (!res.ok) throw new Error("Failed to fetch cryptos");
  return res.json();
}

export function useTopCryptos() {
  return useQuery({
    queryKey: ["topCryptos"],
    queryFn: fetchTopCryptos,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useCryptoSearch(query: string) {
  return useQuery({
    queryKey: ["cryptoSearch", query],
    queryFn: () => searchCryptos(query),
    enabled: query.length >= 1,
    staleTime: 30000,
  });
}

export function useCryptoDetail(id: string) {
  return useQuery({
    queryKey: ["cryptoDetail", id],
    queryFn: () => fetchCryptoById(id),
    enabled: !!id,
    refetchInterval: 30000,
  });
}

export function useCryptosByIds(ids: string[]) {
  return useQuery({
    queryKey: ["cryptosByIds", ids.sort().join(",")],
    queryFn: () => fetchCryptosByIds(ids),
    enabled: ids.length > 0,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}
