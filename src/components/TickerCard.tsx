import { Plus, Check } from "lucide-react";
import { formatCurrency, formatPercent, formatLargeNumber } from "@/lib/format";

interface TickerCardProps {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  imageUrl?: string;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClick: () => void;
}

export function TickerCard({
  symbol,
  name,
  price,
  changePercent,
  change,
  imageUrl,
  isWatched,
  onToggleWatch,
  onClick,
}: TickerCardProps) {
  const isPositive = changePercent >= 0;

  return (
    <div
      className="glass-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform duration-150 animate-fade-in"
      onClick={onClick}
    >
      {imageUrl && (
        <img src={imageUrl} alt={symbol} className="w-9 h-9 rounded-full bg-secondary" />
      )}
      {!imageUrl && (
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
          {symbol.slice(0, 2)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{symbol.toUpperCase()}</p>
        <p className="text-xs text-muted-foreground truncate">{name}</p>
      </div>
      <div className="text-right mr-2">
        <p className="text-sm font-semibold text-foreground">{formatCurrency(price)}</p>
        <p className={`text-xs font-medium ${isPositive ? "text-gain" : "text-loss"}`}>
          {isPositive ? "+" : ""}
          {formatPercent(changePercent)}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatch();
        }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          isWatched
            ? "bg-primary/20 text-primary"
            : "bg-secondary text-muted-foreground hover:text-foreground"
        }`}
      >
        {isWatched ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  );
}
