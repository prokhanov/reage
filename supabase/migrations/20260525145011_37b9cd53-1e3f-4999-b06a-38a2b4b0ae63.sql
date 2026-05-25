-- 1. invite_tokens: restrict anon SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view valid invite tokens by email or token" ON public.invite_tokens;
CREATE POLICY "Authenticated users can view valid invite tokens"
ON public.invite_tokens
FOR SELECT
TO authenticated
USING ((used_by IS NULL) AND ((expires_at IS NULL) OR (expires_at > now())));

-- 2. Fix unrestricted INSERT policies on risk_zone_analyses, health_strategy_snapshots, subscription_history
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='risk_zone_analyses') THEN
    EXECUTE 'DROP POLICY IF EXISTS "System insert risk zones" ON public.risk_zone_analyses';
    EXECUTE 'DROP POLICY IF EXISTS "System can insert risk zone analyses" ON public.risk_zone_analyses';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert risk zone analyses" ON public.risk_zone_analyses';
    EXECUTE 'CREATE POLICY "Users insert own risk zones" ON public.risk_zone_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

DROP POLICY IF EXISTS "System insert strategy" ON public.health_strategy_snapshots;
CREATE POLICY "Users insert own strategy"
ON public.health_strategy_snapshots
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "System insert subscription history" ON public.subscription_history';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert subscription history" ON public.subscription_history';
    EXECUTE 'CREATE POLICY "Users insert own subscription history" ON public.subscription_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- 3. Fix staff policies that grant access to anon users (auth.uid() IS NULL bypass)
DROP POLICY IF EXISTS "Staff can view all slots" ON public.availability_slots;
CREATE POLICY "Staff can view all slots"
ON public.availability_slots
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND NOT is_patient(auth.uid()));

DROP POLICY IF EXISTS "Staff can view templates" ON public.availability_templates;
CREATE POLICY "Staff can view templates"
ON public.availability_templates
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND NOT is_patient(auth.uid()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_plans') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view all plans" ON public.subscription_plans';
    EXECUTE 'CREATE POLICY "Staff can view all plans" ON public.subscription_plans FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND NOT is_patient(auth.uid()))';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subscription_pricing') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Staff can view all pricing" ON public.subscription_pricing';
    EXECUTE 'CREATE POLICY "Staff can view all pricing" ON public.subscription_pricing FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND NOT is_patient(auth.uid()))';
  END IF;
END $$;