ALTER TABLE public.telegram_notification_settings
  ADD COLUMN IF NOT EXISTS low_balance_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS low_balance_threshold numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS low_balance_template text NOT NULL DEFAULT '⚠️ <b>Низкий баланс SMS Aero</b>
Остаток: <b>{balance} ₽</b>
Порог: {threshold} ₽';