import { useState } from "react";
import { useNews, NewsItem } from "@/hooks/useNews";
import { Newspaper, ExternalLink, Clock, TrendingUp, Bitcoin, Filter } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type Category = "all" | "crypto" | "stocks";

export default function NewsPage() {
  const [category, setCategory] = useState<Category>("all");
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const { data: news, isLoading } = useNews(category);

  const categories: { value: Category; label: string; icon: typeof Newspaper }[] = [
    { value: "all", label: "All", icon: Newspaper },
    { value: "stocks", label: "Stocks", icon: TrendingUp },
    { value: "crypto", label: "Crypto", icon: Bitcoin },
  ];

  return (
    <PullToRefresh>
    <div className="px-4 pt-14 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">News</h1>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-5">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              category === c.value
                ? "bg-primary text-primary-foreground"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            <c.icon className="w-3.5 h-3.5" />
            {c.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-20 h-16 rounded-lg bg-secondary shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-3/4 bg-secondary rounded mb-2" />
                  <div className="h-3 w-1/2 bg-secondary rounded mb-3" />
                  <div className="h-2 w-1/4 bg-secondary rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!news || news.length === 0) && (
        <div className="text-center py-20">
          <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">No news available right now</p>
        </div>
      )}

      {news && news.length > 0 && (
        <div className="flex flex-col gap-3">
          {news.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedArticle(item)}
              className="glass-card p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex gap-3">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-20 h-16 rounded-lg object-cover bg-secondary shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-1.5">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                      item.category === "crypto"
                        ? "bg-primary/15 text-primary"
                        : "bg-gain/15 text-gain"
                    }`}>
                      {item.category === "crypto" ? "Crypto" : "Stocks"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.source}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {timeAgo(item.publishedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Article viewer modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-foreground leading-snug">{selectedArticle.title}</h2>
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0"
              >
                ✕
              </button>
            </div>

            {selectedArticle.imageUrl && (
              <img
                src={selectedArticle.imageUrl}
                alt=""
                className="w-full h-48 object-cover rounded-xl mb-4 bg-secondary"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                selectedArticle.category === "crypto"
                  ? "bg-primary/15 text-primary"
                  : "bg-gain/15 text-gain"
              }`}>
                {selectedArticle.category === "crypto" ? "Crypto" : "Stocks"}
              </span>
              <span className="text-xs text-muted-foreground">{selectedArticle.source}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(selectedArticle.publishedAt)}</span>
            </div>

            {selectedArticle.body && (
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {selectedArticle.body}...
              </p>
            )}

            <a
              href={selectedArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Read Full Article
            </a>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
