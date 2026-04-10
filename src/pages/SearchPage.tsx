import { useState } from "react";
import { useStockSearch, useStockDetail, StockQuote } from "@/hooks/useStockData";
import { useCryptoSearch, useCryptoDetail, CryptoTicker } from "@/hooks/useCryptoData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { TickerDetail } from "@/components/TickerDetail";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, TrendingUp, Bitcoin } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { data: stockResults } = useStockSearch(query);
  const { data: cryptoResults } = useCryptoSearch(query);

  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const { data: stockDetail } = useStockDetail(selectedStock || "");
  const { data: cryptoDetail } = useCryptoDetail(selectedCrypto || "");

  const handleToggleStock = (symbol: string, name: string) => {
    const id = `stock-${symbol}`;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist({ id, symbol, name, type: "stock" });
  };

  const handleToggleCrypto = (c: CryptoTicker) => {
    if (isInWatchlist(c.id)) removeFromWatchlist(c.id);
    else addToWatchlist({ id: c.id, symbol: c.symbol, name: c.name, type: "crypto" });
  };

  return (
    <div className="px-4 pt-14 pb-24">
      <h1 className="text-2xl font-bold text-foreground mb-4">Search</h1>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks & crypto..."
          className="pl-9 glass border-glass-border/50 rounded-xl"
          autoFocus
        />
      </div>

      {query.length < 1 && (
        <div className="text-center py-12">
          <SearchIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Type to search stocks and crypto</p>
        </div>
      )}

      {stockResults && stockResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Stocks</h2>
          </div>
          <div className="flex flex-col gap-2">
            {stockResults.slice(0, 8).map((r) => (
              <div
                key={r.symbol}
                onClick={() => setSelectedStock(r.symbol)}
                className="glass-card p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {r.symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.shortname}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cryptoResults && cryptoResults.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bitcoin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Crypto</h2>
          </div>
          <div className="flex flex-col gap-2">
            {cryptoResults.slice(0, 8).map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedCrypto(r.id)}
                className="glass-card p-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {r.symbol.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{r.symbol.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stockDetail && selectedStock && (
        <TickerDetail
          symbol={stockDetail.symbol}
          name={stockDetail.shortName}
          price={stockDetail.regularMarketPrice}
          change={stockDetail.regularMarketChange}
          changePercent={stockDetail.regularMarketChangePercent}
          high52w={stockDetail.fiftyTwoWeekHigh}
          low52w={stockDetail.fiftyTwoWeekLow}
          marketCap={stockDetail.marketCap}
          volume={stockDetail.regularMarketVolume}
          dayHigh={stockDetail.regularMarketDayHigh}
          dayLow={stockDetail.regularMarketDayLow}
          isWatched={isInWatchlist(`stock-${stockDetail.symbol}`)}
          onToggleWatch={() => handleToggleStock(stockDetail.symbol, stockDetail.shortName)}
          onClose={() => setSelectedStock(null)}
        />
      )}

      {cryptoDetail && selectedCrypto && (
        <TickerDetail
          symbol={cryptoDetail.symbol}
          name={cryptoDetail.name}
          price={cryptoDetail.current_price}
          change={cryptoDetail.price_change_24h}
          changePercent={cryptoDetail.price_change_percentage_24h}
          high52w={cryptoDetail.ath}
          low52w={cryptoDetail.atl}
          marketCap={cryptoDetail.market_cap}
          volume={cryptoDetail.total_volume}
          dayHigh={cryptoDetail.high_24h}
          dayLow={cryptoDetail.low_24h}
          imageUrl={cryptoDetail.image}
          isWatched={isInWatchlist(cryptoDetail.id)}
          onToggleWatch={() => handleToggleCrypto(cryptoDetail)}
          onClose={() => setSelectedCrypto(null)}
        />
      )}
    </div>
  );
}
