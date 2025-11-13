-- Add foreign key constraints for patient_interactions table
-- This enables proper relationship queries for creator and assignee data

-- First, ensure all existing records have valid references (set to NULL if invalid)
UPDATE patient_interactions 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = created_by);

UPDATE patient_interactions 
SET assigned_to = NULL 
WHERE assigned_to IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = assigned_to);

-- Add foreign key constraint for created_by
ALTER TABLE patient_interactions 
DROP CONSTRAINT IF EXISTS patient_interactions_created_by_fkey;

ALTER TABLE patient_interactions
ADD CONSTRAINT patient_interactions_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for assigned_to
ALTER TABLE patient_interactions 
DROP CONSTRAINT IF EXISTS patient_interactions_assigned_to_fkey;

ALTER TABLE patient_interactions
ADD CONSTRAINT patient_interactions_assigned_to_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;