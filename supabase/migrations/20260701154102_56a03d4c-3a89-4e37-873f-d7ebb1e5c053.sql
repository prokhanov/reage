
DO $$
DECLARE
  r record;
  policies text[][] := ARRAY[
    ARRAY['user_roles', 'Staff can view patient roles', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['subscriptions', 'Staff can view patient subscriptions', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['weight_history', 'Staff can view patient weight history', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['medical_history', 'Staff can view patient medical history', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['complaints', 'Staff can view patient complaints', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['user_symptoms', 'Staff can view patient symptoms', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['risk_zone_analyses', 'Staff can view patient risk zones', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['chat_conversations', 'Staff can view patient conversations', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['task_completions', 'Staff can view patient task completions', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['prescription_adherence', 'Staff can view patient adherence', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)'],
    ARRAY['report_jobs', 'Staff can view patient report jobs', 'has_admin_permission(auth.uid(), ''patients''::admin_module) AND is_patient(user_id)']
  ];
  p text[];
BEGIN
  FOREACH p SLICE 1 IN ARRAY policies LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p[2], p[1]);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (%s)', p[2], p[1], p[3]);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Staff can view patient chat messages" ON public.chat_messages;
CREATE POLICY "Staff can view patient chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    WHERE c.id = chat_messages.conversation_id AND is_patient(c.user_id)
  ));
