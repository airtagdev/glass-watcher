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
}

const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchWithProxy(url: string): Promise<Response> {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url));
      if (res.ok) return res;
    } catch { /* try next */ }
  }
  throw new Error("All proxies failed");
}

async function fetchSingleStockChart(symbol: string): Promise<StockQuote | null> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&includePrePost=false`;
    const res = await fetchWithProxy(yahooUrl);
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
    const price = meta.regularMarketPrice || 0;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;
    return {
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || meta.longName || symbol,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      regularMarketVolume: meta.regularMarketVolume || 0,
      marketCap: 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      regularMarketDayHigh: meta.regularMarketDayHigh || meta.dayHigh || 0,
      regularMarketDayLow: meta.regularMarketDayLow || meta.dayLow || 0,
    };
  } catch {
    return null;
  }
}

async function fetchStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  if (symbols.length === 0) return [];
  const results = await Promise.all(symbols.map(fetchSingleStockChart));
  return results.filter((r): r is StockQuote => r !== null);
}

async function searchStocks(query: string): Promise<{ symbol: string; shortname: string; exchDisp: string }[]> {
  if (!query || query.length < 1) return [];
  const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
  const res = await fetchWithProxy(yahooUrl);
  const data = await res.json();
  return (data.quotes || [])
    .filter((q: any) => q.quoteType === "EQUITY")
    .map((q: any) => ({
      symbol: q.symbol,
      shortname: q.shortname || q.longname || q.symbol,
      exchDisp: q.exchDisp || "",
    }));
}

const POPULAR_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "JPM", "V"];

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
    queryFn: () => fetchSingleStockChart(symbol),
    enabled: !!symbol,
    refetchInterval: 30000,
  });
}
