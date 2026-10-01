-- Callback requests from landing visitors ("Вызвать медсестру" form).
-- Guests submit a phone number; a Telegram notification goes to the ops group.

CREATE TABLE public.callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  source text NOT NULL DEFAULT 'nurse_home',
  page_url text,
  utm jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.callback_requests TO anon, authenticated;
GRANT ALL ON public.callback_requests TO service_role;

ALTER TABLE public.callback_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a callback request"
  ON public.callback_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Superadmins can read callback requests"
  ON public.callback_requests
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE INDEX idx_callback_requests_created_at ON public.callback_requests (created_at DESC);

-- Telegram notification on new request
CREATE OR REPLACE FUNCTION public.notify_telegram_callback_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.invoke_telegram_notify(
    'nurse_call_requested',
    jsonb_build_object(
      'phone', NEW.phone,
      'source', NEW.source,
      'page_url', NEW.page_url,
      'utm', NEW.utm,
      'user_id', NEW.user_id,
      'requested_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_telegram_callback_request
  AFTER INSERT ON public.callback_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_telegram_callback_request();

-- Enable the new Telegram event
UPDATE public.telegram_notification_settings
SET enabled_events = COALESCE(enabled_events, '{}'::jsonb) || '{"nurse_call_requested": true}'::jsonb
WHERE singleton = true;
