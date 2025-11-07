-- Create enum type for analysis statuses
CREATE TYPE analysis_status AS ENUM ('on_review', 'processed');

-- Add status column to analyses table
ALTER TABLE analyses 
ADD COLUMN status analysis_status DEFAULT 'on_review' NOT NULL;

-- Create indexes for fast filtering
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_user_status ON analyses(user_id, status);

-- Update RLS policy for users to only see processed analyses
DROP POLICY IF EXISTS "Users can view their own analyses" ON analyses;
CREATE POLICY "Users can view their own analyses"
ON analyses FOR SELECT
USING (
  auth.uid() = user_id AND 
  (status = 'processed' OR has_role(auth.uid(), 'superadmin'::app_role))
);

-- Update RLS policy for recommendations to filter by analysis status
DROP POLICY IF EXISTS "Users can view their own recommendations" ON recommendations;
CREATE POLICY "Users can view their own recommendations"
ON recommendations FOR SELECT
USING (
  auth.uid() = user_id AND 
  (
    analysis_id IS NULL OR 
    EXISTS (
      SELECT 1 FROM analyses 
      WHERE analyses.id = recommendations.analysis_id 
      AND analyses.status = 'processed'
    ) OR
    has_role(auth.uid(), 'superadmin'::app_role)
  )
);