import { useState, useMemo } from "react";
import { usePortfolio, Trade, PortfolioHolding } from "@/hooks/usePortfolio";
import { useStockQuotes, StockQuote } from "@/hooks/useStockData";
import { useCryptosByIds, CryptoTicker } from "@/hooks/useCryptoData";
import { formatCurrency, formatPercent } from "@/lib/format";
import { Briefcase, Plus, TrendingUp, TrendingDown, X, MoreVertical, Pencil, Trash2, ChevronDown, ChevronUp, GripVertical, FolderPlus, Tag, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useStockSearch } from "@/hooks/useStockData";
import { useCryptoSearch } from "@/hooks/useCryptoData";
import { PullToRefresh } from "@/components/PullToRefresh";
import { HoldToDeleteButton } from "@/components/HoldToDeleteButton";
import { usePortfolioMeta, PortfolioCategory } from "@/hooks/usePortfolioMeta";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function PortfolioPage() {
  const { holdings, trades, addTrade, removeTrade, updateTrade, removeHolding } = usePortfolio();
  const {
    categories,
    addCategory,
    renameCategory,
    deleteCategory,
    setHoldingCategory,
    setHoldingsOrder,
    getHoldingMeta,
  } = usePortfolioMeta();
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [expandedHolding, setExpandedHolding] = useState<string | null>(null);
  const [addTradeForHolding, setAddTradeForHolding] = useState<PortfolioHolding | null>(null);
  const [deleteTradeId, setDeleteTradeId] = useState<string | null>(null);
  const [deleteHoldingId, setDeleteHoldingId] = useState<string | null>(null);
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [categoryPickerFor, setCategoryPickerFor] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-glass-border/30">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unrealized</p>
            <p className={`text-sm font-semibold ${totalUnrealized >= 0 ? "text-gain" : "text-loss"}`}>
              {totalUnrealized >= 0 ? "+" : ""}{formatCurrency(totalUnrealized)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Realized</p>
            <p className={`text-sm font-semibold ${totalRealized >= 0 ? "text-gain" : "text-loss"}`}>
              {totalRealized >= 0 ? "+" : ""}{formatCurrency(totalRealized)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => setShowManageCategories(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" /> Manage Categories
        </button>
      </div>

      {holdings.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No holdings yet.</p>
          <p className="text-muted-foreground text-xs mt-1">Add a trade to get started.</p>
        </div>
      ) : (
        <CategorizedHoldings
          holdings={holdings}
          categories={categories}
          getHoldingMeta={getHoldingMeta}
          getLivePrice={getLivePrice}
          sensors={sensors}
          setHoldingsOrder={setHoldingsOrder}
          collapsedCategories={collapsedCategories}
          setCollapsedCategories={setCollapsedCategories}
          expandedHolding={expandedHolding}
          setExpandedHolding={setExpandedHolding}
          setEditingTrade={setEditingTrade}
          setDeleteTradeId={setDeleteTradeId}
          setDeleteHoldingId={setDeleteHoldingId}
          setAddTradeForHolding={setAddTradeForHolding}
          setCategoryPickerFor={setCategoryPickerFor}
        />
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

      {showManageCategories && (
        <ManageCategoriesModal
          categories={categories}
          onAdd={addCategory}
          onRename={renameCategory}
          onDelete={deleteCategory}
          onClose={() => setShowManageCategories(false)}
        />
      )}

      {categoryPickerFor && (
        <CategoryPickerModal
          categories={categories}
          currentCategoryId={getHoldingMeta(categoryPickerFor).categoryId}
          onSelect={(catId) => {
            setHoldingCategory(categoryPickerFor, catId);
            setCategoryPickerFor(null);
          }}
          onAddCategory={addCategory}
          onClose={() => setCategoryPickerFor(null)}
        />
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

// ============================================================
// CategorizedHoldings — groups holdings by category w/ DnD reorder
// ============================================================
interface CategorizedHoldingsProps {
  holdings: PortfolioHolding[];
  categories: PortfolioCategory[];
  getHoldingMeta: (tickerId: string) => { tickerId: string; categoryId: string | null; sortOrder: number };
  getLivePrice: (h: PortfolioHolding) => number | null;
  sensors: ReturnType<typeof useSensors>;
  setHoldingsOrder: (orderedTickerIds: string[]) => void;
  collapsedCategories: Set<string>;
  setCollapsedCategories: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedHolding: string | null;
  setExpandedHolding: (id: string | null) => void;
  setEditingTrade: (t: Trade | null) => void;
  setDeleteTradeId: (id: string | null) => void;
  setDeleteHoldingId: (id: string | null) => void;
  setAddTradeForHolding: (h: PortfolioHolding | null) => void;
  setCategoryPickerFor: (tickerId: string | null) => void;
}

function CategorizedHoldings(props: CategorizedHoldingsProps) {
  const {
    holdings,
    categories,
    getHoldingMeta,
    getLivePrice,
    sensors,
    setHoldingsOrder,
    collapsedCategories,
    setCollapsedCategories,
    expandedHolding,
    setExpandedHolding,
    setEditingTrade,
    setDeleteTradeId,
    setDeleteHoldingId,
    setAddTradeForHolding,
    setCategoryPickerFor,
  } = props;

  // Build groups: categoryId (or "_uncat") -> holdings sorted by meta.sortOrder
  const groups = useMemo(() => {
    const map = new Map<string, PortfolioHolding[]>();
    map.set("_uncat", []);
    categories.forEach((c) => map.set(c.id, []));
    for (const h of holdings) {
      const meta = getHoldingMeta(h.tickerId);
      const key = meta.categoryId && map.has(meta.categoryId) ? meta.categoryId : "_uncat";
      map.get(key)!.push(h);
    }
    // Sort each group by sortOrder
    for (const arr of map.values()) {
      arr.sort((a, b) => getHoldingMeta(a.tickerId).sortOrder - getHoldingMeta(b.tickerId).sortOrder);
    }
    return map;
  }, [holdings, categories, getHoldingMeta]);

  const orderedSections: { id: string; name: string; color: string | null; holdings: PortfolioHolding[] }[] = [
    ...categories.map((c) => ({ id: c.id, name: c.name, color: c.color, holdings: groups.get(c.id) ?? [] })),
    { id: "_uncat", name: "Uncategorized", color: null, holdings: groups.get("_uncat") ?? [] },
  ];

  const handleDragEnd = (categoryId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = groups.get(categoryId) ?? [];
    const oldIdx = list.findIndex((h) => h.tickerId === active.id);
    const newIdx = list.findIndex((h) => h.tickerId === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(list, oldIdx, newIdx);
    setHoldingsOrder(reordered.map((h) => h.tickerId));
  };

  const toggleCollapsed = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {orderedSections.map((section) => {
        if (section.holdings.length === 0 && section.id === "_uncat") return null;
        const collapsed = collapsedCategories.has(section.id);
        return (
          <div key={section.id} className="flex flex-col gap-2">
            <button
              onClick={() => toggleCollapsed(section.id)}
              className="flex items-center gap-2 px-1 py-1 group"
            >
              {collapsed ? (
                <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-muted-foreground transition-transform" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground transition-transform" />
              )}
              <Folder className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                {section.name}
              </span>
              <span className="text-[10px] text-muted-foreground/60">({section.holdings.length})</span>
            </button>

            {!collapsed && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd(section.id)}
              >
                <SortableContext
                  items={section.holdings.map((h) => h.tickerId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-3">
                    {section.holdings.map((h) => (
                      <SortableHoldingCard
                        key={h.tickerId}
                        holding={h}
                        livePrice={getLivePrice(h)}
                        isExpanded={expandedHolding === h.tickerId}
                        onToggleExpand={() => setExpandedHolding(expandedHolding === h.tickerId ? null : h.tickerId)}
                        onEditTrade={(t) => setEditingTrade(t)}
                        onDeleteTrade={(id) => setDeleteTradeId(id)}
                        onDeleteHolding={() => setDeleteHoldingId(h.tickerId)}
                        onAddTrade={() => setAddTradeForHolding(h)}
                        onPickCategory={() => setCategoryPickerFor(h.tickerId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// SortableHoldingCard
// ============================================================
interface SortableHoldingCardProps {
  holding: PortfolioHolding;
  livePrice: number | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEditTrade: (t: Trade) => void;
  onDeleteTrade: (id: string) => void;
  onDeleteHolding: () => void;
  onAddTrade: () => void;
  onPickCategory: () => void;
}

function SortableHoldingCard({
  holding: h,
  livePrice,
  isExpanded,
  onToggleExpand,
  onEditTrade,
  onDeleteTrade,
  onDeleteHolding,
  onAddTrade,
  onPickCategory,
}: SortableHoldingCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: h.tickerId,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const isClosed = h.totalQuantity <= 0;
  const currentValue = !isClosed && livePrice ? livePrice * h.totalQuantity : null;
  const unrealized = currentValue !== null ? currentValue - h.totalCost : null;
  const unrealizedPct = unrealized !== null && h.totalCost > 0 ? (unrealized / h.totalCost) * 100 : null;
  const realized = h.realizedPnl;

  return (
    <div ref={setNodeRef} style={style} className="glass-card p-4">
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="touch-none w-6 h-9 -ml-1 flex items-center justify-center text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
          {h.tickerSymbol.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">{h.tickerSymbol.toUpperCase()}</p>
            {isClosed && (
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground font-semibold">
                Closed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{h.tickerName}</p>
        </div>
        <div className="text-right mr-1">
          <p className="text-sm font-semibold text-foreground">
            {isClosed ? formatCurrency(realized) : currentValue ? formatCurrency(currentValue) : "—"}
          </p>
          {isClosed ? (
            <p className={`text-[10px] font-medium ${realized >= 0 ? "text-gain" : "text-loss"}`}>Realized</p>
          ) : unrealized !== null && unrealizedPct !== null && (
            <p className={`text-xs font-medium ${unrealized >= 0 ? "text-gain" : "text-loss"}`}>
              {unrealized >= 0 ? "+" : ""}{formatCurrency(unrealized)} ({formatPercent(unrealizedPct)})
            </p>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onPickCategory(); }}
          className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors"
          title="Move to category"
        >
          <Tag className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDeleteHolding(); }}
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
          <p className="text-xs font-semibold text-foreground">{isClosed ? "—" : formatCurrency(h.avgCostBasis)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Live Price</p>
          <p className="text-xs font-semibold text-foreground">{livePrice ? formatCurrency(livePrice) : "—"}</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-glass-border/20 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Realized P/L</p>
          <p className={`text-xs font-semibold ${realized >= 0 ? "text-gain" : "text-loss"}`}>
            {realized >= 0 ? "+" : ""}{formatCurrency(realized)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unrealized P/L</p>
          <p className={`text-xs font-semibold ${(unrealized ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
            {isClosed || unrealized === null ? "—" : `${unrealized >= 0 ? "+" : ""}${formatCurrency(unrealized)}`}
          </p>
        </div>
      </div>

      <button
        onClick={onToggleExpand}
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
              onEdit={() => onEditTrade(trade)}
              onDelete={() => onDeleteTrade(trade.id)}
            />
          ))}
          <button
            onClick={onAddTrade}
            className="w-full py-2 rounded-xl border border-dashed border-primary/30 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Trade
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ManageCategoriesModal
// ============================================================
function ManageCategoriesModal({
  categories,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: {
  categories: PortfolioCategory[];
  onAdd: (name: string) => string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewName("");
  };

  const startEdit = (c: PortfolioCategory) => {
    setEditingId(c.id);
    setEditingName(c.name);
  };

  const saveEdit = () => {
    if (editingId && editingName.trim()) onRename(editingId, editingName.trim());
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="glass-card w-full max-w-md max-h-[80vh] overflow-y-auto p-5 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Manage Categories</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New category name..."
            className="glass border-glass-border/50 rounded-xl"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No categories yet. Add one above to start organizing.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30">
                <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                {editingId === c.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    className="flex-1 h-8 glass border-glass-border/50 rounded-lg text-sm"
                  />
                ) : (
                  <p className="flex-1 text-sm font-semibold text-foreground truncate">{c.name}</p>
                )}
                <button
                  onClick={() => startEdit(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => onDelete(c.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-loss/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-loss" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CategoryPickerModal
// ============================================================
function CategoryPickerModal({
  categories,
  currentCategoryId,
  onSelect,
  onAddCategory,
  onClose,
}: {
  categories: PortfolioCategory[];
  currentCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  onAddCategory: (name: string) => string;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");

  const handleAddAndSelect = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const id = onAddCategory(trimmed);
    onSelect(id);
  };

  return (
    <div className="fixed inset-0 z-[65] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="glass-card w-full max-w-md max-h-[70vh] overflow-y-auto p-5 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">Move to Category</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={() => onSelect(null)}
            className={`flex items-center gap-2 p-3 rounded-xl transition-colors ${
              currentCategoryId === null ? "bg-primary/15 text-primary" : "bg-secondary/30 hover:bg-secondary/50 text-foreground"
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="text-sm font-semibold">Uncategorized</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex items-center gap-2 p-3 rounded-xl transition-colors ${
                currentCategoryId === c.id ? "bg-primary/15 text-primary" : "bg-secondary/30 hover:bg-secondary/50 text-foreground"
              }`}
            >
              <Folder className="w-4 h-4" />
              <span className="text-sm font-semibold">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-3 border-t border-glass-border/30">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddAndSelect()}
            placeholder="New category..."
            className="glass border-glass-border/50 rounded-xl"
          />
          <button
            onClick={handleAddAndSelect}
            disabled={!newName.trim()}
            className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center gap-1"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
