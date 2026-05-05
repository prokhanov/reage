CREATE TABLE public.health_strategy_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid,
  current_bio_age numeric NOT NULL,
  chronological_age numeric NOT NULL,
  target_bio_age numeric NOT NULL,
  health_index integer,
  system_goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  action_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  rationale text,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_health_strategy_user_created ON public.health_strategy_snapshots(user_id, created_at DESC);

ALTER TABLE public.health_strategy_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own strategy" ON public.health_strategy_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Staff view patient strategy" ON public.health_strategy_snapshots
  FOR SELECT USING (has_admin_permission(auth.uid(), 'patients'::admin_module) AND is_patient(user_id));

CREATE POLICY "Superadmins view all strategy" ON public.health_strategy_snapshots
  FOR SELECT USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System insert strategy" ON public.health_strategy_snapshots
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Superadmins delete strategy" ON public.health_strategy_snapshots
  FOR DELETE USING (has_role(auth.uid(), 'superadmin'::app_role));