CREATE TABLE public.password_reset_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  used_at timestamptz
);
CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens(user_id);
CREATE INDEX password_reset_tokens_active_idx ON public.password_reset_tokens(user_id) WHERE used_at IS NULL;

GRANT ALL ON public.password_reset_tokens TO service_role;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- No client policies: access only via edge functions with service_role.