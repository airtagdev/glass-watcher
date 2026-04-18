-- 1. Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. User watchlist
CREATE TABLE public.user_watchlist (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ticker_id)
);

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlist"
  ON public.user_watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own watchlist"
  ON public.user_watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own watchlist"
  ON public.user_watchlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own watchlist"
  ON public.user_watchlist FOR DELETE USING (auth.uid() = user_id);

-- 3. User portfolio (trades)
CREATE TABLE public.user_portfolio (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker_id TEXT NOT NULL,
  ticker_symbol TEXT NOT NULL,
  ticker_name TEXT NOT NULL,
  ticker_type TEXT NOT NULL,
  trade_type TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  trade_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolio"
  ON public.user_portfolio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own portfolio"
  ON public.user_portfolio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own portfolio"
  ON public.user_portfolio FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own portfolio"
  ON public.user_portfolio FOR DELETE USING (auth.uid() = user_id);

-- 4. User settings
CREATE TABLE public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- 5. User devices
CREATE TABLE public.user_devices (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices"
  ON public.user_devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own devices"
  ON public.user_devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own devices"
  ON public.user_devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own devices"
  ON public.user_devices FOR DELETE USING (auth.uid() = user_id);

-- 6. Add user_id to price_alerts
ALTER TABLE public.price_alerts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Replace permissive policies with user-aware ones
DROP POLICY IF EXISTS "Anyone can read their own alerts by device_id" ON public.price_alerts;
DROP POLICY IF EXISTS "Anyone can insert alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Anyone can update their own alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Anyone can delete their own alerts" ON public.price_alerts;

CREATE POLICY "Read own alerts"
  ON public.price_alerts FOR SELECT
  USING (user_id = auth.uid() OR (user_id IS NULL));

CREATE POLICY "Insert own alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Update own alerts"
  ON public.price_alerts FOR UPDATE
  USING (user_id = auth.uid() OR (user_id IS NULL));

CREATE POLICY "Delete own alerts"
  ON public.price_alerts FOR DELETE
  USING (user_id = auth.uid() OR (user_id IS NULL));

-- 7. Timestamp helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Realtime
ALTER TABLE public.user_watchlist REPLICA IDENTITY FULL;
ALTER TABLE public.user_portfolio REPLICA IDENTITY FULL;
ALTER TABLE public.user_settings REPLICA IDENTITY FULL;
ALTER TABLE public.user_devices REPLICA IDENTITY FULL;
ALTER TABLE public.price_alerts REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_watchlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_portfolio;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices;