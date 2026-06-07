
DO $$
DECLARE
  v_url text;
  v_key text;
BEGIN
  -- snapshot prior job if any
  PERFORM cron.unschedule('send-confirmation-reminders-hourly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-confirmation-reminders-hourly');

  v_url := 'https://ilxgodhosirhhkffqryw.supabase.co/functions/v1/send-confirmation-reminders';
  -- service role key is stored in vault as 'email_queue_service_role_key' by setup_email_infra
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;

  IF v_key IS NULL THEN
    RAISE NOTICE 'email_queue_service_role_key not found in vault — cron job not created';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'send-confirmation-reminders-hourly',
    '0 * * * *',
    format(
      $cmd$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || %L),
        body := '{}'::jsonb
      ) as request_id;$cmd$,
      v_url, v_key
    )
  );
END $$;
