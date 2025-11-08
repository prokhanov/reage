-- Add unique index on invite_tokens.token to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token_unique ON public.invite_tokens (token);