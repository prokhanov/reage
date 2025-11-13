-- Create enum for interaction types
CREATE TYPE public.interaction_type AS ENUM (
  'online_consultation',
  'phone_call',
  'email',
  'in_person_meeting',
  'message',
  'note',
  'task',
  'appointment'
);

-- Create enum for interaction status
CREATE TYPE public.interaction_status AS ENUM (
  'completed',
  'scheduled',
  'cancelled',
  'pending',
  'in_progress'
);

-- Create patient_interactions table
CREATE TABLE public.patient_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  
  interaction_type interaction_type NOT NULL,
  status interaction_status NOT NULL DEFAULT 'completed',
  
  title text NOT NULL,
  description text,
  outcome text,
  
  interaction_date timestamp with time zone NOT NULL DEFAULT now(),
  scheduled_date timestamp with time zone,
  duration_minutes integer,
  
  created_by uuid NOT NULL,
  assigned_to uuid,
  related_analysis_id uuid,
  related_prescription_id uuid,
  
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[],
  is_important boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_patient_interactions_user_id ON public.patient_interactions(user_id);
CREATE INDEX idx_patient_interactions_created_by ON public.patient_interactions(created_by);
CREATE INDEX idx_patient_interactions_interaction_date ON public.patient_interactions(interaction_date DESC);
CREATE INDEX idx_patient_interactions_type ON public.patient_interactions(interaction_type);
CREATE INDEX idx_patient_interactions_status ON public.patient_interactions(status);

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.patient_interactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.patient_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view patient interactions"
  ON public.patient_interactions FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'patients'::admin_module) 
    AND is_patient(user_id)
  );

CREATE POLICY "Staff can insert patient interactions"
  ON public.patient_interactions FOR INSERT
  WITH CHECK (
    has_admin_permission(auth.uid(), 'patients'::admin_module) 
    AND is_patient(user_id)
  );

CREATE POLICY "Staff can update patient interactions"
  ON public.patient_interactions FOR UPDATE
  USING (
    has_admin_permission(auth.uid(), 'patients'::admin_module) 
    AND is_patient(user_id)
  );

CREATE POLICY "Staff can delete patient interactions"
  ON public.patient_interactions FOR DELETE
  USING (
    has_admin_permission(auth.uid(), 'patients'::admin_module) 
    AND is_patient(user_id)
  );

CREATE POLICY "Superadmins can manage all interactions"
  ON public.patient_interactions FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role));