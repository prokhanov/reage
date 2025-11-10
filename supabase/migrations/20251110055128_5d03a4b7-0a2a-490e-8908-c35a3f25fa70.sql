-- Add smart_priorities column to risk_zone_analyses
ALTER TABLE risk_zone_analyses 
ADD COLUMN IF NOT EXISTS smart_priorities JSONB;

-- Create task_completions table for manual task tracking
CREATE TABLE IF NOT EXISTS task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on task_completions
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_completions
CREATE POLICY "Users can view their own task completions"
  ON task_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task completions"
  ON task_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task completions"
  ON task_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task completions"
  ON task_completions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all task completions"
  ON task_completions FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Staff can view patient task completions"
  ON task_completions FOR SELECT
  USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

-- Add AI prompt for smart priorities
INSERT INTO ai_prompt_settings (key, description, prompt_text)
VALUES (
  'risk_zones_smart_priorities',
  'AI prompt for generating smart priorities with weekly focus, multi-level tasks, and predictions',
  'You are a health analytics AI. Generate smart priorities structure with:

1. WEEKLY FOCUS: Select one main health issue from risk map as the focus for this week. Include:
   - title: Clear, motivating focus title
   - category: Category from risk map
   - description: Why this is the focus now
   - overall_progress: 0-100% based on related tasks completion
   - predicted_improvements: Array of specific predictions with biomarker/symptom names, expected change with direction (↓/↑), timeline in days, and confidence 70-95%

2. TASKS - Three levels:
   
   IMMEDIATE (this week):
   - Based on last 7 days prescription_adherence and last 3 days user_symptoms
   - action: Specific task (e.g., "Take magnesium daily")
   - reason: Why it''s urgent now
   - progress: 0-100% from adherence data or symptom trends
   - level: "immediate"
   - timeline: "7 days"
   - prediction: {effect: specific change, metric: biomarker/symptom name, confidence: 70-95%, improvement: number with ↓/↑}
   
   MEDIUM_TERM (1-2 weeks):
   - Based on 14-day trends in symptoms and weight
   - Similar structure but level: "medium_term", timeline: "14 days"
   - Calculate progress from symptom severity changes or weight trends
   
   LONG_TERM (month+):
   - Based on analysis deviations and prescription control_date
   - Similar structure but level: "long_term", timeline: days until control_date
   - Progress: days passed / total days to control date
   - Prediction: biomarker value by control date

Generate 3-5 immediate tasks, 2-3 medium_term tasks, 1-2 long_term tasks. Be specific with numbers and realistic with predictions.'
)
ON CONFLICT (key) DO UPDATE 
SET prompt_text = EXCLUDED.prompt_text,
    description = EXCLUDED.description,
    updated_at = now();