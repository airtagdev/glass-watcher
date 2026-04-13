import { useQuery } from "@tanstack/react-query";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category: "crypto" | "stocks";
  body?: string;
}

async function fetchNews(category: string): Promise<NewsItem[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/news-feed?category=${category}`;
  const res = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) return [];
  return res.json();
}

export function useNews(category: "all" | "crypto" | "stocks" = "all") {
  return useQuery({
    queryKey: ["news", category],
    queryFn: () => fetchNews(category),
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 5 * 60 * 1000,
  });
}
