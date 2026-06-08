CREATE POLICY "Admins read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (public.has_admin_permission(auth.uid(), 'patients'::admin_module));

CREATE POLICY "Admins read sms send log"
ON public.sms_send_log
FOR SELECT
TO authenticated
USING (public.has_admin_permission(auth.uid(), 'patients'::admin_module));

GRANT SELECT ON public.email_send_log TO authenticated;
GRANT SELECT ON public.sms_send_log TO authenticated;