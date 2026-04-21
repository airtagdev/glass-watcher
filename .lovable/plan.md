

## Add Candlestick Charts + Forex & Futures

### What you'll get

1. A **"View Chart"** button on the ticker detail card (stocks, crypto, forex, futures) that opens a fullscreen TradingView-style candlestick chart with selectable time intervals.
2. Two new asset categories: **Forex** (e.g., EUR/USD, GBP/USD) and **Futures/Indices** (e.g., ES=F, NQ=F, GC=F, ^GSPC), each with their own page accessible via the More menu.

### Fullscreen chart behavior

- Fullscreen overlay with candlesticks, volume bars below, crosshair, pinch/scroll zoom, pan.
- Interval selector (chip row): `1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M`.
- Range selector adapts to interval (e.g., 1m → 1d, 1h → 1mo, 1D → 1y, max 1y per your spec).
- Close button returns to the ticker detail card.
- Works for stocks, crypto, forex, and futures using the same Yahoo backend.

### How it works (technical)

**Backend — extend `stock-proxy`:**
- New `action=chart` endpoint accepting `symbol`, `interval`, `range`. Calls Yahoo `v8/finance/chart` (already used) and returns `{ timestamp[], open[], high[], low[], close[], volume[] }`.
- New `action=forex` endpoint returning a curated list of pairs (`EURUSD=X`, `GBPUSD=X`, `USDJPY=X`, `AUDUSD=X`, `USDCAD=X`, `USDCHF=X`, `NZDUSD=X`, `EURGBP=X`, `EURJPY=X`, etc.) using the existing quote fetch.
- New `action=futures` endpoint returning curated futures + indices (`ES=F`, `NQ=F`, `YM=F`, `RTY=F`, `CL=F`, `GC=F`, `SI=F`, `NG=F`, `HG=F`, `ZB=F`, `^GSPC`, `^DJI`, `^IXIC`, `^RUT`, `^VIX`, `^FTSE`, `^N225`).

**Frontend:**
- New hook `useChartData(symbol, interval, range)` in `src/hooks/useChartData.ts` — react-query, 30s refetch on intraday intervals.
- New `useForexData.ts` and `useFuturesData.ts` mirroring `useStockData.ts` patterns (popular list + search reused via `stock-proxy` search).
- New component `src/components/TickerChartFullscreen.tsx` — fullscreen modal rendering candlesticks. **Library:** `lightweight-charts` (Trading­View's official, ~45KB, free, performant). Includes interval chip row, volume pane, crosshair, hover tooltip with OHLC.
- Update `src/components/TickerDetail.tsx`: add a "View Chart" button (line/bar-chart icon) next to the AI input area; on click, opens `TickerChartFullscreen`.
- New pages `src/pages/ForexPage.tsx` and `src/pages/FuturesPage.tsx` (clones of `StocksPage.tsx` shape, passing `tickerType="forex"|"futures"` to `TickerDetail`).
- Update `src/App.tsx` with two new routes.
- Update `src/components/BottomNav.tsx` `moreTabs` to include Forex (DollarSign icon) and Futures (LineChart icon).
- Update `TickerDetail` props to accept `tickerType: "stock" | "crypto" | "forex" | "futures"` so the chart endpoint picks the right symbol shape (Yahoo handles all four natively, just pass-through).

### Files

**New:** `src/components/TickerChartFullscreen.tsx`, `src/hooks/useChartData.ts`, `src/hooks/useForexData.ts`, `src/hooks/useFuturesData.ts`, `src/pages/ForexPage.tsx`, `src/pages/FuturesPage.tsx`
**Edited:** `supabase/functions/stock-proxy/index.ts`, `src/components/TickerDetail.tsx`, `src/components/BottomNav.tsx`, `src/App.tsx`, `package.json` (adds `lightweight-charts`)

### Notes

- All data flows through the existing `stock-proxy` edge function — no new API keys needed.
- Forex/futures use Yahoo's `=X` and `=F` symbol conventions; quotes, search, and charts all work via the same endpoint.
- Volume is hidden for forex (Yahoo doesn't return it for FX pairs).

