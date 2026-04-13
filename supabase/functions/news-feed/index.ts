const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CRYPTO_NEWS_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=popular";
const STOCK_NEWS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,MSFT,GOOGL,AMZN,TSLA,NVDA,META&region=US&lang=en-US";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category: "crypto" | "stocks";
  body?: string;
}

async function fetchCryptoNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(CRYPTO_NEWS_URL);
    if (!res.ok) return [];
    const data = await res.json();
    const articles = data?.Data || [];
    return articles.slice(0, 20).map((a: any) => ({
      id: `crypto-${a.id}`,
      title: a.title,
      source: a.source,
      url: a.url,
      imageUrl: a.imageurl,
      publishedAt: new Date(a.published_on * 1000).toISOString(),
      category: "crypto" as const,
      body: a.body?.slice(0, 200),
    }));
  } catch {
    return [];
  }
}

async function fetchStockNews(): Promise<NewsItem[]> {
  try {
    // Use Yahoo Finance RSS
    const res = await fetch(STOCK_NEWS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    // Simple XML parsing for RSS items
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let idx = 0;
    while ((match = itemRegex.exec(xml)) !== null && idx < 20) {
      const itemXml = match[1];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] 
        || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || "";
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const description = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
        || itemXml.match(/<description>(.*?)<\/description>/)?.[1] || "";

      if (title && link) {
        items.push({
          id: `stock-${idx}`,
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          source: "Yahoo Finance",
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          category: "stocks",
          body: description.replace(/<[^>]*>/g, "").slice(0, 200),
        });
        idx++;
      }
    }
    return items;
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") || "all";

    let news: NewsItem[] = [];

    if (category === "crypto") {
      news = await fetchCryptoNews();
    } else if (category === "stocks") {
      news = await fetchStockNews();
    } else {
      const [crypto, stocks] = await Promise.all([fetchCryptoNews(), fetchStockNews()]);
      // Interleave and sort by date
      news = [...crypto, ...stocks].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    return new Response(JSON.stringify(news), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("News fetch error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch news" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
