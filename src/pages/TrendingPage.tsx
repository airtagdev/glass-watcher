import { useTopCryptos, CryptoTicker } from "@/hooks/useCryptoData";
import { usePopularStocks, StockQuote } from "@/hooks/useStockData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Flame, Plus, Check } from "lucide-react";

interface TrendingItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  imageUrl?: string;
  type: "stock" | "crypto";
}

export default function TrendingPage() {
  const { data: cryptos, isLoading: cryptoLoading } = useTopCryptos();
  const { data: stocks, isLoading: stockLoading } = usePopularStocks();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  const isLoading = cryptoLoading || stockLoading;

  const items: TrendingItem[] = [];

  if (cryptos) {
    cryptos.forEach((c) => {
      items.push({
        id: c.id,
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        price: c.current_price,
        changePercent: c.price_change_percentage_24h ?? 0,
        imageUrl: c.image,
        type: "crypto",
      });
    });
  }

  if (stocks) {
    stocks.forEach((s) => {
      items.push({
        id: `stock-${s.symbol}`,
        symbol: s.symbol,
        name: s.shortName,
        price: s.regularMarketPrice,
        changePercent: s.regularMarketChangePercent,
        type: "stock",
      });
    });
  }

  // Sort by biggest increase (descending)
  items.sort((a, b) => b.changePercent - a.changePercent);

  const handleToggle = (item: TrendingItem) => {
    if (isInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist({ id: item.id, symbol: item.symbol, name: item.name, type: item.type });
    }
  };

  return (
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Trending</h1>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card aspect-square animate-pulse" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const isPositive = item.changePercent >= 0;
          const watched = isInWatchlist(item.id);
          return (
            <div
              key={item.id}
              className="glass-card p-3 flex flex-col justify-between aspect-square rounded-2xl relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.symbol} className="w-7 h-7 rounded-full shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold shrink-0">
                      {item.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.symbol}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{item.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(item)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    watched
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {watched ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>

              <div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(item.price)}</p>
                <p className={`text-sm font-semibold ${isPositive ? "text-gain" : "text-loss"}`}>
                  {formatPercent(item.changePercent)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
