import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";
import { X, Loader2 } from "lucide-react";
import { useChartData } from "@/hooks/useChartData";

interface Props {
  symbol: string;
  name: string;
  showVolume?: boolean;
  onClose: () => void;
}

const INTERVALS: { label: string; interval: string; range: string }[] = [
  { label: "1m", interval: "1m", range: "1d" },
  { label: "5m", interval: "5m", range: "5d" },
  { label: "15m", interval: "15m", range: "5d" },
  { label: "30m", interval: "30m", range: "1mo" },
  { label: "1h", interval: "60m", range: "1mo" },
  { label: "4h", interval: "60m", range: "3mo" },
  { label: "1D", interval: "1d", range: "1y" },
  { label: "1W", interval: "1wk", range: "1y" },
  { label: "1M", interval: "1mo", range: "1y" },
];

export function TickerChartFullscreen({ symbol, name, showVolume = true, onClose }: Props) {
  const [selected, setSelected] = useState(6); // 1D default
  const cfg = INTERVALS[selected];
  const { data, isLoading } = useChartData(symbol, cfg.interval, cfg.range);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [hover, setHover] = useState<{ o: number; h: number; l: number; c: number } | null>(null);

  // Build chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "hsl(var(--muted-foreground))",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: "hsl(var(--border) / 0.3)" },
        horzLines: { color: "hsl(var(--border) / 0.3)" },
      },
      rightPriceScale: { borderColor: "hsl(var(--border) / 0.5)" },
      timeScale: { borderColor: "hsl(var(--border) / 0.5)", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: false },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: { touch: true, mouse: true },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: "hsl(142 76% 45%)",
      downColor: "hsl(0 84% 60%)",
      borderUpColor: "hsl(142 76% 45%)",
      borderDownColor: "hsl(0 84% 60%)",
      wickUpColor: "hsl(142 76% 45%)",
      wickDownColor: "hsl(0 84% 60%)",
    });
    candleRef.current = candle;

    if (showVolume) {
      const vol = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
        color: "hsl(var(--muted-foreground) / 0.4)",
      });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volumeRef.current = vol;
    }

    chart.subscribeCrosshairMove((p) => {
      if (!p.time || !candleRef.current) {
        setHover(null);
        return;
      }
      const d: any = p.seriesData.get(candleRef.current);
      if (d) setHover({ o: d.open, h: d.high, l: d.low, c: d.close });
      else setHover(null);
    });

    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [showVolume]);

  // Update data
  useEffect(() => {
    if (!data || !candleRef.current) return;
    const candles: { time: Time; open: number; high: number; low: number; close: number }[] = [];
    const volumes: { time: Time; value: number; color: string }[] = [];
    let isHourlyAggregate = cfg.label === "4h";
    const buckets: Map<number, { time: number; o: number; h: number; l: number; c: number; v: number }> = new Map();

    for (let i = 0; i < data.timestamp.length; i++) {
      const t = data.timestamp[i];
      const o = data.open[i], h = data.high[i], l = data.low[i], c = data.close[i], v = data.volume[i] ?? 0;
      if (o == null || h == null || l == null || c == null) continue;

      if (isHourlyAggregate) {
        // bucket every 4 hours
        const bucketTime = Math.floor(t / (4 * 3600)) * 4 * 3600;
        const b = buckets.get(bucketTime);
        if (!b) {
          buckets.set(bucketTime, { time: bucketTime, o, h, l, c, v });
        } else {
          b.h = Math.max(b.h, h);
          b.l = Math.min(b.l, l);
          b.c = c;
          b.v += v;
        }
      } else {
        candles.push({ time: t as Time, open: o, high: h, low: l, close: c });
        if (showVolume && v) {
          volumes.push({ time: t as Time, value: v, color: c >= o ? "hsl(142 76% 45% / 0.4)" : "hsl(0 84% 60% / 0.4)" });
        }
      }
    }

    if (isHourlyAggregate) {
      const sorted = Array.from(buckets.values()).sort((a, b) => a.time - b.time);
      for (const b of sorted) {
        candles.push({ time: b.time as Time, open: b.o, high: b.h, low: b.l, close: b.c });
        if (showVolume && b.v) {
          volumes.push({ time: b.time as Time, value: b.v, color: b.c >= b.o ? "hsl(142 76% 45% / 0.4)" : "hsl(0 84% 60% / 0.4)" });
        }
      }
    }

    candleRef.current.setData(candles);
    if (volumeRef.current) volumeRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [data, cfg.label, showVolume]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground truncate">{symbol.toUpperCase()}</h2>
          <p className="text-xs text-muted-foreground truncate">{name}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <X className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Interval chips */}
      <div className="px-4 py-2 border-b border-border/30 overflow-x-auto">
        <div className="flex gap-2 w-max">
          {INTERVALS.map((iv, idx) => (
            <button
              key={iv.label}
              onClick={() => setSelected(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                idx === selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      {/* OHLC hover */}
      {hover && (
        <div className="px-4 py-1.5 text-[11px] font-mono text-muted-foreground flex gap-3 border-b border-border/20">
          <span>O <span className="text-foreground">{hover.o.toFixed(4)}</span></span>
          <span>H <span className="text-gain">{hover.h.toFixed(4)}</span></span>
          <span>L <span className="text-loss">{hover.l.toFixed(4)}</span></span>
          <span>C <span className="text-foreground">{hover.c.toFixed(4)}</span></span>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>,
    document.body
  );
}