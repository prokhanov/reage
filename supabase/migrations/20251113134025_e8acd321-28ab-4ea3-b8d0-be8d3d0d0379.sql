-- Add foreign key constraints for patient_interactions relationships with analyses and prescriptions

-- Add foreign key for related_analysis_id
ALTER TABLE patient_interactions 
ADD CONSTRAINT patient_interactions_related_analysis_id_fkey 
FOREIGN KEY (related_analysis_id) REFERENCES analyses(id) ON DELETE SET NULL;

-- Add foreign key for related_prescription_id
ALTER TABLE patient_interactions 
ADD CONSTRAINT patient_interactions_related_prescription_id_fkey 
FOREIGN KEY (related_prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL;