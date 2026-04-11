import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import tradexLogo from "@/assets/tradex-logo.png";

const POPULAR_STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "JPM", "V"];

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

async function prefetchStocks() {
  const results = await Promise.all(
    POPULAR_STOCKS.map(async (symbol) => {
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
    })
  );
  return results.filter(Boolean);
}

async function prefetchCryptos() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h"
  );
  if (!res.ok) throw new Error("Failed to fetch crypto data");
  return res.json();
}

interface AppLoaderProps {
  children: React.ReactNode;
}

export function AppLoader({ children }: AppLoaderProps) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Loading market data...");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setProgress(10);
        setStatus("Fetching stock prices...");

        const stocksPromise = prefetchStocks();
        const cryptosPromise = prefetchCryptos();

        // Update progress as each resolves
        const stocks = await stocksPromise;
        if (cancelled) return;
        setProgress(50);
        setStatus("Fetching crypto prices...");

        queryClient.setQueryData(["popularStocks"], stocks);

        const cryptos = await cryptosPromise;
        if (cancelled) return;
        setProgress(90);
        setStatus("Almost ready...");

        queryClient.setQueryData(["topCryptos"], cryptos);

        setProgress(100);
        // Brief pause so the user sees 100%
        await new Promise((r) => setTimeout(r, 300));
        if (!cancelled) setReady(true);
      } catch {
        // If prefetch fails, let the app load anyway
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [queryClient]);

  if (ready) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-8">
      <div className="flex flex-col items-center gap-4 mb-8">
        <img src={tradexLogo} alt="Tradex" className="w-24 h-24 rounded-2xl" />
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Trade Smarter. Invest Better.</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Progress value={progress} className="h-1.5 bg-secondary" />
        <p className="text-xs text-muted-foreground text-center">{status}</p>
      </div>
    </div>
  );
}
