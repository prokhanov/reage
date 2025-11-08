-- Change role field in invite_tokens to text to support custom roles
ALTER TABLE public.invite_tokens 
ALTER COLUMN role TYPE text;