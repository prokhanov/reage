-- Add comment to document the new three-tier smart_priorities structure
COMMENT ON COLUMN risk_zone_analyses.smart_priorities IS 
'Three-tier strategic roadmap with immediate (1-2 weeks), medium_term (1-2 months), and long_term (3+ months) focuses and tasks. Each tier contains a focus object (title, description, predicted_improvements) and associated tasks array.';