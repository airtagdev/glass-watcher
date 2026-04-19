import { Plus, Check, Pin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";
import { computeConfidence } from "@/lib/confidenceScore";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { useSettings } from "@/hooks/useSettings";

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
  isPinned?: boolean;
  onTogglePin?: () => void;
  canPin?: boolean;
  dayHigh?: number;
  dayLow?: number;
  high52w?: number;
  low52w?: number;
  index?: number;
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
  isPinned,
  onTogglePin,
  canPin,
  dayHigh,
  dayLow,
  high52w,
  low52w,
  index = 0,
}: TickerCardProps) {
  const isPositive = changePercent >= 0;
  const confidence = computeConfidence({ changePercent, dayHigh, dayLow, high52w, low52w, price });
  const { settings } = useSettings();

  // Price flash on update
  const prevPrice = useRef(price);
  const [flash, setFlash] = useState<"gain" | "loss" | null>(null);
  useEffect(() => {
    if (prevPrice.current !== price && prevPrice.current !== 0) {
      setFlash(price > prevPrice.current ? "gain" : "loss");
      const t = setTimeout(() => setFlash(null), 800);
      prevPrice.current = price;
      return () => clearTimeout(t);
    }
    prevPrice.current = price;
  }, [price]);

  return (
    <div
      className="glass-card p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform duration-150 animate-fade-in hover:border-primary/30"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: "both" }}
      onClick={onClick}
    >
      {imageUrl && (
        <img src={imageUrl} alt={symbol} className="w-9 h-9 rounded-full bg-secondary shadow-md ring-1 ring-glass-border/40" />
      )}
      {!imageUrl && (
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground ring-1 ring-glass-border/40">
          {symbol.slice(0, 2)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground truncate tracking-wide">{symbol.toUpperCase()}</p>
          {isPinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate">{name}</p>
        {settings.showConfidenceScore && <ConfidenceBadge confidence={confidence} compact />}
      </div>
      <div className="text-right mr-2">
        <p
          className={`text-sm font-semibold text-foreground tabular tracking-tight rounded px-1 ${
            flash === "gain" ? "animate-flash-gain" : flash === "loss" ? "animate-flash-loss" : ""
          }`}
        >
          {formatCurrency(price)}
        </p>
        <p className={`text-xs font-medium tabular ${isPositive ? "text-gain" : "text-loss"}`}>
          {isPositive ? "+" : ""}
          {formatPercent(changePercent)}
        </p>
      </div>
      {isWatched && onTogglePin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={isPinned ? "Unpin" : canPin ? "Pin to top" : "Max 5 pins reached"}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:animate-scale-press ${
            isPinned
              ? "bg-primary/20 text-primary"
              : canPin
              ? "bg-secondary text-muted-foreground hover:text-foreground"
              : "bg-secondary text-muted-foreground/40 cursor-not-allowed"
          }`}
          disabled={!isPinned && !canPin}
        >
          <Pin className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleWatch();
        }}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:animate-scale-press ${
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
