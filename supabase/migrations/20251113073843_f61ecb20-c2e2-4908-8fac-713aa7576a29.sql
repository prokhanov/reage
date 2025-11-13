-- Allow staff to view all subscription plans (including inactive)
CREATE POLICY "Staff can view all plans"
ON public.subscription_plans
FOR SELECT
USING (NOT is_patient(auth.uid()));

-- Allow staff to view all pricing options (including disabled)
CREATE POLICY "Staff can view all pricing"
ON public.subscription_pricing
FOR SELECT
USING (NOT is_patient(auth.uid()));