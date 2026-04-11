import { useState } from "react";
import { X, Plus, Bell, Trash2, Search as SearchIcon, ChevronDown } from "lucide-react";
import { useAlerts, PriceAlert } from "@/hooks/useAlerts";
import { useStockSearch } from "@/hooks/useStockData";
import { useCryptoSearch } from "@/hooks/useCryptoData";
import { Input } from "@/components/ui/input";

interface ManageAlertsProps {
  onClose: () => void;
}

type SelectedTicker = {
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  thumb?: string;
};

export function ManageAlerts({ onClose }: ManageAlertsProps) {
  const { alerts, addAlert, removeAlert } = useAlerts();
  const [view, setView] = useState<"list" | "create">("list");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 glass-card rounded-3xl p-6 animate-fade-in max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "list" ? (
          <AlertList
            alerts={alerts}
            onRemove={removeAlert}
            onClose={onClose}
            onCreate={() => setView("create")}
          />
        ) : (
          <CreateAlert
            onBack={() => setView("list")}
            onSave={(data) => {
              addAlert(data);
              setView("list");
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---- Alert List ---- */
function AlertList({
  alerts,
  onRemove,
  onClose,
  onCreate,
}: {
  alerts: PriceAlert[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-foreground">Manage Alerts</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreate}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-10">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Your alert list is empty.</p>
          <p className="text-muted-foreground text-xs mt-1">
            Press the <span className="text-primary font-semibold">+</span> button to create one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((a) => (
            <div key={a.id} className="glass p-3.5 rounded-xl flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {a.tickerSymbol.toUpperCase()}{" "}
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    {a.tickerType}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.alertType === "price"
                    ? `Price reaches $${a.value}`
                    : `${a.direction === "increase" ? "+" : "-"}${a.value}% change`}
                </p>
              </div>
              <button
                onClick={() => onRemove(a.id)}
                className="w-8 h-8 rounded-full bg-loss/20 text-loss flex items-center justify-center shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---- Create Alert ---- */
function CreateAlert({
  onBack,
  onSave,
}: {
  onBack: () => void;
  onSave: (data: Omit<PriceAlert, "id" | "createdAt">) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedTicker | null>(null);
  const [alertType, setAlertType] = useState<"price" | "percentage">("price");
  const [priceValue, setPriceValue] = useState("");
  const [percentValue, setPercentValue] = useState("");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");

  const { data: stockResults } = useStockSearch(selected ? "" : query);
  const { data: cryptoResults } = useCryptoSearch(selected ? "" : query);

  const showResults = !selected && query.length >= 1;

  const handleSave = () => {
    if (!selected) return;
    const value =
      alertType === "price" ? parseFloat(priceValue) : parseFloat(percentValue);
    if (isNaN(value) || value <= 0) return;

    onSave({
      tickerSymbol: selected.symbol,
      tickerName: selected.name,
      tickerType: selected.type,
      alertType,
      value,
      direction: alertType === "percentage" ? direction : undefined,
    });
  };

  const canSave =
    selected &&
    ((alertType === "price" && parseFloat(priceValue) > 0) ||
      (alertType === "percentage" && parseFloat(percentValue) > 0));

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-foreground">Create Alert</h2>
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Ticker search */}
      <div className="relative mb-3">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) setSelected(null);
          }}
          placeholder="Search ticker..."
          className="pl-9 glass border-glass-border/50 rounded-xl text-sm"
        />
      </div>

      {/* Search results dropdown */}
      {showResults && (
        <div className="glass rounded-xl mb-3 max-h-40 overflow-y-auto divide-y divide-border">
          {stockResults?.slice(0, 4).map((r) => (
            <button
              key={r.symbol}
              className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-accent/40 transition-colors"
              onClick={() => {
                setSelected({ symbol: r.symbol, name: r.shortname, type: "stock" });
                setQuery(r.symbol);
              }}
            >
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold">
                {r.symbol.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{r.symbol}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.shortname}</p>
              </div>
              <span className="text-[9px] text-muted-foreground uppercase">Stock</span>
            </button>
          ))}
          {cryptoResults?.slice(0, 4).map((r) => (
            <button
              key={r.id}
              className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-accent/40 transition-colors"
              onClick={() => {
                setSelected({ symbol: r.symbol, name: r.name, type: "crypto", thumb: r.thumb });
                setQuery(r.symbol.toUpperCase());
              }}
            >
              {r.thumb ? (
                <img src={r.thumb} alt={r.symbol} className="w-6 h-6 rounded-full bg-secondary" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold">
                  {r.symbol.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{r.symbol.toUpperCase()}</p>
                <p className="text-[10px] text-muted-foreground truncate">{r.name}</p>
              </div>
              <span className="text-[9px] text-muted-foreground uppercase">Crypto</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected ticker display */}
      <div className="glass rounded-xl p-3 mb-4">
        {selected ? (
          <div className="flex items-center gap-2">
            {selected.thumb ? (
              <img src={selected.thumb} alt={selected.symbol} className="w-8 h-8 rounded-full bg-secondary" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                {selected.symbol.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{selected.symbol.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground">{selected.name}</p>
            </div>
            <span className="ml-auto text-[9px] text-muted-foreground uppercase">{selected.type}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-1">Select a ticker to track</p>
        )}
      </div>

      {/* Alert type selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setAlertType("price")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            alertType === "price"
              ? "bg-primary text-primary-foreground"
              : "glass text-muted-foreground"
          }`}
        >
          Price Threshold
        </button>
        <button
          onClick={() => setAlertType("percentage")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            alertType === "percentage"
              ? "bg-primary text-primary-foreground"
              : "glass text-muted-foreground"
          }`}
        >
          % Change
        </button>
      </div>

      {/* Alert options */}
      {alertType === "price" ? (
        <div className="mb-5">
          <label className="text-xs text-muted-foreground mb-1.5 block">Price to trigger alert</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={priceValue}
            onChange={(e) => setPriceValue(e.target.value)}
            placeholder="e.g. 150.00"
            className="glass border-glass-border/50 rounded-xl text-sm"
          />
        </div>
      ) : (
        <div className="mb-5 flex gap-2">
          <div className="w-28">
            <label className="text-xs text-muted-foreground mb-1.5 block">Direction</label>
            <button
              onClick={() => setDirection((d) => (d === "increase" ? "decrease" : "increase"))}
              className="w-full glass border-glass-border/50 rounded-xl h-10 px-3 flex items-center justify-between text-sm text-foreground"
            >
              {direction === "increase" ? "+" : "−"}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1.5 block">Change %</label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={percentValue}
              onChange={(e) => setPercentValue(e.target.value)}
              placeholder="e.g. 5"
              className="glass border-glass-border/50 rounded-xl text-sm"
            />
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full py-3.5 rounded-2xl font-semibold text-sm bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
      >
        Save Alert
      </button>
    </>
  );
}
