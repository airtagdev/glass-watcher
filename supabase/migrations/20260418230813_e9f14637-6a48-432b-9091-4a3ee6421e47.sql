-- Tighten price_alerts policies: replace permissive guest policies
DROP POLICY IF EXISTS "Read own alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Insert own alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Update own alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Delete own alerts" ON public.price_alerts;

-- Authenticated users: scope by user_id
CREATE POLICY "Auth users read own alerts"
  ON public.price_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Auth users insert own alerts"
  ON public.price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Auth users update own alerts"
  ON public.price_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Auth users delete own alerts"
  ON public.price_alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Guest (anon) users: only access rows with no user_id (device-scoped on client)
CREATE POLICY "Anon read guest alerts"
  ON public.price_alerts FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Anon insert guest alerts"
  ON public.price_alerts FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anon update guest alerts"
  ON public.price_alerts FOR UPDATE
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Anon delete guest alerts"
  ON public.price_alerts FOR DELETE
  TO anon
  USING (user_id IS NULL);