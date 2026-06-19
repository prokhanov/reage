-- Очищаем сиротские записи (user_id указывает на отсутствующего auth-пользователя)
DELETE FROM email_drip_schedule WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM payment_orders WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM weight_history WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM confirmation_reminder_log WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Добавляем внешние ключи с CASCADE на удаление, чтобы удаление пользователя
-- из auth.users каскадом удаляло связанные записи.
ALTER TABLE public.admin_permissions
  ADD CONSTRAINT admin_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.email_drip_schedule
  ADD CONSTRAINT email_drip_schedule_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.email_unsubscribes
  ADD CONSTRAINT email_unsubscribes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.patient_interactions
  ADD CONSTRAINT patient_interactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.payment_orders
  ADD CONSTRAINT payment_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.report_jobs
  ADD CONSTRAINT report_jobs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.subscription_history
  ADD CONSTRAINT subscription_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.weight_history
  ADD CONSTRAINT weight_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.invite_tokens
  ADD CONSTRAINT invite_tokens_used_by_fkey
  FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.confirmation_reminder_log
  ADD CONSTRAINT confirmation_reminder_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.reminder_stop_list
  ADD CONSTRAINT reminder_stop_list_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;