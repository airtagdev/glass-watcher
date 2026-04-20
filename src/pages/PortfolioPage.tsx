import { useState } from "react";
import { usePortfolio, Trade, PortfolioHolding } from "@/hooks/usePortfolio";
import { useStockQuotes, StockQuote } from "@/hooks/useStockData";
import { useCryptosByIds, CryptoTicker } from "@/hooks/useCryptoData";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Briefcase, Plus, TrendingUp, TrendingDown, X, MoreVertical, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStockSearch } from "@/hooks/useStockData";
import { useCryptoSearch } from "@/hooks/useCryptoData";
import { PullToRefresh } from "@/components/PullToRefresh";
import { HoldToDeleteButton } from "@/components/HoldToDeleteButton";

export default function PortfolioPage() {
  const { holdings, trades, addTrade, removeTrade, updateTrade, removeHolding } = usePortfolio();
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null);
  const [addTradeForHolding, setAddTradeForHolding] = useState<PortfolioHolding | null>(null);
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null);
  const [deleteHoldingId, setDeleteHoldingId] = useState<string | null>(null);

  const stockSymbols = holdings.filter((h) => h.tickerType === "stock").map((h) => h.tickerSymbol);
  const cryptoIds = holdings.filter((h) => h.tickerType === "crypto").map((h) => h.tickerId);
  const { data: stockPrices } = useStockQuotes(stockSymbols);
  const { data: cryptoPrices } = useCryptosByIds(cryptoIds);

  const getLivePrice = (h: typeof holdings[0]): number | null => {
    if (h.tickerType === "stock") {
      return stockPrices?.find((sp) => sp.symbol === h.tickerSymbol)?.regularMarketPrice ?? null;
    }
    return cryptoPrices?.find((cp) => cp.id === h.tickerId)?.current_price ?? null;
  };

  let totalValue = 0;
  let totalCost = 0;
  let totalRealized = 0;
  for (const h of holdings) {
    const live = getLivePrice(h);
    if (live) totalValue += live * h.totalQuantity;
    totalCost += h.totalCost;
    totalRealized += h.realizedPnl;
  }
  const totalUnrealized = totalValue - totalCost;
  const totalPnl = totalUnrealized + totalRealized;
  const totalPnlPercent = totalCost > 0 ? (totalUnrealized / totalCost) * 100 : 0;

  return (
    <PullToRefresh>
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
        </div>
        <button
          onClick={() => setShowAddTrade(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-xs font-semibold text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Trade
        </button>
      </div>

      <div className="glass-card p-5 mb-6">
        <p className="text-xs text-muted-foreground mb-1">Total Portfolio Value</p>
        <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-sm font-medium ${totalPnl >= 0 ? "text-gain" : "text-loss"}`}>
            {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
          </span>
          <span className={`text-xs ${totalPnl >= 0 ? "text-gain" : "text-loss"}`}>
            ({formatPercent(totalPnlPercent)})
          </span>
        </div>
      </div>

      {holdings.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No holdings yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Add a trade to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {holdings.map((h) => {
            const livePrice = getLivePrice(h);
            const currentValue = livePrice ? livePrice * h.totalQuantity : null;
            const pnl = currentValue ? currentValue - h.totalCost : null;
            const pnlPercent = pnl && h.totalCost > 0 ? (pnl / h.totalCost) * 100 : null;
            const isExpanded = expandedHolding === h.tickerId;

            return (
              <div key={h.tickerId} className="glass-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                    {h.tickerSymbol.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{h.tickerSymbol.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground truncate">{h.tickerName}</p>
                  </div>
                  <div className="text-right mr-1">
                    <p className="text-sm font-semibold text-foreground">
                      {currentValue ? formatCurrency(currentValue) : "—"}
                    </p>
                    {pnl !== null && pnlPercent !== null && (
                      <p className={`text-xs font-medium ${pnl >= 0 ? "text-gain" : "text-loss"}`}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({formatPercent(pnlPercent)})
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteHoldingId(h.tickerId); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-loss/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-loss" />
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-glass-border/30 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Shares</p>
                    <p className="text-xs font-semibold text-foreground">{h.totalQuantity.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Avg Cost</p>
                    <p className="text-xs font-semibold text-foreground">{formatCurrency(h.avgCostBasis)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Live Price</p>
                    <p className="text-xs font-semibold text-foreground">{livePrice ? formatCurrency(livePrice) : "—"}</p>
                  </div>
                </div>

                {/* Expand/collapse trades */}
                <button
                  onClick={() => setExpandedHolding(isExpanded ? null : h.tickerId)}
                  className="w-full mt-3 pt-2 border-t border-glass-border/20 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {h.trades.length} trade{h.trades.length !== 1 ? "s" : ""}
                </button>

                {isExpanded && (
                  <div className="mt-2 flex flex-col gap-2">
                    {h.trades.map((trade) => (
                      <TradeRow
                        key={trade.id}
                        trade={trade}
                        onEdit={() => setEditingTrade(trade)}
                        onDelete={() => setDeleteTradeId(trade.id)}
                      />
                    ))}
                    <button
                      onClick={() => setAddTradeForHolding(h)}
                      className="w-full py-2 rounded-xl border border-dashed border-primary/30 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Trade
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddTrade && (
        <AddTradeModal onClose={() => setShowAddTrade(false)} onAdd={addTrade} />
      )}

      {addTradeForHolding && (
        <AddTradeModal
          onClose={() => setAddTradeForHolding(null)}
          onAdd={(t) => { addTrade(t); setAddTradeForHolding(null); }}
          preselected={{ id: addTradeForHolding.tickerId, symbol: addTradeForHolding.tickerSymbol, name: addTradeForHolding.tickerName, type: addTradeForHolding.tickerType }}
        />
      )}

      {editingTrade && (
        <EditTradeModal
          trade={editingTrade}
          onClose={() => setEditingTrade(null)}
          onSave={(updates) => {
            updateTrade(editingTrade.id, updates);
            setEditingTrade(null);
          }}
          onDelete={() => {
            setDeleteTradeId(editingTrade.id);
            setEditingTrade(null);
          }}
        />
      )}

      {deleteTradeId && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="glass-card w-full max-w-xs p-5 rounded-2xl text-center animate-scale-in">
            <Trash2 className="w-8 h-8 text-loss mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Delete Trade?</h3>
            <p className="text-xs text-muted-foreground mb-4">Hold the button for 3 seconds to confirm.</p>
            <div className="flex flex-col gap-2">
              <HoldToDeleteButton
                label="Hold to Delete"
                onDelete={() => { removeTrade(deleteTradeId); setDeleteTradeId(null); }}
              />
              <button
                onClick={() => setDeleteTradeId(null)}
                className="w-full py-2.5 rounded-xl bg-secondary text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteHoldingId && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="glass-card w-full max-w-xs p-5 rounded-2xl text-center animate-scale-in">
            <Trash2 className="w-8 h-8 text-loss mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Delete All Trades?</h3>
            <p className="text-xs text-muted-foreground mb-4">Hold the button for 3 seconds to remove this entire holding.</p>
            <div className="flex flex-col gap-2">
              <HoldToDeleteButton
                label="Hold to Delete All"
                onDelete={() => { removeHolding(deleteHoldingId); setDeleteHoldingId(null); }}
              />
              <button
                onClick={() => setDeleteHoldingId(null)}
                className="w-full py-2.5 rounded-xl bg-secondary text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}

function TradeRow({ trade, onEdit, onDelete }: { trade: Trade; onEdit: () => void; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const isBuy = trade.type === "buy";

  return (
    <div className="relative flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isBuy ? "bg-gain/20" : "bg-loss/20"}`}>
        {isBuy ? <TrendingUp className="w-3 h-3 text-gain" /> : <TrendingDown className="w-3 h-3 text-loss" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">
          {isBuy ? "Buy" : "Sell"} · {trade.quantity} @ {formatCurrency(trade.price)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(trade.date).toLocaleDateString()} · Total: {formatCurrency(trade.price * trade.quantity)}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
      >
        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 glass-card rounded-xl shadow-lg overflow-hidden min-w-[120px]">
            <button
              onClick={() => { setShowMenu(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit Trade
            </button>
            <button
              onClick={() => { setShowMenu(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-loss hover:bg-loss/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Delete Trade
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EditTradeModal({
  trade,
  onClose,
  onSave,
  onDelete,
}: {
  trade: Trade;
  onClose: () => void;
  onSave: (updates: Partial<Omit<Trade, "id">>) => void;
  onDelete: () => void;
}) {
  const [tradeType, setTradeType] = useState<"buy" | "sell">(trade.type);
  const [price, setPrice] = useState(String(trade.price));
  const [quantity, setQuantity] = useState(String(trade.quantity));

  const handleSave = () => {
    if (!price || !quantity) return;
    onSave({ type: tradeType, price: parseFloat(price), quantity: parseFloat(quantity) });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="glass-card w-full max-w-md p-5 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Edit Trade</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="glass p-3 rounded-xl flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
            {trade.tickerSymbol.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{trade.tickerSymbol.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">{trade.tickerName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTradeType("buy")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tradeType === "buy" ? "bg-gain/20 text-gain" : "bg-secondary text-muted-foreground"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" /> Buy
            </button>
            <button
              onClick={() => setTradeType("sell")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tradeType === "sell" ? "bg-loss/20 text-loss" : "bg-secondary text-muted-foreground"
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-1" /> Sell
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Price per unit ($)</label>
            <Input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="glass border-glass-border/50 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
            <Input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="glass border-glass-border/50 rounded-xl"
            />
          </div>

          {price && quantity && (
            <div className="text-center text-sm text-muted-foreground">
              Total: <span className="text-foreground font-semibold">{formatCurrency(parseFloat(price) * parseFloat(quantity))}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!price || !quantity}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
          >
            Save Changes
          </button>

          <button
            onClick={onDelete}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-loss hover:bg-loss/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete Trade
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTradeModal({ onClose, onAdd, preselected }: { onClose: () => void; onAdd: (t: Omit<Trade, "id">) => void; preselected?: { id: string; symbol: string; name: string; type: "stock" | "crypto" } }) {
  const [step, setStep] = useState<"search" | "form">(preselected ? "form" : "search");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string; symbol: string; name: string; type: "stock" | "crypto" } | null>(preselected || null);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

  const { data: stockResults } = useStockSearch(query);
  const { data: cryptoResults } = useCryptoSearch(query);

  const handleSelect = (id: string, symbol: string, name: string, type: "stock" | "crypto") => {
    setSelected({ id, symbol, name, type });
    setStep("form");
  };

  const handleSubmit = () => {
    if (!selected || !price || !quantity) return;
    onAdd({
      tickerId: selected.id,
      tickerSymbol: selected.symbol,
      tickerName: selected.name,
      tickerType: selected.type,
      type: tradeType,
      price: parseFloat(price),
      quantity: parseFloat(quantity),
      date: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="glass-card w-full max-w-md max-h-[80vh] overflow-y-auto p-5 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {step === "search" ? "Select Ticker" : `Add ${tradeType === "buy" ? "Buy" : "Sell"}`}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === "search" && (
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ticker..."
              className="mb-4 glass border-glass-border/50 rounded-xl"
              autoFocus
            />
            {stockResults && stockResults.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">Stocks</p>
                {stockResults.slice(0, 5).map((r) => (
                  <button
                    key={r.symbol}
                    onClick={() => handleSelect(`stock-${r.symbol}`, r.symbol, r.shortname, "stock")}
                    className="w-full text-left p-3 rounded-xl hover:bg-secondary/50 transition-colors flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                      {r.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.symbol}</p>
                      <p className="text-xs text-muted-foreground">{r.shortname}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {cryptoResults && cryptoResults.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-2">Crypto</p>
                {cryptoResults.slice(0, 5).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r.id, r.symbol, r.name, "crypto")}
                    className="w-full text-left p-3 rounded-xl hover:bg-secondary/50 transition-colors flex items-center gap-3"
                  >
                    {r.thumb ? (
                      <img src={r.thumb} className="w-7 h-7 rounded-full" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                        {r.symbol.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.symbol.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{r.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === "form" && selected && (
          <div className="flex flex-col gap-4">
            <div className="glass p-3 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                {selected.symbol.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selected.symbol.toUpperCase()}</p>
                <p className="text-xs text-muted-foreground">{selected.name}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTradeType("buy")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tradeType === "buy" ? "bg-gain/20 text-gain" : "bg-secondary text-muted-foreground"
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-1" /> Buy
              </button>
              <button
                onClick={() => setTradeType("sell")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  tradeType === "sell" ? "bg-loss/20 text-loss" : "bg-secondary text-muted-foreground"
                }`}
              >
                <TrendingDown className="w-4 h-4 inline mr-1" /> Sell
              </button>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Price per unit ($)</label>
              <Input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="glass border-glass-border/50 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="glass border-glass-border/50 rounded-xl"
              />
            </div>

            {price && quantity && (
              <div className="text-center text-sm text-muted-foreground">
                Total: <span className="text-foreground font-semibold">{formatCurrency(parseFloat(price) * parseFloat(quantity))}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!price || !quantity}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40"
            >
              Add {tradeType === "buy" ? "Buy" : "Sell"} Trade
            </button>

            <button
              onClick={() => { setStep("search"); setSelected(null); }}
              className="text-xs text-muted-foreground text-center"
            >
              ← Back to search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
