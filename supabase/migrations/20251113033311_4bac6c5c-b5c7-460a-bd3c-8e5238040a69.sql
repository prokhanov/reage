-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  badge_text TEXT,
  badge_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription_pricing table
CREATE TABLE subscription_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  period_display TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plan_id, period)
);

-- Update subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN plan_id UUID REFERENCES subscription_plans(id),
ADD COLUMN pricing_id UUID REFERENCES subscription_pricing(id);

-- Add triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON subscription_pricing
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscription_plans
CREATE POLICY "Anyone can view active plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Superadmin can manage plans"
  ON subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for subscription_pricing
CREATE POLICY "Anyone can view enabled pricing"
  ON subscription_pricing FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Superadmin can manage pricing"
  ON subscription_pricing FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, features, display_order, badge_text, badge_color) VALUES
('basic', 'Базовый', 'Основные возможности для заботы о здоровье', 
 '["Неограниченный доступ ко всем анализам", "Персонализированные рекомендации от AI", "Визиты медсестры на дом", "Базовая поддержка", "Отслеживание биомаркеров", "Детальные тренды и аналитика"]'::jsonb, 
 1, NULL, NULL),
('standard', 'Стандарт', 'Популярный выбор с расширенными возможностями', 
 '["Всё из тарифа Базовый", "Приоритетная поддержка 24/7", "Отслеживание биомаркеров в реальном времени", "Расширенная аналитика", "Консультации терапевта", "Индивидуальные планы здоровья", "Экспресс-обработка результатов"]'::jsonb, 
 2, 'Популярный', 'primary'),
('premium', 'Премиум', 'Максимальный уровень заботы о здоровье', 
 '["Всё из тарифа Стандарт", "Консультации узких специалистов", "Расширенные планы здоровья", "Экспресс-анализы (в день обращения)", "Персональный медицинский координатор", "VIP-поддержка", "Приоритетная запись", "Безлимитные консультации"]'::jsonb, 
 3, 'Максимум', 'accent');

-- Insert pricing for Basic plan
DO $$
DECLARE
  basic_plan_id UUID;
BEGIN
  SELECT id INTO basic_plan_id FROM subscription_plans WHERE name = 'basic';
  
  INSERT INTO subscription_pricing (plan_id, period, period_display, duration_months, amount, discount_percentage) VALUES
  (basic_plan_id, 'monthly', 'Месяц', 1, 12000, 0),
  (basic_plan_id, 'quarterly', 'Квартал', 3, 33000, 8),
  (basic_plan_id, 'semiannual', 'Полгода', 6, 61000, 15),
  (basic_plan_id, 'annual', 'Год', 12, 120000, 17);
END $$;

-- Insert pricing for Standard plan
DO $$
DECLARE
  standard_plan_id UUID;
BEGIN
  SELECT id INTO standard_plan_id FROM subscription_plans WHERE name = 'standard';
  
  INSERT INTO subscription_pricing (plan_id, period, period_display, duration_months, amount, discount_percentage) VALUES
  (standard_plan_id, 'monthly', 'Месяц', 1, 16000, 0),
  (standard_plan_id, 'quarterly', 'Квартал', 3, 44000, 8),
  (standard_plan_id, 'semiannual', 'Полгода', 6, 82000, 15),
  (standard_plan_id, 'annual', 'Год', 12, 160000, 17);
END $$;

-- Insert pricing for Premium plan
DO $$
DECLARE
  premium_plan_id UUID;
BEGIN
  SELECT id INTO premium_plan_id FROM subscription_plans WHERE name = 'premium';
  
  INSERT INTO subscription_pricing (plan_id, period, period_display, duration_months, amount, discount_percentage) VALUES
  (premium_plan_id, 'monthly', 'Месяц', 1, 24000, 0),
  (premium_plan_id, 'quarterly', 'Квартал', 3, 66000, 8),
  (premium_plan_id, 'semiannual', 'Полгода', 6, 122000, 15),
  (premium_plan_id, 'annual', 'Год', 12, 240000, 17);
END $$;

-- Migrate existing subscriptions to Basic Annual plan
DO $$
DECLARE
  basic_plan_id UUID;
  annual_pricing_id UUID;
BEGIN
  SELECT id INTO basic_plan_id FROM subscription_plans WHERE name = 'basic';
  SELECT id INTO annual_pricing_id FROM subscription_pricing 
    WHERE plan_id = basic_plan_id AND period = 'annual';
  
  UPDATE subscriptions 
  SET plan_id = basic_plan_id, pricing_id = annual_pricing_id
  WHERE plan_type = 'annual' AND amount = 120000;
END $$;