import { useState, useEffect, useMemo } from "react";
import { usePopularStocks } from "@/hooks/useStockData";
import { useTopCryptos } from "@/hooks/useCryptoData";

interface SectorData {
  name: string;
  change: number;
  tickers: { symbol: string; name: string; change: number }[];
}

const SECTOR_MAP: Record<string, string> = {
  // Tech
  AAPL: "Tech", MSFT: "Tech", GOOGL: "Tech", META: "Tech", NVDA: "Tech",
  INTC: "Tech", CSCO: "Tech", ADBE: "Tech", CRM: "Tech", AVGO: "Tech",
  TXN: "Tech", QCOM: "Tech", ACN: "Tech", AMD: "Tech", MU: "Tech",
  ANET: "Tech", NOW: "Tech", PANW: "Tech", SNPS: "Tech", CDNS: "Tech",
  // Consumer
  AMZN: "Consumer", NFLX: "Consumer", TSLA: "Consumer", COST: "Consumer",
  NKE: "Consumer", MCD: "Consumer", HD: "Consumer", LOW: "Consumer",
  WMT: "Consumer", DIS: "Consumer", PG: "Consumer", KO: "Consumer",
  PEP: "Consumer", TGT: "Consumer", SBUX: "Consumer", LULU: "Consumer",
  BKNG: "Consumer", ABNB: "Consumer", UBER: "Consumer",
  // Finance
  JPM: "Finance", V: "Finance", MA: "Finance", BAC: "Finance",
  GS: "Finance", MS: "Finance", PYPL: "Finance", AXP: "Finance",
  BLK: "Finance", SCHW: "Finance", C: "Finance", WFC: "Finance", USB: "Finance",
  // Healthcare
  JNJ: "Healthcare", UNH: "Healthcare", PFE: "Healthcare", ABT: "Healthcare",
  MRK: "Healthcare", LLY: "Healthcare", ABBV: "Healthcare", TMO: "Healthcare",
  MDT: "Healthcare", DHR: "Healthcare", AMGN: "Healthcare", GILD: "Healthcare",
  BMY: "Healthcare", ISRG: "Healthcare", REGN: "Healthcare", VRTX: "Healthcare",
  // Energy
  XOM: "Energy", CVX: "Energy", NEE: "Energy", COP: "Energy", SLB: "Energy",
  EOG: "Energy", OXY: "Energy", MPC: "Energy", PSX: "Energy", VLO: "Energy",
  // Industrial
  UPS: "Industrial", LIN: "Industrial", CAT: "Industrial", DE: "Industrial",
  HON: "Industrial", GE: "Industrial", RTX: "Industrial", BA: "Industrial",
  LMT: "Industrial", MMM: "Industrial", FDX: "Industrial",
  // Telecom
  VZ: "Telecom", CMCSA: "Telecom", T: "Telecom", TMUS: "Telecom", CHTR: "Telecom",
};

function getSectorColor(change: number): string {
  if (change > 3) return "hsl(142, 76%, 36%)";
  if (change > 1.5) return "hsl(142, 60%, 45%)";
  if (change > 0.5) return "hsl(142, 40%, 52%)";
  if (change > 0) return "hsl(142, 30%, 58%)";
  if (change > -0.5) return "hsl(0, 30%, 58%)";
  if (change > -1.5) return "hsl(0, 40%, 52%)";
  if (change > -3) return "hsl(0, 60%, 45%)";
  return "hsl(0, 76%, 36%)";
}

