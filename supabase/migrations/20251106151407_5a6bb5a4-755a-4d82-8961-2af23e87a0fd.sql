-- Add RLS policies for superadmin to view all user data

-- Superadmin can view all profiles
CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Superadmin can view all medical history
CREATE POLICY "Superadmins can view all medical history"
  ON public.medical_history
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Superadmin can view all analyses
CREATE POLICY "Superadmins can view all analyses"
  ON public.analyses
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Superadmin can view all analysis values
CREATE POLICY "Superadmins can view all analysis values"
  ON public.analysis_values
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Superadmin can view all recommendations
CREATE POLICY "Superadmins can view all recommendations"
  ON public.recommendations
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Superadmin can view all complaints
CREATE POLICY "Superadmins can view all complaints"
  ON public.complaints
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));