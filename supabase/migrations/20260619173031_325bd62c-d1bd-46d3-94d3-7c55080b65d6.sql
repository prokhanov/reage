CREATE TABLE public.email_verification_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz
);
CREATE INDEX email_verification_tokens_user_id_idx ON public.email_verification_tokens(user_id);
CREATE INDEX email_verification_tokens_active_idx ON public.email_verification_tokens(user_id) WHERE used_at IS NULL;

GRANT ALL ON public.email_verification_tokens TO service_role;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
-- No client policies: access only via edge functions with service_role.