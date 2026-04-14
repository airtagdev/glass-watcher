import { useState } from "react";
import { usePopularStocks, useStockSearch, useStockDetail, StockQuote } from "@/hooks/useStockData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { TickerCard } from "@/components/TickerCard";
import { TickerDetail } from "@/components/TickerDetail";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function StocksPage() {
  const [query, setQuery] = useState("");
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { data: popular, isLoading } = usePopularStocks();
  const { data: searchResults } = useStockSearch(query);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);
  const [searchSelectedSymbol, setSearchSelectedSymbol] = useState<string | null>(null);
  const { data: searchDetailData } = useStockDetail(searchSelectedSymbol || "");

  const handleToggle = (s: StockQuote) => {
    const id = `stock-${s.symbol}`;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist({ id, symbol: s.symbol, name: s.shortName, type: "stock" });
  };

  const handleSearchClick = (symbol: string) => {
    const found = popular?.find((s) => s.symbol === symbol);
    if (found) {
      setSelectedStock(found);
    } else {
      setSearchSelectedSymbol(symbol);
    }
  };

  const detailStock = selectedStock || (searchDetailData && searchSelectedSymbol ? searchDetailData : null);

  const showSearch = query.length >= 1 && searchResults;

  return (
    <PullToRefresh>
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Stocks</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks..."
          className="pl-9 glass border-glass-border/50 rounded-xl"
        />
      </div>

      {showSearch ? (
        <div className="flex flex-col gap-3">
          {searchResults.map((r) => (
            <div
              key={r.symbol}
              onClick={() => handleSearchClick(r.symbol)}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                {r.symbol.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.symbol}</p>
                <p className="text-xs text-muted-foreground truncate">{r.shortname}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{r.exchDisp}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-4 h-16 animate-pulse" />
            ))}
          {popular?.map((s) => (
            <TickerCard
              key={s.symbol}
              symbol={s.symbol}
              name={s.shortName}
              price={s.regularMarketPrice}
              changePercent={s.regularMarketChangePercent}
              change={s.regularMarketChange}
              dayHigh={s.regularMarketDayHigh}
              dayLow={s.regularMarketDayLow}
              high52w={s.fiftyTwoWeekHigh}
              low52w={s.fiftyTwoWeekLow}
              isWatched={isInWatchlist(`stock-${s.symbol}`)}
              onToggleWatch={() => handleToggle(s)}
              onClick={() => setSelectedStock(s)}
            />
          ))}
        </div>
      )}

      {detailStock && (
        <TickerDetail
          symbol={detailStock.symbol}
          name={detailStock.shortName}
          price={detailStock.regularMarketPrice}
          change={detailStock.regularMarketChange}
          changePercent={detailStock.regularMarketChangePercent}
          high52w={detailStock.fiftyTwoWeekHigh}
          low52w={detailStock.fiftyTwoWeekLow}
          marketCap={detailStock.marketCap}
          volume={detailStock.regularMarketVolume}
          dayHigh={detailStock.regularMarketDayHigh}
          dayLow={detailStock.regularMarketDayLow}
          trailingPE={detailStock.trailingPE}
          tickerType="stock"
          isWatched={isInWatchlist(`stock-${detailStock.symbol}`)}
          onToggleWatch={() => handleToggle(detailStock)}
          onClose={() => { setSelectedStock(null); setSearchSelectedSymbol(null); }}
        />
      )}
    </div>
    </PullToRefresh>
  );
}
