import { useState, useMemo, useEffect } from "react";
import { useWatchlist, WatchlistItem } from "@/hooks/useWatchlist";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useCryptosByIds } from "@/hooks/useCryptoData";
import { useStockQuotes, useStockDetail, StockQuote } from "@/hooks/useStockData";
import { TickerCard } from "@/components/TickerCard";
import { TickerDetail } from "@/components/TickerDetail";
import { CryptoTicker } from "@/hooks/useCryptoData";
import { Home, Eye, Bell, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { ManageAlerts } from "@/components/ManageAlerts";
import { formatCurrency, formatPercent } from "@/lib/format";

function useMarketStatus() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = et.getDay();
      const hours = et.getHours();
      const minutes = et.getMinutes();
      const time = hours * 60 + minutes;
      // Mon-Fri, 9:30 AM - 4:00 PM ET
      setIsOpen(day >= 1 && day <= 5 && time >= 570 && time < 960);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  return isOpen;
}
import { useNavigate } from "react-router-dom";

type WatchlistEntry = {
  watchlistItem: WatchlistItem;
  stock?: StockQuote;
  crypto?: CryptoTicker;
};

export default function HomePage() {
  const marketOpen = useMarketStatus();
  const navigate = useNavigate();
  const { watchlist, removeFromWatchlist, isInWatchlist, addToWatchlist, togglePin, isPinned, pinnedIds, pinCount, maxPins } = useWatchlist();
  const [showAlerts, setShowAlerts] = useState(false);
  const cryptoIds = watchlist.filter((w) => w.type === "crypto").map((w) => w.id);
  const stockSymbols = watchlist.filter((w) => w.type === "stock").map((w) => w.symbol);

  const { data: cryptoData } = useCryptosByIds(cryptoIds);
  const { data: stockData } = useStockQuotes(stockSymbols);

  // S&P 500 & Nasdaq data
  const { data: sp500Data } = useStockDetail("^GSPC");
  const { data: nasdaqData } = useStockDetail("^IXIC");

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

  const entries = useMemo<WatchlistEntry[]>(() => {
    const result: WatchlistEntry[] = watchlist.map((item) => {
      if (item.type === "stock") {
        const stock = stockData?.find((s) => `stock-${s.symbol}` === item.id);
        return { watchlistItem: item, stock };
      } else {
        const crypto = cryptoData?.find((c) => c.id === item.id);
        return { watchlistItem: item, crypto };
      }
    });
    const pinned = result.filter((e) => isPinned(e.watchlistItem.id));
    const unpinned = result.filter((e) => !isPinned(e.watchlistItem.id));
    pinned.sort((a, b) => pinnedIds.indexOf(a.watchlistItem.id) - pinnedIds.indexOf(b.watchlistItem.id));
    return [...pinned, ...unpinned];
  }, [watchlist, stockData, cryptoData, isPinned, pinnedIds]);

  const canPin = pinCount < maxPins;

  const sp500Change = sp500Data?.regularMarketChangePercent ?? 0;
  const sp500Positive = sp500Change >= 0;
  const nasdaqChange = nasdaqData?.regularMarketChangePercent ?? 0;
  const nasdaqPositive = nasdaqChange >= 0;

  return (
    <PullToRefresh>
    <div className="px-4 pt-14 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Home</h1>
        </div>
        <button
          onClick={() => setShowAlerts(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs font-semibold text-foreground"
        >
          <Bell className="w-3.5 h-3.5" />
          Alerts
        </button>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* S&P 500 */}
        <div className="glass-card p-3.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">S&P 500</p>
          <p className="text-lg font-bold text-foreground">
            {sp500Data ? formatCurrency(sp500Data.regularMarketPrice) : "—"}
          </p>
          {sp500Data && (
            <div className={`flex items-center gap-1 mt-0.5 ${sp500Positive ? "text-gain" : "text-loss"}`}>
              {sp500Positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-xs font-semibold">{formatPercent(sp500Change)}</span>
            </div>
          )}
        </div>
        {/* Nasdaq */}
        <div className="glass-card p-3.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">NASDAQ</p>
          <p className="text-lg font-bold text-foreground">
            {nasdaqData ? formatCurrency(nasdaqData.regularMarketPrice) : "—"}
          </p>
          {nasdaqData && (
            <div className={`flex items-center gap-1 mt-0.5 ${nasdaqPositive ? "text-gain" : "text-loss"}`}>
              {nasdaqPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-xs font-semibold">{formatPercent(nasdaqChange)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Button */}
      <button
        onClick={() => navigate("/portfolio")}
        className="w-full glass-card p-4 mb-6 flex items-center gap-3 active:scale-[0.98] transition-transform"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Portfolio</p>
          <p className="text-xs text-muted-foreground">Track your trades & P&L</p>
        </div>
        <span className="text-muted-foreground text-lg">›</span>
      </button>

      {/* Watchlist Section */}
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Watchlist</h2>
      </div>

      {watchlist.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Your watchlist is empty.</p>
          <p className="text-muted-foreground text-xs mt-1">Search for tickers to add them here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const { watchlistItem, stock, crypto } = entry;
            const id = watchlistItem.id;

            if (watchlistItem.type === "stock" && stock) {
              return (
                <TickerCard
                  key={id}
                  symbol={stock.symbol}
                  name={stock.shortName}
                  price={stock.regularMarketPrice}
                  changePercent={stock.regularMarketChangePercent}
                  change={stock.regularMarketChange}
                  dayHigh={stock.regularMarketDayHigh}
                  dayLow={stock.regularMarketDayLow}
                  high52w={stock.fiftyTwoWeekHigh}
                  low52w={stock.fiftyTwoWeekLow}
                  isWatched={true}
                  onToggleWatch={() => handleToggleStock(stock)}
                  onClick={() => setSelectedStock(stock)}
                  isPinned={isPinned(id)}
                  onTogglePin={() => togglePin(id)}
                  canPin={canPin}
                />
              );
            }

            if (watchlistItem.type === "crypto" && crypto) {
              return (
                <TickerCard
                  key={id}
                  symbol={crypto.symbol}
                  name={crypto.name}
                  price={crypto.current_price}
                  changePercent={crypto.price_change_percentage_24h}
                  change={crypto.price_change_24h}
                  imageUrl={crypto.image}
                  isWatched={true}
                  onToggleWatch={() => handleToggleCrypto(crypto)}
                  onClick={() => setSelectedCrypto(crypto)}
                  isPinned={isPinned(id)}
                  onTogglePin={() => togglePin(id)}
                  canPin={canPin}
                />
              );
            }

            return (
              <div key={id} className="glass-card p-4 h-16 animate-pulse flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary" />
                <div className="flex-1">
                  <div className="h-3 w-16 bg-secondary rounded mb-1.5" />
                  <div className="h-2.5 w-24 bg-secondary rounded" />
                </div>
              </div>
            );
          })}
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
          trailingPE={selectedStock.trailingPE}
          tickerType="stock"
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
          tickerType="crypto"
          isWatched={isInWatchlist(selectedCrypto.id)}
          onToggleWatch={() => handleToggleCrypto(selectedCrypto)}
          onClose={() => setSelectedCrypto(null)}
        />
      )}

      {showAlerts && <ManageAlerts onClose={() => setShowAlerts(false)} />}
    </div>
    </PullToRefresh>
  );
}
