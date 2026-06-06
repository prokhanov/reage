
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =========================================
-- Settings table (singleton)
-- =========================================
CREATE TABLE public.telegram_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_token text,
  chat_id text,
  is_active boolean NOT NULL DEFAULT false,
  enabled_events jsonb NOT NULL DEFAULT '{"user_registered": true, "subscription_paid": true}'::jsonb,
  internal_secret text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_notification_settings TO authenticated;
GRANT ALL ON public.telegram_notification_settings TO service_role;

ALTER TABLE public.telegram_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage telegram settings"
  ON public.telegram_notification_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER telegram_notification_settings_updated_at
  BEFORE UPDATE ON public.telegram_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insert singleton row
INSERT INTO public.telegram_notification_settings (singleton) VALUES (true);

-- =========================================
-- Log table
-- =========================================
CREATE TABLE public.telegram_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payload jsonb,
  status text NOT NULL,
  error text,
  is_test boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.telegram_notification_log TO authenticated;
GRANT ALL ON public.telegram_notification_log TO service_role;

ALTER TABLE public.telegram_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins read telegram log"
  ON public.telegram_notification_log
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_telegram_log_sent_at ON public.telegram_notification_log (sent_at DESC);

-- =========================================
-- Helper: invoke telegram-notify edge function via pg_net
-- =========================================
CREATE OR REPLACE FUNCTION public.invoke_telegram_notify(
  p_event_type text,
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_settings RECORD;
  v_url text := 'https://ilxgodhosirhhkffqryw.supabase.co/functions/v1/telegram-notify';
BEGIN
  SELECT is_active, internal_secret, enabled_events
    INTO v_settings
    FROM public.telegram_notification_settings
    WHERE singleton = true
    LIMIT 1;

  IF NOT FOUND OR NOT v_settings.is_active THEN
    RETURN;
  END IF;

  IF COALESCE((v_settings.enabled_events ->> p_event_type)::boolean, false) = false THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_settings.internal_secret
    ),
    body := jsonb_build_object(
      'event_type', p_event_type,
      'payload', p_payload
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Never break the originating transaction
  RAISE WARNING 'invoke_telegram_notify failed: %', SQLERRM;
END;
$$;

-- =========================================
-- Trigger: new user registration (on profiles INSERT)
-- =========================================
CREATE OR REPLACE FUNCTION public.notify_telegram_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.invoke_telegram_notify(
    'user_registered',
    jsonb_build_object(
      'user_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'gender', NEW.gender,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_telegram_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_new_user();

-- =========================================
-- Trigger: subscription paid (status -> active)
-- =========================================
CREATE OR REPLACE FUNCTION public.notify_telegram_subscription_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_plan_name text;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT first_name, last_name, email, phone INTO v_profile
    FROM public.profiles WHERE id = NEW.user_id;

  SELECT name INTO v_plan_name
    FROM public.subscription_plans WHERE id = NEW.plan_id;

  PERFORM public.invoke_telegram_notify(
    'subscription_paid',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'first_name', v_profile.first_name,
      'last_name', v_profile.last_name,
      'email', v_profile.email,
      'phone', v_profile.phone,
      'plan_name', v_plan_name,
      'plan_type', NEW.plan_type,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_telegram_subscription_paid
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_subscription_paid();
