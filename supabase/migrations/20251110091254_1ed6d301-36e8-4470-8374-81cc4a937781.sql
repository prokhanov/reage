-- Remove old priority_tasks prompt
DELETE FROM ai_prompt_settings 
WHERE key = 'risk_zones_priority_tasks';

-- Drop priority_tasks column from risk_zone_analyses table
ALTER TABLE risk_zone_analyses 
DROP COLUMN IF EXISTS priority_tasks;