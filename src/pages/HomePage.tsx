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
    <div className="px-4 pt-12 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase mb-1">Welcome back</p>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-gradient-primary">Tradex</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass">
            <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? "bg-gain animate-dot-pulse" : "bg-loss"}`} style={{ backgroundColor: marketOpen ? "hsl(var(--gain))" : "hsl(var(--loss))" }} />
            <span className="text-[10px] font-semibold text-foreground">
              {marketOpen ? "Open" : "Closed"}
            </span>
          </div>
          <button
            onClick={() => setShowAlerts(true)}
            className="w-9 h-9 rounded-full glass flex items-center justify-center text-foreground active:animate-scale-press"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero — Portfolio gradient card */}
      <button
        onClick={() => navigate("/portfolio")}
        className="w-full glass-card-hero text-left mb-5 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div className="icon-chip">
            <Briefcase className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xs font-semibold text-foreground/80 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur">
            View →
          </span>
        </div>
        <p className="text-xs text-foreground/70 font-medium tracking-wide uppercase mb-1 relative z-10">Your Portfolio</p>
        <p className="text-3xl font-bold tracking-tight text-foreground relative z-10 tabular">
          Track trades & P&L
        </p>
      </button>

      {/* Index Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* S&P 500 */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">S&P 500</p>
            {sp500Data && (
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${sp500Positive ? "bg-gain" : "bg-loss"}`}>
                {sp500Positive ? <TrendingUp className="w-3 h-3 text-gain" /> : <TrendingDown className="w-3 h-3 text-loss" />}
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-foreground tabular tracking-tight">
            {sp500Data ? formatCurrency(sp500Data.regularMarketPrice) : "—"}
          </p>
          {sp500Data && (
            <p className={`text-xs font-semibold mt-1 tabular ${sp500Positive ? "text-gain" : "text-loss"}`}>
              {sp500Positive ? "+" : ""}{formatPercent(sp500Change)}
            </p>
          )}
        </div>
        {/* Nasdaq */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">NASDAQ</p>
            {nasdaqData && (
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${nasdaqPositive ? "bg-gain" : "bg-loss"}`}>
                {nasdaqPositive ? <TrendingUp className="w-3 h-3 text-gain" /> : <TrendingDown className="w-3 h-3 text-loss" />}
              </div>
            )}
          </div>
          <p className="text-xl font-bold text-foreground tabular tracking-tight">
            {nasdaqData ? formatCurrency(nasdaqData.regularMarketPrice) : "—"}
          </p>
          {nasdaqData && (
            <p className={`text-xs font-semibold mt-1 tabular ${nasdaqPositive ? "text-gain" : "text-loss"}`}>
              {nasdaqPositive ? "+" : ""}{formatPercent(nasdaqChange)}
            </p>
          )}
        </div>
      </div>

      {/* Watchlist Section */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground tracking-wide">Watchlist</h2>
        </div>
        {watchlist.length > 0 && (
          <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">
            {watchlist.length}
          </span>
        )}
      </div>

      {watchlist.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Eye className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Your watchlist is empty.</p>
          <p className="text-muted-foreground text-xs mt-1">Search for tickers to add them here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry, idx) => {
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
          postMarketPrice={selectedStock.postMarketPrice}
          postMarketChange={selectedStock.postMarketChange}
          postMarketChangePercent={selectedStock.postMarketChangePercent}
          marketState={selectedStock.marketState}
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
