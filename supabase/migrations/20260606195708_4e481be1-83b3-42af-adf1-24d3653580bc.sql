
-- ============================================
-- DRIP EMAIL CAMPAIGNS SYSTEM
-- ============================================

-- Enum for trigger types
DO $$ BEGIN
  CREATE TYPE public.drip_trigger_type AS ENUM ('registration', 'subscription_paid', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.drip_schedule_status AS ENUM ('pending', 'sent', 'skipped', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.drip_delay_unit AS ENUM ('minutes', 'hours', 'days');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- 1. SERIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_drip_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_type public.drip_trigger_type NOT NULL DEFAULT 'registration',
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drip_series TO authenticated;
GRANT ALL ON public.email_drip_series TO service_role;
ALTER TABLE public.email_drip_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage series" ON public.email_drip_series
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_email_drip_series_updated
  BEFORE UPDATE ON public.email_drip_series
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 2. STEPS
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_drip_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.email_drip_series(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  preheader text,
  body_markdown text NOT NULL DEFAULT '',
  cta_label text,
  cta_url text,
  delay_value integer NOT NULL DEFAULT 0,
  delay_unit public.drip_delay_unit NOT NULL DEFAULT 'hours',
  send_time_local text,
  cancel_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drip_steps_series ON public.email_drip_steps(series_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drip_steps TO authenticated;
GRANT ALL ON public.email_drip_steps TO service_role;
ALTER TABLE public.email_drip_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage steps" ON public.email_drip_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_email_drip_steps_updated
  BEFORE UPDATE ON public.email_drip_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 3. SCHEDULE (план отправок)
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_drip_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  series_id uuid NOT NULL REFERENCES public.email_drip_series(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.email_drip_steps(id) ON DELETE CASCADE,
  send_at timestamptz NOT NULL,
  status public.drip_schedule_status NOT NULL DEFAULT 'pending',
  skip_reason text,
  attempt integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_drip_schedule_pending
  ON public.email_drip_schedule(send_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_drip_schedule_user ON public.email_drip_schedule(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_drip_schedule TO authenticated;
GRANT ALL ON public.email_drip_schedule TO service_role;
ALTER TABLE public.email_drip_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage schedule" ON public.email_drip_schedule
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_email_drip_schedule_updated
  BEFORE UPDATE ON public.email_drip_schedule
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 4. UNSUBSCRIBES
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  scope text NOT NULL,
  reason text,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, scope)
);

CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON public.email_unsubscribes(email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_unsubscribes TO authenticated;
GRANT ALL ON public.email_unsubscribes TO service_role;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins view unsubscribes" ON public.email_unsubscribes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins manage unsubscribes" ON public.email_unsubscribes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'::app_role));

-- ============================================
-- ENROLLMENT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.enroll_user_in_series(
  p_user_id uuid,
  p_series_id uuid,
  p_base_time timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_step RECORD;
  v_offset interval;
  v_send_at timestamptz;
  v_cumulative_offset interval := interval '0';
  v_count integer := 0;
BEGIN
  FOR v_step IN
    SELECT * FROM public.email_drip_steps
    WHERE series_id = p_series_id AND is_active = true
    ORDER BY order_index ASC, created_at ASC
  LOOP
    v_offset := make_interval(
      mins => CASE WHEN v_step.delay_unit = 'minutes' THEN v_step.delay_value ELSE 0 END,
      hours => CASE WHEN v_step.delay_unit = 'hours' THEN v_step.delay_value ELSE 0 END,
      days => CASE WHEN v_step.delay_unit = 'days' THEN v_step.delay_value ELSE 0 END
    );
    v_cumulative_offset := v_cumulative_offset + v_offset;
    v_send_at := p_base_time + v_cumulative_offset;

    INSERT INTO public.email_drip_schedule (user_id, series_id, step_id, send_at, status)
    VALUES (p_user_id, p_series_id, v_step.id, v_send_at, 'pending')
    ON CONFLICT (user_id, step_id) DO NOTHING;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.enroll_in_active_series(
  p_user_id uuid,
  p_trigger_type public.drip_trigger_type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_series RECORD;
BEGIN
  FOR v_series IN
    SELECT id FROM public.email_drip_series
    WHERE is_active = true AND trigger_type = p_trigger_type
  LOOP
    PERFORM public.enroll_user_in_series(p_user_id, v_series.id, now());
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'enroll_in_active_series failed: %', SQLERRM;
END;
$$;

-- ============================================
-- TRIGGERS on profiles and subscriptions
-- ============================================
CREATE OR REPLACE FUNCTION public.trg_drip_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.enroll_in_active_series(NEW.id, 'registration'::public.drip_trigger_type);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drip_on_profile_insert ON public.profiles;
CREATE TRIGGER trg_drip_on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_drip_on_profile_insert();

CREATE OR REPLACE FUNCTION public.trg_drip_on_subscription_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    PERFORM public.enroll_in_active_series(NEW.user_id, 'subscription_paid'::public.drip_trigger_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_drip_on_subscription_active ON public.subscriptions;
CREATE TRIGGER trg_drip_on_subscription_active
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_drip_on_subscription_active();
