CREATE POLICY "Superadmins can insert any subscription"
  ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can update any subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can delete any subscription"
  ON public.subscriptions FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));