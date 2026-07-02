-- Правило: сотрудник с has_admin_permission(user, module) внутри своего модуля
-- имеет тот же доступ, что и суперадмин. Существующие суперадмин-политики
-- оставляем как есть — новые политики добавляются как permissive OR.

DO $$
DECLARE
  mapping RECORD;
  policy_name TEXT;
BEGIN
  FOR mapping IN
    SELECT * FROM (VALUES
      -- модуль patients
      ('patients'::text, 'profiles'::text),
      ('patients', 'analyses'),
      ('patients', 'analysis_values'),
      ('patients', 'recommendations'),
      ('patients', 'prescriptions'),
      ('patients', 'prescription_adherence'),
      ('patients', 'medical_history'),
      ('patients', 'complaints'),
      ('patients', 'user_symptoms'),
      ('patients', 'subscriptions'),
      ('patients', 'subscription_history'),
      ('patients', 'weight_history'),
      ('patients', 'chat_conversations'),
      ('patients', 'chat_messages'),
      ('patients', 'risk_zone_analyses'),
      ('patients', 'health_strategy_snapshots'),
      ('patients', 'patient_interactions'),
      ('patients', 'task_completions'),
      ('patients', 'report_jobs'),
      ('patients', 'analysis_bookings'),
      -- модуль analysis_bookings
      ('analysis_bookings', 'analysis_bookings'),
      ('analysis_bookings', 'availability_slots'),
      ('analysis_bookings', 'availability_templates'),
      ('analysis_bookings', 'default_slot_settings'),
      ('analysis_bookings', 'booking_mode_settings'),
      ('analysis_bookings', 'lab_locations'),
      ('analysis_bookings', 'lab_map_contexts'),
      ('analysis_bookings', 'confirmation_reminder_log'),
      ('analysis_bookings', 'confirmation_reminder_settings'),
      ('analysis_bookings', 'reminder_stop_list'),
      -- модуль my_assignments (staff со списком назначенных пациентов)
      ('my_assignments', 'patient_interactions'),
      ('my_assignments', 'profiles'),
      -- модуль user_management
      ('user_management', 'profiles'),
      ('user_management', 'user_roles'),
      ('user_management', 'custom_roles'),
      ('user_management', 'admin_permissions'),
      ('user_management', 'role_permissions'),
      ('user_management', 'invite_tokens'),
      -- модуль data_management
      ('data_management', 'biomarkers'),
      ('data_management', 'biomarker_categories'),
      ('data_management', 'symptom_templates'),
      ('data_management', 'symptom_categories'),
      ('data_management', 'medical_conditions_templates'),
      ('data_management', 'medical_condition_categories'),
      ('data_management', 'plan_biomarkers'),
      ('data_management', 'bioage_population_norms'),
      ('data_management', 'health_model_settings'),
      ('data_management', 'demo_data_templates'),
      -- модуль ai_settings
      ('ai_settings', 'ai_prompt_settings'),
      -- модуль subscription_plans
      ('subscription_plans', 'subscription_plans'),
      ('subscription_plans', 'subscription_pricing'),
      -- модуль payment_gateway
      ('payment_gateway', 'payment_gateway_settings'),
      ('payment_gateway', 'payment_orders'),
      ('payment_gateway', 'payment_callback_log'),
      -- модуль promo_codes
      ('promo_codes', 'promo_codes'),
      ('promo_codes', 'promo_code_plans'),
      ('promo_codes', 'promo_code_redemptions'),
      ('promo_codes', 'promo_code_batches'),
      ('promo_codes', 'promo_code_settings'),
      -- модуль email_settings
      ('email_settings', 'email_templates'),
      ('email_settings', 'email_sender_settings'),
      ('email_settings', 'email_drip_series'),
      ('email_settings', 'email_drip_steps'),
      ('email_settings', 'email_drip_schedule'),
      ('email_settings', 'email_unsubscribes'),
      -- модуль sms_settings
      ('sms_settings', 'sms_templates'),
      ('sms_settings', 'sms_sender_settings'),
      ('sms_settings', 'sms_send_log'),
      -- модуль telegram_settings
      ('telegram_settings', 'telegram_notification_settings'),
      ('telegram_settings', 'telegram_notification_log'),
      -- модуль lab_locations
      ('lab_locations', 'lab_locations'),
      ('lab_locations', 'lab_map_contexts')
    ) AS m(module, tbl)
  LOOP
    policy_name := 'staff_module_' || mapping.module || '_full_access';

    -- Убедимся, что RLS уже включен на таблице (иначе политика ничего не даст).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', mapping.tbl);

    -- Идемпотентно: сначала DROP, потом CREATE. Политика ALL с USING и WITH CHECK.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, mapping.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO authenticated ' ||
      'USING (public.has_admin_permission(auth.uid(), %L::public.admin_module)) ' ||
      'WITH CHECK (public.has_admin_permission(auth.uid(), %L::public.admin_module))',
      policy_name, mapping.tbl, mapping.module, mapping.module
    );
  END LOOP;
END$$;

-- Убедимся, что базовые GRANT'ы для authenticated есть на всех этих таблицах.
-- (Существующие GRANT'ы не перезаписываются; повторный GRANT безопасен.)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'profiles','analyses','analysis_values','recommendations','prescriptions',
      'prescription_adherence','medical_history','complaints','user_symptoms',
      'subscriptions','subscription_history','weight_history','chat_conversations',
      'chat_messages','risk_zone_analyses','health_strategy_snapshots',
      'patient_interactions','task_completions','report_jobs','analysis_bookings',
      'availability_slots','availability_templates','default_slot_settings',
      'booking_mode_settings','lab_locations','lab_map_contexts',
      'confirmation_reminder_log','confirmation_reminder_settings','reminder_stop_list',
      'user_roles','custom_roles','admin_permissions','role_permissions','invite_tokens',
      'biomarkers','biomarker_categories','symptom_templates','symptom_categories',
      'medical_conditions_templates','medical_condition_categories','plan_biomarkers',
      'bioage_population_norms','health_model_settings','demo_data_templates',
      'ai_prompt_settings','subscription_plans','subscription_pricing',
      'payment_gateway_settings','payment_orders','payment_callback_log',
      'promo_codes','promo_code_plans','promo_code_redemptions','promo_code_batches','promo_code_settings',
      'email_templates','email_sender_settings','email_drip_series','email_drip_steps',
      'email_drip_schedule','email_unsubscribes',
      'sms_templates','sms_sender_settings','sms_send_log',
      'telegram_notification_settings','telegram_notification_log'
    ])
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END$$;