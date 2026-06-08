-- Allow admins with 'patients' module access to read telegram_notification_log
-- so the per-booking notification history can show Telegram events.
CREATE POLICY "Admins read telegram log"
ON public.telegram_notification_log
FOR SELECT
TO authenticated
USING (has_admin_permission(auth.uid(), 'patients'::admin_module));