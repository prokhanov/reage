CREATE TABLE public.report_checkup_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_checkup_id uuid REFERENCES public.one_time_checkups(id) ON DELETE SET NULL,
  source_checkup_slug text NOT NULL,
  source_paid_amount numeric NOT NULL CHECK (source_paid_amount >= 0),
  advertised_checkup_slug text NOT NULL,
  advertised_checkup_name text NOT NULL,
  advertised_list_price numeric NOT NULL CHECK (advertised_list_price > 0),
  pricing_mode text NOT NULL CHECK (pricing_mode IN ('full_upgrade', 'ten_percent')),
  final_price numeric NOT NULL CHECK (final_price > 0),
  discount_amount numeric NOT NULL CHECK (discount_amount > 0),
  code text NOT NULL UNIQUE,
  display_until timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  is_active boolean NOT NULL DEFAULT true,
  reserved_order_id uuid,
  reserved_until timestamptz,
  used_order_id uuid,
  used_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_checkup_offers TO authenticated;
GRANT ALL ON public.report_checkup_offers TO service_role;
ALTER TABLE public.report_checkup_offers ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX report_checkup_offers_active_unique
  ON public.report_checkup_offers(analysis_id, advertised_checkup_slug)
  WHERE is_active = true AND used_at IS NULL;
CREATE INDEX report_checkup_offers_analysis_idx ON public.report_checkup_offers(analysis_id);
CREATE INDEX report_checkup_offers_user_idx ON public.report_checkup_offers(user_id);
CREATE POLICY "Staff can read report checkup offers"
  ON public.report_checkup_offers FOR SELECT TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module));
CREATE POLICY "Patients can read own published report offers"
  ON public.report_checkup_offers FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND is_active = true
    AND EXISTS (
      SELECT 1 FROM public.report_documents rd
      WHERE rd.analysis_id = report_checkup_offers.analysis_id
        AND rd.published_at IS NOT NULL
        AND rd.published_blocks IS NOT NULL
    )
  );
CREATE POLICY "Staff can insert report checkup offers"
  ON public.report_checkup_offers FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module));
CREATE POLICY "Staff can update report checkup offers"
  ON public.report_checkup_offers FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'patients'::public.admin_module));

ALTER TABLE public.energy_orders
  ADD COLUMN line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN report_offer_id uuid REFERENCES public.report_checkup_offers(id) ON DELETE SET NULL;
CREATE INDEX energy_orders_report_offer_idx ON public.energy_orders(report_offer_id);

CREATE OR REPLACE FUNCTION public.deactivate_report_checkup_offers_on_analysis_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.report_checkup_offers
  SET is_active = false, reserved_order_id = NULL, reserved_until = NULL, updated_at = now()
  WHERE analysis_id = OLD.id AND used_at IS NULL;
  RETURN OLD;
END;
$$;
CREATE TRIGGER deactivate_report_checkup_offers_before_analysis_delete
BEFORE DELETE ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.deactivate_report_checkup_offers_on_analysis_delete();

CREATE OR REPLACE FUNCTION public.reserve_report_checkup_offer(
  p_offer_id uuid,
  p_user_id uuid,
  p_checkup_slug text,
  p_order_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reserved boolean := false;
BEGIN
  UPDATE public.report_checkup_offers
  SET reserved_order_id = p_order_id,
      reserved_until = now() + interval '24 hours',
      updated_at = now()
  WHERE id = p_offer_id
    AND user_id = p_user_id
    AND advertised_checkup_slug = p_checkup_slug
    AND is_active = true
    AND used_at IS NULL
    AND expires_at > now()
    AND (reserved_order_id IS NULL OR reserved_until < now() OR reserved_order_id = p_order_id);
  GET DIAGNOSTICS v_reserved = ROW_COUNT;
  RETURN v_reserved;
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_report_checkup_offer(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_report_checkup_offer(uuid, uuid, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_report_checkup_offer(p_offer_id uuid, p_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_redeemed boolean := false;
BEGIN
  UPDATE public.report_checkup_offers
  SET used_order_id = p_order_id,
      used_at = now(),
      is_active = false,
      reserved_order_id = NULL,
      reserved_until = NULL,
      updated_at = now()
  WHERE id = p_offer_id
    AND used_at IS NULL
    AND reserved_order_id = p_order_id;
  GET DIAGNOSTICS v_redeemed = ROW_COUNT;
  RETURN v_redeemed;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_report_checkup_offer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_report_checkup_offer(uuid, uuid) TO service_role;