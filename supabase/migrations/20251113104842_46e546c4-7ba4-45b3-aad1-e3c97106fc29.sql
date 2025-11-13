-- Create subscription_history table for tracking all subscription changes
CREATE TABLE subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  changed_by uuid,
  old_data jsonb,
  new_data jsonb NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX idx_subscription_history_subscription_id ON subscription_history(subscription_id);
CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- Enable RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Staff can view patient subscription history
CREATE POLICY "Staff can view patient subscription history"
  ON subscription_history FOR SELECT
  USING (
    has_admin_permission(auth.uid(), 'patients'::admin_module) 
    AND is_patient(user_id)
  );

-- Superadmins can view all subscription history
CREATE POLICY "Superadmins can view all subscription history"
  ON subscription_history FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'::app_role));

-- System can insert subscription history
CREATE POLICY "System can insert subscription history"
  ON subscription_history FOR INSERT
  WITH CHECK (true);