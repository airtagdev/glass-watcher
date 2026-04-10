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

const YAHOO_PROXY = "https://query1.finance.yahoo.com/v7/finance/quote";
const CORS_PROXY = "https://corsproxy.io/?";

async function fetchStockQuotes(symbols: string[]): Promise<StockQuote[]> {
  if (symbols.length === 0) return [];
  const url = `${CORS_PROXY}${encodeURIComponent(
    `${YAHOO_PROXY}?symbols=${symbols.join(",")}&fields=shortName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,marketCap,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketDayHigh,regularMarketDayLow`
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch stock data");
  const data = await res.json();
  return (data.quoteResponse?.result || []).map((q: any) => ({
    symbol: q.symbol,
    shortName: q.shortName || q.longName || q.symbol,
    regularMarketPrice: q.regularMarketPrice || 0,
    regularMarketChange: q.regularMarketChange || 0,
    regularMarketChangePercent: q.regularMarketChangePercent || 0,
    regularMarketVolume: q.regularMarketVolume || 0,
    marketCap: q.marketCap || 0,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow || 0,
    regularMarketDayHigh: q.regularMarketDayHigh || 0,
    regularMarketDayLow: q.regularMarketDayLow || 0,
  }));
}

async function searchStocks(query: string): Promise<{ symbol: string; shortname: string; exchDisp: string }[]> {
  if (!query || query.length < 1) return [];
  const url = `${CORS_PROXY}${encodeURIComponent(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`
  )}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to search stocks");
  const data = await res.json();
  return (data.quotes || [])
    .filter((q: any) => q.quoteType === "EQUITY")
    .map((q: any) => ({
      symbol: q.symbol,
      shortname: q.shortname || q.longname || q.symbol,
      exchDisp: q.exchDisp || "",
    }));
}

const POPULAR_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "JPM", "V", "WMT", "DIS", "BA", "PYPL", "INTC", "AMD", "CRM", "UBER", "SQ", "COIN"];

export function usePopularStocks() {
  return useQuery({
    queryKey: ["popularStocks"],
    queryFn: () => fetchStockQuotes(POPULAR_STOCKS),
    refetchInterval: 60000,
    staleTime: 30000,
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
    queryFn: () => fetchStockQuotes([symbol]).then((r) => r[0] || null),
    enabled: !!symbol,
    refetchInterval: 30000,
  });
}
