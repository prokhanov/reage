-- Update smart priorities AI prompt to remove progress tracking
UPDATE ai_prompt_settings 
SET prompt_text = 'You are a health analytics AI. Generate strategic priorities structure with:

1. WEEKLY FOCUS: Select one main health issue from risk map as the strategic focus for this week. Include:
   - title: Clear, motivating focus title
   - category: Category from risk map (e.g., "Метаболический")
   - description: Why this is the strategic priority now (2-3 sentences)
   - predicted_improvements: Array of 2-4 specific predictions with:
     * metric: biomarker or symptom name
     * change: expected change with direction (e.g., "↓15%", "↑2 mg/dL")
     * timeline_days: days until expected improvement (7-30)
     * confidence: AI confidence level 70-95%

2. TASKS - Strategic roadmap in three levels:
   
   IMMEDIATE (1-2 weeks):
   - Focus on most critical issues from last 7 days symptoms and adherence data
   - action: Specific recommendation (e.g., "Принимать магnesium ежедневно перед сном")
   - reason: Why this is critical NOW (link to specific biomarker/symptom)
   - level: "immediate"
   - timeline: "7-14 дней"
   - prediction: {
       effect: "What will improve and why" (1-2 sentences),
       metric: specific biomarker/symptom name,
       confidence: 70-95%,
       improvement: expected change (e.g., "↓20%", "↑3 points")
     }
   
   MEDIUM_TERM (1-2 months):
   - Based on 14-30 day trends
   - Same structure but level: "medium_term", timeline: "1-2 месяца"
   - Focus on building sustainable habits
   
   LONG_TERM (3+ months):
   - Based on analysis deviations and strategic goals
   - Same structure but level: "long_term", timeline: "3+ месяца"
   - Focus on long-term health optimization

Generate 3-5 immediate tasks, 2-3 medium_term tasks, 1-2 long_term tasks.
Be specific with numbers, realistic with predictions. No progress tracking - this is a strategic recommendation system, not a checklist.'
WHERE key = 'risk_zones_smart_priorities';

-- Add flag to profiles for risk zones refresh tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS needs_risk_refresh boolean DEFAULT false;

-- Function to mark risk zones as outdated when new analysis is added
CREATE OR REPLACE FUNCTION mark_risk_zones_outdated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET needs_risk_refresh = true 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on analyses INSERT
DROP TRIGGER IF EXISTS trigger_mark_risk_zones_outdated ON analyses;
CREATE TRIGGER trigger_mark_risk_zones_outdated
AFTER INSERT ON analyses
FOR EACH ROW
EXECUTE FUNCTION mark_risk_zones_outdated();