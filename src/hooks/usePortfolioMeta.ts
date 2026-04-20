import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PortfolioCategory {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
}

export interface HoldingMeta {
  tickerId: string;
  categoryId: string | null;
  sortOrder: number;
}

const CAT_KEY = "ticker-portfolio-categories";
const META_KEY = "ticker-portfolio-meta";

function loadLocal<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function usePortfolioMeta() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<PortfolioCategory[]>(() =>
    loadLocal<PortfolioCategory>(CAT_KEY)
  );
  const [meta, setMeta] = useState<HoldingMeta[]>(() => loadLocal<HoldingMeta>(META_KEY));

  useEffect(() => {
    localStorage.setItem(CAT_KEY, JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [meta]);

  // Cloud sync
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const [{ data: cats }, { data: m }] = await Promise.all([
        supabase
          .from("portfolio_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("sort_order"),
        supabase.from("portfolio_holdings_meta").select("*").eq("user_id", user.id),
      ]);
      if (!active) return;
      if (cats)
        setCategories(
          cats.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            sortOrder: c.sort_order,
          }))
        );
      if (m)
        setMeta(
          m.map((x: any) => ({
            tickerId: x.ticker_id,
            categoryId: x.category_id,
            sortOrder: x.sort_order,
          }))
        );
    };
    load();

    const channel = supabase
      .channel(`portfolio_meta:${user.id}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolio_categories", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "portfolio_holdings_meta", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addCategory = useCallback(
    (name: string, color: string | null = null) => {
      const id = crypto.randomUUID();
      const sortOrder = categories.length;
      const cat: PortfolioCategory = { id, name, color, sortOrder };
      setCategories((prev) => [...prev, cat]);
      if (user) {
        supabase
          .from("portfolio_categories")
          .insert({ id, user_id: user.id, name, color, sort_order: sortOrder })
          .then();
      }
      return id;
    },
    [categories.length, user]
  );

  const renameCategory = useCallback(
    (id: string, name: string) => {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
      if (user) supabase.from("portfolio_categories").update({ name }).eq("id", id).then();
    },
    [user]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setMeta((prev) => prev.map((m) => (m.categoryId === id ? { ...m, categoryId: null } : m)));
      if (user) {
        supabase.from("portfolio_categories").delete().eq("id", id).then();
      }
    },
    [user]
  );

  const setHoldingCategory = useCallback(
    (tickerId: string, categoryId: string | null) => {
      setMeta((prev) => {
        const existing = prev.find((m) => m.tickerId === tickerId);
        if (existing) {
          return prev.map((m) => (m.tickerId === tickerId ? { ...m, categoryId } : m));
        }
        return [...prev, { tickerId, categoryId, sortOrder: prev.length }];
      });
      if (user) {
        supabase
          .from("portfolio_holdings_meta")
          .upsert(
            { user_id: user.id, ticker_id: tickerId, category_id: categoryId },
            { onConflict: "user_id,ticker_id" }
          )
          .then();
      }
    },
    [user]
  );

  const setHoldingsOrder = useCallback(
    (orderedTickerIds: string[]) => {
      setMeta((prev) => {
        const map = new Map(prev.map((m) => [m.tickerId, m]));
        orderedTickerIds.forEach((tid, idx) => {
          const existing = map.get(tid);
          if (existing) map.set(tid, { ...existing, sortOrder: idx });
          else map.set(tid, { tickerId: tid, categoryId: null, sortOrder: idx });
        });
        return Array.from(map.values());
      });
      if (user) {
        const rows = orderedTickerIds.map((tid, idx) => ({
          user_id: user.id,
          ticker_id: tid,
          sort_order: idx,
        }));
        supabase
          .from("portfolio_holdings_meta")
          .upsert(rows, { onConflict: "user_id,ticker_id" })
          .then();
      }
    },
    [user]
  );

  const getHoldingMeta = useCallback(
    (tickerId: string): HoldingMeta => {
      return (
        meta.find((m) => m.tickerId === tickerId) ?? {
          tickerId,
          categoryId: null,
          sortOrder: 9999,
        }
      );
    },
    [meta]
  );

  return {
    categories,
    meta,
    addCategory,
    renameCategory,
    deleteCategory,
    setHoldingCategory,
    setHoldingsOrder,
    getHoldingMeta,
  };
}
