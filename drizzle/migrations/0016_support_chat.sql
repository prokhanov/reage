ALTER TABLE public.telegram_notification_settings
  ADD COLUMN IF NOT EXISTS support_chat_id text,
  ADD COLUMN IF NOT EXISTS support_webhook_secret text NOT NULL DEFAULT encode(extensions.gen_random_bytes(24),'hex');

CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token text NOT NULL UNIQUE,
  user_id uuid,
  name text,
  email text,
  phone text,
  page text,
  tg_topic_id bigint,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.support_conversations(tg_topic_id);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL,
  text text NOT NULL,
  tg_message_id bigint,
  read_by_visitor boolean NOT NULL DEFAULT false,
  emailed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.support_messages(conversation_id, created_at);

GRANT ALL ON public.support_conversations TO service_role;
GRANT ALL ON public.support_messages TO service_role;
GRANT SELECT ON public.support_conversations TO authenticated;
GRANT SELECT ON public.support_messages TO authenticated;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read support conversations" ON public.support_conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'superadmin'));
CREATE POLICY "Superadmins read support messages" ON public.support_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'superadmin'));