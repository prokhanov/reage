CREATE TABLE public.one_time_checkups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.energy_orders(id) ON DELETE CASCADE,
  checkup_slug text NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting_call' CHECK (status IN ('waiting_call','no_answer','not_scheduled','scheduled','application_submitted','collected','report_pending','report_ready')),
  labquest_request_number text,
  location_type text NOT NULL DEFAULT 'clinic' CHECK (location_type IN ('clinic','home')),
  lab_location_id uuid REFERENCES public.lab_locations(id) ON DELETE SET NULL,
  location_title text,
  address text,
  appointment_date date,
  appointment_time text,
  internal_comment text,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, checkup_slug)
);
GRANT SELECT ON public.one_time_checkups TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON public.one_time_checkups TO service_role;
ALTER TABLE public.one_time_checkups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can view own one-time checkups"
ON public.one_time_checkups FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Staff can view patient one-time checkups"
ON public.one_time_checkups FOR SELECT TO authenticated
USING (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module));
CREATE POLICY "Staff can update patient one-time checkups"
ON public.one_time_checkups FOR UPDATE TO authenticated
USING (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module))
WITH CHECK (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module));
CREATE INDEX one_time_checkups_user_created_idx ON public.one_time_checkups(user_id, created_at DESC);
CREATE INDEX one_time_checkups_order_idx ON public.one_time_checkups(order_id);
INSERT INTO public.one_time_checkups (
  user_id, order_id, checkup_slug, paid_amount, status, location_type,
  location_title, address, created_at, updated_at
)
SELECT
  eo.user_id,
  eo.id,
  item.slug,
  CASE
    WHEN cardinality(COALESCE(eo.bundles, ARRAY[eo.bundle])) > 0
      THEN round(COALESCE(eo.paid_amount, eo.out_sum) / cardinality(COALESCE(eo.bundles, ARRAY[eo.bundle])), 2)
    ELSE COALESCE(eo.paid_amount, eo.out_sum)
  END,
  'waiting_call',
  CASE WHEN lower(COALESCE(eo.clinic_title, '')) LIKE '%выезд%' OR lower(COALESCE(eo.clinic_title, '')) LIKE '%дом%' THEN 'home' ELSE 'clinic' END,
  eo.clinic_title,
  eo.clinic_address,
  COALESCE(eo.paid_at, eo.created_at),
  now()
FROM public.energy_orders eo
CROSS JOIN LATERAL unnest(COALESCE(eo.bundles, ARRAY[eo.bundle])) AS item(slug)
WHERE eo.status = 'paid' AND eo.user_id IS NOT NULL
ON CONFLICT (order_id, checkup_slug) DO NOTHING;