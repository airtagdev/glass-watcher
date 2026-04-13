import { useState } from "react";
import { useTopCryptos, useCryptoSearch, useCryptoDetail, CryptoTicker } from "@/hooks/useCryptoData";
import { useWatchlist } from "@/hooks/useWatchlist";
import { TickerCard } from "@/components/TickerCard";
import { TickerDetail } from "@/components/TickerDetail";
import { Input } from "@/components/ui/input";
import { Search, Bitcoin } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";

export default function CryptoPage() {
  const [query, setQuery] = useState("");
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { data: topCryptos, isLoading } = useTopCryptos();
  const { data: searchResults } = useCryptoSearch(query);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoTicker | null>(null);
  const [searchSelectedId, setSearchSelectedId] = useState<string | null>(null);
  const { data: searchDetailData } = useCryptoDetail(searchSelectedId || "");

  const handleToggle = (c: CryptoTicker) => {
    if (isInWatchlist(c.id)) removeFromWatchlist(c.id);
    else addToWatchlist({ id: c.id, symbol: c.symbol, name: c.name, type: "crypto" });
  };

  const handleSearchClick = (r: { id: string; symbol: string; name: string }) => {
    const found = topCryptos?.find((c) => c.id === r.id);
    if (found) {
      setSelectedCrypto(found);
    } else {
      setSearchSelectedId(r.id);
    }
  };

  // Use fetched detail data for search-selected crypto
  const detailCrypto = selectedCrypto || (searchDetailData && searchSelectedId ? searchDetailData : null);

  const showSearch = query.length >= 1 && searchResults;

  return (
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Bitcoin className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Crypto</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search crypto..."
          className="pl-9 glass border-glass-border/50 rounded-xl"
        />
      </div>

      {showSearch ? (
        <div className="flex flex-col gap-3">
          {searchResults.map((r) => (
            <div
              key={r.id}
              onClick={() => handleSearchClick(r)}
              className="glass-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
            >
              {r.thumb ? (
                <img src={r.thumb} alt={r.symbol} className="w-9 h-9 rounded-full bg-secondary" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                  {r.symbol.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{r.symbol.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground truncate">{r.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-4 h-16 animate-pulse" />
            ))}
          {topCryptos?.map((c) => (
            <TickerCard
              key={c.id}
              symbol={c.symbol}
              name={c.name}
              price={c.current_price}
              changePercent={c.price_change_percentage_24h}
              change={c.price_change_24h}
              imageUrl={c.image}
              isWatched={isInWatchlist(c.id)}
              onToggleWatch={() => handleToggle(c)}
              onClick={() => setSelectedCrypto(c)}
            />
          ))}
        </div>
      )}

      {detailCrypto && (
        <TickerDetail
          symbol={detailCrypto.symbol}
          name={detailCrypto.name}
          price={detailCrypto.current_price}
          change={detailCrypto.price_change_24h}
          changePercent={detailCrypto.price_change_percentage_24h}
          high52w={detailCrypto.ath}
          low52w={detailCrypto.atl}
          marketCap={detailCrypto.market_cap}
          volume={detailCrypto.total_volume}
          dayHigh={detailCrypto.high_24h}
          dayLow={detailCrypto.low_24h}
          imageUrl={detailCrypto.image}
          isWatched={isInWatchlist(detailCrypto.id)}
          onToggleWatch={() => handleToggle(detailCrypto)}
          onClose={() => { setSelectedCrypto(null); setSearchSelectedId(null); }}
        />
      )}
    </div>
  );
}
