-- Categories created by users to group portfolio holdings
CREATE TABLE public.portfolio_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own categories"
  ON public.portfolio_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.portfolio_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.portfolio_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.portfolio_categories FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolio_categories_updated_at
  BEFORE UPDATE ON public.portfolio_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Per-holding metadata (category assignment + custom sort order)
CREATE TABLE public.portfolio_holdings_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker_id TEXT NOT NULL,
  category_id UUID REFERENCES public.portfolio_categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, ticker_id)
);

ALTER TABLE public.portfolio_holdings_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own holdings meta"
  ON public.portfolio_holdings_meta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings meta"
  ON public.portfolio_holdings_meta FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings meta"
  ON public.portfolio_holdings_meta FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings meta"
  ON public.portfolio_holdings_meta FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolio_holdings_meta_updated_at
  BEFORE UPDATE ON public.portfolio_holdings_meta
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_portfolio_holdings_meta_user ON public.portfolio_holdings_meta(user_id);
CREATE INDEX idx_portfolio_categories_user ON public.portfolio_categories(user_id);