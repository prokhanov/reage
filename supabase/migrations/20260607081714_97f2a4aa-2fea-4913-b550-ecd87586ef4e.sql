
CREATE TABLE public.reminder_stop_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  added_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_stop_list TO authenticated;
GRANT ALL ON public.reminder_stop_list TO service_role;

ALTER TABLE public.reminder_stop_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage reminder stop list"
ON public.reminder_stop_list FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));
