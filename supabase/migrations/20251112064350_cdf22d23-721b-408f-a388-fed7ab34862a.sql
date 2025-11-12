-- Add foreign key constraints with CASCADE for complete user data deletion

-- 1. Add foreign keys for prescriptions table
ALTER TABLE public.prescriptions
DROP CONSTRAINT IF EXISTS prescriptions_user_id_fkey,
DROP CONSTRAINT IF EXISTS prescriptions_created_by_fkey,
DROP CONSTRAINT IF EXISTS prescriptions_analysis_id_fkey;

ALTER TABLE public.prescriptions
ADD CONSTRAINT prescriptions_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.prescriptions
ADD CONSTRAINT prescriptions_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

ALTER TABLE public.prescriptions
ADD CONSTRAINT prescriptions_analysis_id_fkey 
FOREIGN KEY (analysis_id) 
REFERENCES public.analyses(id) 
ON DELETE CASCADE;

-- 2. Add foreign keys for prescription_adherence table
ALTER TABLE public.prescription_adherence
DROP CONSTRAINT IF EXISTS prescription_adherence_user_id_fkey,
DROP CONSTRAINT IF EXISTS prescription_adherence_prescription_id_fkey;

ALTER TABLE public.prescription_adherence
ADD CONSTRAINT prescription_adherence_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

ALTER TABLE public.prescription_adherence
ADD CONSTRAINT prescription_adherence_prescription_id_fkey 
FOREIGN KEY (prescription_id) 
REFERENCES public.prescriptions(id) 
ON DELETE CASCADE;

-- 3. Add foreign keys for chat_conversations table
ALTER TABLE public.chat_conversations
DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey;

ALTER TABLE public.chat_conversations
ADD CONSTRAINT chat_conversations_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 4. Add foreign keys for chat_messages table (cascade when conversation is deleted)
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES public.chat_conversations(id) 
ON DELETE CASCADE;

-- 5. Add foreign keys for risk_zone_analyses table
ALTER TABLE public.risk_zone_analyses
DROP CONSTRAINT IF EXISTS risk_zone_analyses_user_id_fkey;

ALTER TABLE public.risk_zone_analyses
ADD CONSTRAINT risk_zone_analyses_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- 6. Create utility function to clean orphaned data
CREATE OR REPLACE FUNCTION public.clean_orphaned_user_data()
RETURNS TABLE(
  table_name text,
  deleted_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  presc_count bigint;
  chat_count bigint;
  risk_count bigint;
  adher_count bigint;
BEGIN
  -- Clean prescriptions
  DELETE FROM public.prescriptions
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS presc_count = ROW_COUNT;
  
  RETURN QUERY SELECT 'prescriptions'::text, presc_count;
  
  -- Clean chat_conversations
  DELETE FROM public.chat_conversations
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS chat_count = ROW_COUNT;
  
  RETURN QUERY SELECT 'chat_conversations'::text, chat_count;
  
  -- Clean risk_zone_analyses
  DELETE FROM public.risk_zone_analyses
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS risk_count = ROW_COUNT;
  
  RETURN QUERY SELECT 'risk_zone_analyses'::text, risk_count;
  
  -- Clean prescription_adherence
  DELETE FROM public.prescription_adherence
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  GET DIAGNOSTICS adher_count = ROW_COUNT;
  
  RETURN QUERY SELECT 'prescription_adherence'::text, adher_count;
END;
$$;

-- 7. Create function to verify user data deletion
CREATE OR REPLACE FUNCTION public.check_user_data_deleted(check_user_id uuid)
RETURNS TABLE(
  table_name text,
  records_found bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'profiles'::text, COUNT(*)::bigint FROM profiles WHERE id = check_user_id
  UNION ALL
  SELECT 'user_roles'::text, COUNT(*)::bigint FROM user_roles WHERE user_id = check_user_id
  UNION ALL
  SELECT 'analyses'::text, COUNT(*)::bigint FROM analyses WHERE user_id = check_user_id
  UNION ALL
  SELECT 'prescriptions'::text, COUNT(*)::bigint FROM prescriptions WHERE user_id = check_user_id
  UNION ALL
  SELECT 'recommendations'::text, COUNT(*)::bigint FROM recommendations WHERE user_id = check_user_id
  UNION ALL
  SELECT 'chat_conversations'::text, COUNT(*)::bigint FROM chat_conversations WHERE user_id = check_user_id
  UNION ALL
  SELECT 'risk_zone_analyses'::text, COUNT(*)::bigint FROM risk_zone_analyses WHERE user_id = check_user_id
  UNION ALL
  SELECT 'prescription_adherence'::text, COUNT(*)::bigint FROM prescription_adherence WHERE user_id = check_user_id
  UNION ALL
  SELECT 'medical_history'::text, COUNT(*)::bigint FROM medical_history WHERE user_id = check_user_id
  UNION ALL
  SELECT 'complaints'::text, COUNT(*)::bigint FROM complaints WHERE user_id = check_user_id
  UNION ALL
  SELECT 'user_symptoms'::text, COUNT(*)::bigint FROM user_symptoms WHERE user_id = check_user_id
  UNION ALL
  SELECT 'subscriptions'::text, COUNT(*)::bigint FROM subscriptions WHERE user_id = check_user_id
  UNION ALL
  SELECT 'analysis_bookings'::text, COUNT(*)::bigint FROM analysis_bookings WHERE user_id = check_user_id
  UNION ALL
  SELECT 'task_completions'::text, COUNT(*)::bigint FROM task_completions WHERE user_id = check_user_id;
END;
$$;