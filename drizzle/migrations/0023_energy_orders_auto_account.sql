ALTER TABLE public.energy_orders
  ADD COLUMN IF NOT EXISTS claim_secret_hash text,
  ADD COLUMN IF NOT EXISTS claim_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_created boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS login_token_hash text,
  ADD COLUMN IF NOT EXISTS login_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS login_token_used_at timestamptz;
CREATE INDEX IF NOT EXISTS energy_orders_login_token_hash_idx ON public.energy_orders (login_token_hash) WHERE login_token_hash IS NOT NULL;