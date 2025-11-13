-- Add foreign key constraints to profiles table for patient_interactions
-- This enables direct profile data queries without going through auth.users

-- The profiles table has id that matches auth.users.id
-- So we can create foreign keys from created_by and assigned_to directly to profiles

ALTER TABLE patient_interactions 
DROP CONSTRAINT IF EXISTS patient_interactions_created_by_profiles_fkey;

ALTER TABLE patient_interactions
ADD CONSTRAINT patient_interactions_created_by_profiles_fkey 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

ALTER TABLE patient_interactions 
DROP CONSTRAINT IF EXISTS patient_interactions_assigned_to_profiles_fkey;

ALTER TABLE patient_interactions
ADD CONSTRAINT patient_interactions_assigned_to_profiles_fkey 
FOREIGN KEY (assigned_to) 
REFERENCES profiles(id) 
ON DELETE SET NULL;