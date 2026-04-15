import { useState, useRef } from "react";
import { X, Plus, Check, TrendingUp, TrendingDown, Sparkles, Send, Loader2 } from "lucide-react";
import { formatCurrency, formatLargeNumber, formatPercent, formatVolume } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { computeConfidence } from "@/lib/confidenceScore";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { useStockDetail } from "@/hooks/useStockData";
import { useSettings } from "@/hooks/useSettings";

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
  trailingPE?: number | null;
  tickerType?: "stock" | "crypto";
  isWatched: boolean;
  onToggleWatch: () => void;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ticker-ai`;

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
  trailingPE,
  tickerType,
  isWatched,
  onToggleWatch,
  onClose,
}: TickerDetailProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  const confidence = computeConfidence({ changePercent, dayHigh, dayLow, high52w, low52w, price });
  const shouldFetchStockDetail = tickerType === "stock" && (trailingPE == null || trailingPE <= 0);
  const { data: stockDetailData } = useStockDetail(shouldFetchStockDetail ? symbol : "");
  const resolvedTrailingPE = tickerType === "stock" ? trailingPE ?? stockDetailData?.trailingPE ?? null : null;
  const { settings } = useSettings();
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const askAI = async () => {
    if (!aiQuery.trim() || aiLoading) return;
    setAiLoading(true);
    setAiResponse("");
    abortRef.current = new AbortController();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ message: aiQuery, symbol, name }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        setAiResponse(err.error || "Something went wrong");
        setAiLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setAiResponse(full);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setAiResponse("Failed to get AI response");
      }
    }
    setAiLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 glass-card rounded-3xl p-6 animate-fade-in max-h-[85vh] overflow-y-auto"
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
              <ConfidenceBadge confidence={confidence} />
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
              {isPositive ? "+" : ""}{formatCurrency(Math.abs(change ?? 0))} ({formatPercent(changePercent)})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {high52w != null && high52w > 0 && (
            <StatItem label="52W High" value={formatCurrency(high52w)} />
          )}
          {low52w != null && low52w > 0 && (
            <StatItem label="52W Low" value={formatCurrency(low52w)} />
          )}
          {dayHigh != null && dayHigh > 0 && (
            <StatItem label="Day High" value={formatCurrency(dayHigh)} />
          )}
          {dayLow != null && dayLow > 0 && (
            <StatItem label="Day Low" value={formatCurrency(dayLow)} />
          )}
          {marketCap != null && marketCap > 0 && (
            <StatItem label="Market Cap" value={formatLargeNumber(marketCap)} />
          )}
          {volume != null && volume > 0 && (
            <StatItem label="Volume" value={formatVolume(volume)} />
          )}
          {resolvedTrailingPE != null && resolvedTrailingPE > 0 && (
            <StatItem label="P/E Ratio" value={resolvedTrailingPE.toFixed(2)} />
          )}
        </div>

        {/* Ask AI */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAI()}
                placeholder="Ask AI about this ticker..."
                className="pl-9 pr-3 glass border-glass-border/50 rounded-xl text-sm"
              />
            </div>
            <button
              onClick={askAI}
              disabled={aiLoading || !aiQuery.trim()}
              className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {aiResponse && (
            <div className="glass rounded-xl p-3 mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {aiResponse}
            </div>
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
