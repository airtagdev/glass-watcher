import { useState } from "react";
import { usePopularFutures } from "@/hooks/useFuturesData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { TickerCard } from "@/components/TickerCard";
import { TickerDetail } from "@/components/TickerDetail";
import { LineChart } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import type { StockQuote } from "@/hooks/useStockData";

export default function FuturesPage() {
  const { data: items, isLoading } = usePopularFutures();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [selected, setSelected] = useState<StockQuote | null>(null);

  const handleToggle = (s: StockQuote) => {
    const id = `futures-${s.symbol}`;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist({ id, symbol: s.symbol, name: s.shortName, type: "futures" });
  };

  return (
    <PullToRefresh>
      <div className="px-4 pt-14 pb-24">
        <div className="flex items-center gap-2 mb-4">
          <LineChart className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Futures & Indices</h1>
        </div>
        <div className="flex flex-col gap-3">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-16 animate-pulse" />
          ))}
          {items?.map((s) => (
            <TickerCard
              key={s.symbol}
              symbol={s.symbol}
              name={s.shortName || s.symbol}
              price={s.regularMarketPrice}
              changePercent={s.regularMarketChangePercent}
              change={s.regularMarketChange}
              dayHigh={s.regularMarketDayHigh}
              dayLow={s.regularMarketDayLow}
              high52w={s.fiftyTwoWeekHigh}
              low52w={s.fiftyTwoWeekLow}
              isWatched={isInWatchlist(`futures-${s.symbol}`)}
              onToggleWatch={() => handleToggle(s)}
              onClick={() => setSelected(s)}
            />
          ))}
        </div>
        {selected && (
          <TickerDetail
            symbol={selected.symbol}
            name={selected.shortName || selected.symbol}
            price={selected.regularMarketPrice}
            change={selected.regularMarketChange}
            changePercent={selected.regularMarketChangePercent}
            high52w={selected.fiftyTwoWeekHigh}
            low52w={selected.fiftyTwoWeekLow}
            volume={selected.regularMarketVolume}
            dayHigh={selected.regularMarketDayHigh}
            dayLow={selected.regularMarketDayLow}
            tickerType="futures"
            isWatched={isInWatchlist(`futures-${selected.symbol}`)}
            onToggleWatch={() => handleToggle(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}