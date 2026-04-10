import { X, Plus, Check, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatLargeNumber, formatPercent, formatVolume } from "@/lib/format";

interface TickerDetailProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high52w?: number;
  low52w?: number;
  marketCap?: number;
  volume?: number;
  dayHigh?: number;
  dayLow?: number;
  imageUrl?: string;
  isWatched: boolean;
  onToggleWatch: () => void;
  onClose: () => void;
}

export function TickerDetail({
  symbol,
  name,
  price,
  change,
  changePercent,
  high52w,
  low52w,
  marketCap,
  volume,
  dayHigh,
  dayLow,
  imageUrl,
  isWatched,
  onToggleWatch,
  onClose,
}: TickerDetailProps) {
  const isPositive = changePercent >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg glass-card rounded-t-3xl p-6 pb-8 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <img src={imageUrl} alt={symbol} className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
                {symbol.slice(0, 2)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-foreground">{symbol.toUpperCase()}</h2>
              <p className="text-sm text-muted-foreground">{name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-3xl font-bold text-foreground">{formatCurrency(price)}</p>
          <div className={`flex items-center gap-2 mt-1 ${isPositive ? "text-gain" : "text-loss"}`}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-sm font-semibold">
              {isPositive ? "+" : ""}{formatCurrency(Math.abs(change))} ({formatPercent(changePercent)})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {high52w != null && (
            <StatItem label="52W High" value={formatCurrency(high52w)} />
          )}
          {low52w != null && (
            <StatItem label="52W Low" value={formatCurrency(low52w)} />
          )}
          {dayHigh != null && (
            <StatItem label="Day High" value={formatCurrency(dayHigh)} />
          )}
          {dayLow != null && (
            <StatItem label="Day Low" value={formatCurrency(dayLow)} />
          )}
          {marketCap != null && marketCap > 0 && (
            <StatItem label="Market Cap" value={formatLargeNumber(marketCap)} />
          )}
          {volume != null && volume > 0 && (
            <StatItem label="Volume" value={formatVolume(volume)} />
          )}
        </div>

        <button
          onClick={onToggleWatch}
          className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
            isWatched
              ? "bg-loss/20 text-loss"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {isWatched ? (
            <>
              <Check className="w-4 h-4" /> Remove from Watchlist
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Add to Watchlist
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass p-3 rounded-xl">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}
