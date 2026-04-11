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
              className="glass-card p-4 flex flex-col justify-between aspect-square rounded-2xl relative"
            >
              {/* Type badge */}
              <span className={`absolute top-2.5 right-2.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                item.type === "crypto"
                  ? "bg-primary/15 text-primary"
                  : "bg-accent text-accent-foreground"
              }`}>
                {item.type === "crypto" ? "Crypto" : "Stock"}
              </span>

              {/* Icon + Name */}
              <div className="flex items-center gap-3">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.symbol} className="w-10 h-10 rounded-full shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
                    {item.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{item.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                </div>
              </div>

              {/* Price + Change + Watchlist */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(item.price)}</p>
                  <p className={`text-sm font-semibold ${isPositive ? "text-gain" : "text-loss"}`}>
                    {formatPercent(item.changePercent)}
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(item)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    watched
                      ? "bg-primary/20 text-primary"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {watched ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
