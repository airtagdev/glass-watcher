import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchTrailingPE(symbol: string): Promise<number | null> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - 60 * 60 * 24 * 365 * 2;
  const fundamentalsUrl = `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?symbol=${encodeURIComponent(symbol)}&type=trailingPeRatio&period1=${period1}&period2=${period2}`;

  try {
    const res = await fetch(fundamentalsUrl, { headers: YAHOO_HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    const series = data?.timeseries?.result?.[0]?.trailingPeRatio;

    if (!Array.isArray(series)) return null;

    const latestValue = [...series]
      .reverse()
      .find((entry) => typeof entry?.reportedValue?.raw === "number" && Number.isFinite(entry.reportedValue.raw));

    return latestValue?.reportedValue?.raw ?? null;
  } catch {
    return null;
  }
}

async function fetchStockQuote(symbol: string) {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&includePrePost=true`;
    const [quoteRes, trailingPE] = await Promise.all([
      fetch(yahooUrl, { headers: YAHOO_HEADERS }),
      fetchTrailingPE(symbol),
    ]);

    if (!quoteRes.ok) {
      console.error(`Yahoo API error for ${symbol}: ${quoteRes.status} ${await quoteRes.text()}`);
      return null;
    }

    const data = await quoteRes.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    console.log(`[${symbol}] meta keys:`, Object.keys(meta));
    console.log(`[${symbol}] marketState:`, meta.marketState, 'postMarketPrice:', meta.postMarketPrice, 'postMarketSource:', meta.postMarketSource);

    const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
    const price = meta.regularMarketPrice || 0;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    // After-hours / post-market data
    const postMarketPrice = meta.postMarketPrice ?? null;
    const postMarketChange = meta.postMarketChange ?? null;
    const postMarketChangePercent = meta.postMarketChangePercent ?? null;
    const postMarketTime = meta.postMarketTime ?? null;
    const marketState = meta.marketState ?? null;

    return {
      symbol: meta.symbol || symbol,
      shortName: meta.shortName || meta.longName || symbol,
      regularMarketPrice: price,
      regularMarketChange: change,
      regularMarketChangePercent: changePercent,
      regularMarketVolume: meta.regularMarketVolume || 0,
      marketCap: 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      regularMarketDayHigh: meta.regularMarketDayHigh || meta.dayHigh || 0,
      regularMarketDayLow: meta.regularMarketDayLow || meta.dayLow || 0,
      trailingPE,
      postMarketPrice,
      postMarketChange,
      postMarketChangePercent,
      marketState,
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "quotes") {
      const symbols = url.searchParams.get("symbols") || "";
      const symbolList = symbols.split(",").filter(Boolean);

      if (symbolList.length === 0) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const results = (await Promise.all(symbolList.map(fetchStockQuote))).filter(Boolean);

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      const q = url.searchParams.get("q") || "";
      if (!q) {
        return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
      const res = await fetch(yahooUrl, {
        headers: YAHOO_HEADERS,
      });
      const data = await res.json();
      const quotes = (data.quotes || [])
        .filter((item: any) => item.quoteType === "EQUITY")
        .map((item: any) => ({
          symbol: item.symbol,
          shortname: item.shortname || item.longname || item.symbol,
          exchDisp: item.exchDisp || "",
        }));
      return new Response(JSON.stringify(quotes), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});