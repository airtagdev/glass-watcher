import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";


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

const LOADING_MESSAGES = [
  "Getting a few things ready...",
  "Polishing your experience...",
  "Fetching crypto tickers...",
  "Crunching the latest numbers...",
  "Loading market insights...",
  "Warming up the engines...",
];

async function prefetchStocks() {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-proxy?action=quotes&symbols=${POPULAR_STOCKS.join(",")}`;
    const res = await fetch(url, {
      headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
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
  const [status, setStatus] = useState(LOADING_MESSAGES[0]);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (ready) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => {
        const next = (prev + 1) % LOADING_MESSAGES.length;
        setStatus(LOADING_MESSAGES[next]);
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    let smoothInterval: ReturnType<typeof setInterval>;

    function smoothProgress(from: number, to: number, duration: number) {
      const steps = Math.ceil(duration / 50);
      const increment = (to - from) / steps;
      let current = from;
      let step = 0;
      clearInterval(smoothInterval);
      smoothInterval = setInterval(() => {
        step++;
        current = Math.min(from + increment * step, to);
        if (!cancelled) setProgress(Math.round(current));
        if (step >= steps) clearInterval(smoothInterval);
      }, 50);
    }

    async function load() {
      try {
        setProgress(5);
        smoothProgress(5, 40, 2000);
        

        const stocksPromise = prefetchStocks();
        const cryptosPromise = prefetchCryptos();

        const stocks = await stocksPromise;
        if (cancelled) return;
        smoothProgress(40, 65, 1000);
        
        queryClient.setQueryData(["popularStocks"], stocks);

        const cryptos = await cryptosPromise;
        if (cancelled) return;
        smoothProgress(65, 95, 800);
        
        queryClient.setQueryData(["topCryptos"], cryptos);

        await new Promise((r) => setTimeout(r, 600));
        if (!cancelled) setProgress(100);
        await new Promise((r) => setTimeout(r, 300));
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => { cancelled = true; clearInterval(smoothInterval); };
  }, [queryClient]);

  if (ready) return <>{children}</>;

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 px-8">
      <div className="flex flex-col items-center gap-2 mb-8">
        <h1 className="text-5xl font-bold text-primary tracking-tight flex animate-pulse-glow" aria-label="Tradex">
          {"Tradex".split("").map((letter, i) => (
            <span
              key={i}
              className="inline-block animate-letter-in"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {letter}
            </span>
          ))}
        </h1>
        <p className="text-xs text-muted-foreground uppercase animate-tagline-in">
          Trade Smarter. Invest Better.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Progress value={progress} className="h-1.5 bg-secondary glow-progress" />
        <p className="text-xs text-muted-foreground text-center">{status}</p>
      </div>
    </div>
  );
}
