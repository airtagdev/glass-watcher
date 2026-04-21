import { useState } from "react";
import { usePopularForex } from "@/hooks/useForexData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { TickerCard } from "@/components/TickerCard";
import { TickerDetail } from "@/components/TickerDetail";
import { DollarSign } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";
import type { StockQuote } from "@/hooks/useStockData";

function prettyForex(symbol: string) {
  const s = symbol.replace("=X", "");
  return s.length === 6 ? `${s.slice(0, 3)}/${s.slice(3)}` : s;
}

export default function ForexPage() {
  const { data: pairs, isLoading } = usePopularForex();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const [selected, setSelected] = useState<StockQuote | null>(null);

  const handleToggle = (s: StockQuote) => {
    const id = `forex-${s.symbol}`;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist({ id, symbol: s.symbol, name: prettyForex(s.symbol), type: "forex" });
  };

  return (
    <PullToRefresh>
      <div className="px-4 pt-14 pb-24">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Forex</h1>
        </div>
        <div className="flex flex-col gap-3">
          {isLoading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-16 animate-pulse" />
          ))}
          {pairs?.map((s) => (
            <TickerCard
              key={s.symbol}
              symbol={prettyForex(s.symbol)}
              name={s.shortName || prettyForex(s.symbol)}
              price={s.regularMarketPrice}
              changePercent={s.regularMarketChangePercent}
              change={s.regularMarketChange}
              dayHigh={s.regularMarketDayHigh}
              dayLow={s.regularMarketDayLow}
              isWatched={isInWatchlist(`forex-${s.symbol}`)}
              onToggleWatch={() => handleToggle(s)}
              onClick={() => setSelected(s)}
            />
          ))}
        </div>
        {selected && (
          <TickerDetail
            symbol={prettyForex(selected.symbol)}
            chartSymbol={selected.symbol}
            name={selected.shortName || prettyForex(selected.symbol)}
            price={selected.regularMarketPrice}
            change={selected.regularMarketChange}
            changePercent={selected.regularMarketChangePercent}
            dayHigh={selected.regularMarketDayHigh}
            dayLow={selected.regularMarketDayLow}
            high52w={selected.fiftyTwoWeekHigh}
            low52w={selected.fiftyTwoWeekLow}
            tickerType="forex"
            isWatched={isInWatchlist(`forex-${selected.symbol}`)}
            onToggleWatch={() => handleToggle(selected)}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </PullToRefresh>
  );
}