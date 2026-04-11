import { useState } from "react";
import { useWatchlist, WatchlistItem } from "@/hooks/useWatchlist";
import { useCryptosByIds } from "@/hooks/useCryptoData";
import { useStockQuotes, StockQuote } from "@/hooks/useStockData";
import { TickerCard } from "@/components/TickerCard";
import { TickerDetail } from "@/components/TickerDetail";
import { CryptoTicker } from "@/hooks/useCryptoData";
import { Eye, Sparkles, Bell } from "lucide-react";
import { useState as useStateAlerts } from "react";
import { ManageAlerts } from "@/components/ManageAlerts";

export default function HomePage() {
  const { watchlist, removeFromWatchlist, isInWatchlist, addToWatchlist } = useWatchlist();
  const [showAlerts, setShowAlerts] = useStateAlerts(false);
  const cryptoIds = watchlist.filter((w) => w.type === "crypto").map((w) => w.id);
  const stockSymbols = watchlist.filter((w) => w.type === "stock").map((w) => w.symbol);

  const { data: cryptoData } = useCryptosByIds(cryptoIds);
  const { data: stockData } = useStockQuotes(stockSymbols);

  const [selectedCrypto, setSelectedCrypto] = useState<CryptoTicker | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  const handleToggleCrypto = (c: CryptoTicker) => {
    const id = c.id;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist({ id, symbol: c.symbol, name: c.name, type: "crypto" });
  };

  const handleToggleStock = (s: StockQuote) => {
    const id = `stock-${s.symbol}`;
    if (isInWatchlist(id)) removeFromWatchlist(id);
    else addToWatchlist({ id, symbol: s.symbol, name: s.shortName, type: "stock" });
  };

  return (
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Watchlist</h1>
        </div>
        <button
          onClick={() => setShowAlerts(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs font-semibold text-foreground"
        >
          <Bell className="w-3.5 h-3.5" />
          Manage Alerts
        </button>
      </div>

      {watchlist.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Your watchlist is empty.</p>
          <p className="text-muted-foreground text-xs mt-1">Search for tickers to add them here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stockData?.map((s) => (
            <TickerCard
              key={s.symbol}
              symbol={s.symbol}
              name={s.shortName}
              price={s.regularMarketPrice}
              changePercent={s.regularMarketChangePercent}
              change={s.regularMarketChange}
              isWatched={true}
              onToggleWatch={() => handleToggleStock(s)}
              onClick={() => setSelectedStock(s)}
            />
          ))}
          {cryptoData?.map((c) => (
            <TickerCard
              key={c.id}
              symbol={c.symbol}
              name={c.name}
              price={c.current_price}
              changePercent={c.price_change_percentage_24h}
              change={c.price_change_24h}
              imageUrl={c.image}
              isWatched={true}
              onToggleWatch={() => handleToggleCrypto(c)}
              onClick={() => setSelectedCrypto(c)}
            />
          ))}
        </div>
      )}

      {selectedStock && (
        <TickerDetail
          symbol={selectedStock.symbol}
          name={selectedStock.shortName}
          price={selectedStock.regularMarketPrice}
          change={selectedStock.regularMarketChange}
          changePercent={selectedStock.regularMarketChangePercent}
          high52w={selectedStock.fiftyTwoWeekHigh}
          low52w={selectedStock.fiftyTwoWeekLow}
          marketCap={selectedStock.marketCap}
          volume={selectedStock.regularMarketVolume}
          dayHigh={selectedStock.regularMarketDayHigh}
          dayLow={selectedStock.regularMarketDayLow}
          isWatched={isInWatchlist(`stock-${selectedStock.symbol}`)}
          onToggleWatch={() => handleToggleStock(selectedStock)}
          onClose={() => setSelectedStock(null)}
        />
      )}

      {selectedCrypto && (
        <TickerDetail
          symbol={selectedCrypto.symbol}
          name={selectedCrypto.name}
          price={selectedCrypto.current_price}
          change={selectedCrypto.price_change_24h}
          changePercent={selectedCrypto.price_change_percentage_24h}
          high52w={selectedCrypto.ath}
          low52w={selectedCrypto.atl}
          marketCap={selectedCrypto.market_cap}
          volume={selectedCrypto.total_volume}
          dayHigh={selectedCrypto.high_24h}
          dayLow={selectedCrypto.low_24h}
          imageUrl={selectedCrypto.image}
          isWatched={isInWatchlist(selectedCrypto.id)}
          onToggleWatch={() => handleToggleCrypto(selectedCrypto)}
          onClose={() => setSelectedCrypto(null)}
        />
      )}
    </div>
  );
}
