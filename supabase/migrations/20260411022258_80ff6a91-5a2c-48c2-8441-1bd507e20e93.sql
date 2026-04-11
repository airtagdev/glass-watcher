
-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Price alerts table
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  ticker_symbol TEXT NOT NULL,
  ticker_name TEXT NOT NULL,
  ticker_type TEXT NOT NULL CHECK (ticker_type IN ('stock', 'crypto')),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price', 'percentage')),
  value NUMERIC NOT NULL,
  direction TEXT CHECK (direction IN ('increase', 'decrease')),
  triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read their own alerts by device_id"
  ON public.price_alerts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own alerts"
  ON public.price_alerts FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete their own alerts"
  ON public.price_alerts FOR DELETE
  USING (true);

-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (true);

-- Index for faster alert lookups
CREATE INDEX idx_price_alerts_device ON public.price_alerts (device_id);
CREATE INDEX idx_price_alerts_untriggered ON public.price_alerts (triggered) WHERE triggered = false;
