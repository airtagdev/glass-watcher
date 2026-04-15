import { useQuery } from "@tanstack/react-query";


export interface StockQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  trailingPE?: number | null;
  postMarketPrice?: number | null;
  postMarketChange?: number | null;
  postMarketChangePercent?: number | null;
  marketState?: string | null;
}

async function fetchStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  if (symbols.length === 0) return [];

  // Batch into chunks of 10 to avoid overly long requests
  const chunks: string[][] = [];
  for (let i = 0; i < symbols.length; i += 10) {
    chunks.push(symbols.slice(i, i + 10));
  }

  const allResults: StockQuote[] = [];
  for (const chunk of chunks) {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-proxy?action=quotes&symbols=${chunk.join(",")}`;
      const res = await fetch(url, {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (res.ok) {
        const quotes = await res.json();
        allResults.push(...quotes);
      }
    } catch {
      // Skip failed chunks
    }
  }
  return allResults;
}

async function searchStocks(query: string): Promise<{ symbol: string; shortname: string; exchDisp: string }[]> {
  if (!query || query.length < 1) return [];
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-proxy?action=search&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const POPULAR_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "JPM", "V",
  "WMT", "JNJ", "PG", "MA", "UNH", "HD", "DIS", "PYPL", "BAC", "INTC",
  "CSCO", "VZ", "ADBE", "CRM", "CMCSA", "PFE", "KO", "PEP", "TMO", "ABBV",
  "AVGO", "COST", "MRK", "CVX", "XOM", "LLY", "ABT", "MCD", "ACN", "DHR",
  "NKE", "TXN", "QCOM", "NEE", "LIN", "LOW", "MDT", "UPS", "MS", "GS",
  "COP", "SLB", "EOG", "OXY", "MPC", "PSX", "VLO",
  "CAT", "DE", "HON", "GE", "RTX", "BA", "LMT", "MMM", "FDX",
  "T", "TMUS", "CHTR",
  "AMGN", "GILD", "BMY", "ISRG", "REGN", "VRTX",
  "AMD", "MU", "ANET", "NOW", "PANW", "SNPS", "CDNS",
  "AXP", "BLK", "SCHW", "C", "WFC", "USB",
  "TGT", "SBUX", "LULU", "BKNG", "ABNB", "UBER",
];

export function usePopularStocks() {
  return useQuery({
    queryKey: ["popularStocks"],
    queryFn: () => fetchStockQuotes(POPULAR_STOCKS),
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}

export function useStockQuotes(symbols: string[]) {
  return useQuery({
    queryKey: ["stockQuotes", symbols.sort().join(",")],
    queryFn: () => fetchStockQuotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ["stockSearch", query],
    queryFn: () => searchStocks(query),
    enabled: query.length >= 1,
    staleTime: 30000,
  });
}

export function useStockDetail(symbol: string) {
  return useQuery({
    queryKey: ["stockDetail", symbol],
    queryFn: async () => {
      const results = await fetchStockQuotes([symbol]);
      return results[0] || null;
    },
    enabled: !!symbol,
    refetchInterval: 30000,
  });
}