function SectorBlock({ sector, maxSize }: { sector: SectorData; maxSize: number }) {
  const [hovered, setHovered] = useState(false);
  const sizeRatio = Math.max(0.3, sector.tickers.length / maxSize);
  const bgColor = getSectorColor(sector.change);

  return (
    <div
      className="relative rounded-xl overflow-hidden transition-all duration-500 cursor-pointer"
      style={{
        backgroundColor: bgColor,
        flex: `${sizeRatio} 1 0%`,
        minHeight: "120px",
        opacity: hovered ? 1 : 0.9,
        transform: hovered ? "scale(1.02)" : "scale(1)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      <div className="relative p-3 h-full flex flex-col justify-between">
        <div>
          <h3 className="text-white font-bold text-lg drop-shadow-md">{sector.name}</h3>
          <span className="text-white/90 text-sm font-semibold drop-shadow">
            {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%
          </span>
        </div>
        {hovered && (
          <div className="mt-2 space-y-0.5 animate-fade-in">
            {sector.tickers.slice(0, 5).map((t) => (
              <div key={t.symbol} className="flex justify-between text-xs text-white/80">
                <span className="font-medium">{t.symbol}</span>
                <span>{t.change >= 0 ? "+" : ""}{t.change.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FlowArrow({ from, to, strength }: { from: string; to: string; strength: number }) {
  const opacity = Math.min(1, Math.abs(strength) / 4);
  const color = strength > 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))";

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg glass text-xs">
      <span className="text-muted-foreground font-medium">{from}</span>
      <span style={{ color, opacity: opacity + 0.3 }} className="font-bold">
        {strength > 0 ? "→" : "←"}
      </span>
      <span className="text-muted-foreground font-medium">{to}</span>
      <span className="text-[10px] ml-1" style={{ color }}>
        {Math.abs(strength).toFixed(1)}%
      </span>
    </div>
  );
}

export default function MarketMapPage() {
  const { data: stocks } = usePopularStocks();
  const { data: cryptos } = useTopCryptos();
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => p + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const sectors = useMemo(() => {
    if (!stocks) return [];
    const map: Record<string, SectorData> = {};

    stocks.forEach((s) => {
      const sectorName = SECTOR_MAP[s.symbol] || "Other";
      if (!map[sectorName]) map[sectorName] = { name: sectorName, change: 0, tickers: [] };
      map[sectorName].tickers.push({
        symbol: s.symbol,
        name: s.shortName,
        change: s.regularMarketChangePercent,
      });
    });

    Object.values(map).forEach((sector) => {
      sector.change =
        sector.tickers.reduce((sum, t) => sum + t.change, 0) / sector.tickers.length;
    });

    return Object.values(map).sort((a, b) => b.tickers.length - a.tickers.length);
  }, [stocks]);

  const cryptoSector = useMemo(() => {
    if (!cryptos || cryptos.length === 0) return null;
    const tickers = cryptos.slice(0, 10).map((c) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      change: c.price_change_percentage_24h || 0,
    }));
    return {
      name: "Crypto",
      change: tickers.reduce((s, t) => s + t.change, 0) / tickers.length,
      tickers,
    };
  }, [cryptos]);

  const allSectors = useMemo(() => {
    const s = [...sectors];
    if (cryptoSector) s.push(cryptoSector);
    return s;
  }, [sectors, cryptoSector]);

  const flows = useMemo(() => {
    if (allSectors.length < 2) return [];
    const sorted = [...allSectors].sort((a, b) => b.change - a.change);
    const results: { from: string; to: string; strength: number }[] = [];

    if (sorted.length >= 2) {
      results.push({
        from: sorted[sorted.length - 1].name,
        to: sorted[0].name,
        strength: sorted[0].change - sorted[sorted.length - 1].change,
      });
    }
    if (sorted.length >= 4) {
      results.push({
        from: sorted[sorted.length - 2].name,
        to: sorted[1].name,
        strength: sorted[1].change - sorted[sorted.length - 2].change,
      });
    }

    return results;
  }, [allSectors, pulse]);

  const maxSize = Math.max(...allSectors.map((s) => s.tickers.length), 1);

  return (
    <div className="min-h-screen bg-background pb-24 pt-4 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Market Map</h1>
          <p className="text-sm text-muted-foreground">Live sector heat flow</p>
        </div>

        {/* Flow indicators */}
        {flows.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-muted-foreground font-medium self-center">Flow:</span>
            {flows.map((f, i) => (
              <FlowArrow key={i} from={f.from} to={f.to} strength={f.strength} />
            ))}
          </div>
        )}

        {/* Heat map grid */}
        {allSectors.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Top row — largest sectors */}
            <div className="flex gap-3" style={{ minHeight: "140px" }}>
              {allSectors.slice(0, 2).map((s) => (
                <SectorBlock key={s.name} sector={s} maxSize={maxSize} />
              ))}
            </div>
            {/* Middle row */}
            {allSectors.length > 2 && (
              <div className="flex gap-3" style={{ minHeight: "120px" }}>
                {allSectors.slice(2, 5).map((s) => (
                  <SectorBlock key={s.name} sector={s} maxSize={maxSize} />
                ))}
              </div>
            )}
            {/* Bottom row */}
            {allSectors.length > 5 && (
              <div className="flex gap-3" style={{ minHeight: "100px" }}>
                {allSectors.slice(5).map((s) => (
                  <SectorBlock key={s.name} sector={s} maxSize={maxSize} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Legend</p>
          <div className="flex items-center gap-1">
            <div className="h-3 flex-1 rounded" style={{ background: "linear-gradient(to right, hsl(0,76%,36%), hsl(0,30%,58%), hsl(0,0%,70%), hsl(142,30%,58%), hsl(142,76%,36%))" }} />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
        </div>
      </div>
    </div>
  );
}
