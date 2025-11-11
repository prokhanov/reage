-- Create biomarker_categories table
CREATE TABLE public.biomarker_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  expert_role TEXT NOT NULL,
  expert_specialization TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_condition_categories table
CREATE TABLE public.medical_condition_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create symptom_categories table
CREATE TABLE public.symptom_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create symptom_templates table
CREATE TABLE public.symptom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  symptom TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.biomarker_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_condition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only superadmins can manage
CREATE POLICY "Anyone can view biomarker categories"
ON public.biomarker_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage biomarker categories"
ON public.biomarker_categories FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Anyone can view medical condition categories"
ON public.medical_condition_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage medical condition categories"
ON public.medical_condition_categories FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Anyone can view symptom categories"
ON public.symptom_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage symptom categories"
ON public.symptom_categories FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Anyone can view symptom templates"
ON public.symptom_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Superadmins can manage symptom templates"
ON public.symptom_templates FOR ALL USING (has_role(auth.uid(), 'superadmin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_biomarker_categories_updated_at
  BEFORE UPDATE ON public.biomarker_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_medical_condition_categories_updated_at
  BEFORE UPDATE ON public.medical_condition_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_symptom_categories_updated_at
  BEFORE UPDATE ON public.symptom_categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_symptom_templates_updated_at
  BEFORE UPDATE ON public.symptom_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Migrate biomarker categories from analyze-biomarkers edge function
INSERT INTO public.biomarker_categories (name, display_order, expert_role, expert_specialization) VALUES
  ('Липиды', 1, 'кардиолог с 20-летним опытом', 'сердечно-сосудистых заболеваниях и метаболизме липидов'),
  ('Гормоны', 2, 'эндокринолог с 20-летним опытом', 'гормональном балансе, щитовидной железе, половых гормонах и надпочечниках'),
  ('Витамины и микроэлементы', 3, 'терапевт и нутрициолог с 15-летним опытом', 'дефицитных состояниях, метаболизме витаминов и минералов'),
  ('Кровь', 4, 'гематолог с 18-летним опытом', 'анализах крови, анемиях и системах кроветворения'),
  ('Почки', 5, 'нефролог с 20-летним опытом', 'функции почек, электролитном балансе и мочевыделительной системе'),
  ('Печень', 6, 'гепатолог с 20-летним опытом', 'функции печени, детоксикации и метаболизме'),
  ('Воспаление', 7, 'иммунолог и ревматолог с 18-летним опытом', 'воспалительных процессах, иммунной системе и аутоиммунных заболеваниях'),
  ('Онкомаркеры', 8, 'онколог с 20-летним опытом', 'онкологических маркерах, ранней диагностике рака и скрининге'),
  ('Метаболизм', 9, 'эндокринолог-диабетолог с 20-летним опытом', 'углеводном обмене, инсулинорезистентности и метаболическом синдроме');

-- Migrate medical condition categories
INSERT INTO public.medical_condition_categories (name, display_order) VALUES
  ('🫀 Сердечно-сосудистая система', 1),
  ('🧠 Неврология', 2),
  ('😮‍💨 Респираторная система', 3),
  ('🍽️ ЖКТ', 4),
  ('🦴 Опорно-двигательная', 5),
  ('🩸 Эндокринная система', 6),
  ('🧬 Иммунная система', 7),
  ('🔬 Онкология', 8),
  ('👶 Репродуктивное здоровье', 9);

-- Migrate symptom categories
INSERT INTO public.symptom_categories (name, emoji, display_order) VALUES
  ('Общее состояние', '😴', 1),
  ('Сон', '🌙', 2),
  ('Настроение', '😊', 3),
  ('Пищеварение', '🍽️', 4),
  ('Боли и дискомфорт', '🤕', 5);

-- Migrate symptom templates
INSERT INTO public.symptom_templates (category, symptom, display_order) VALUES
  ('Общее состояние', 'Усталость', 1),
  ('Общее состояние', 'Энергичность', 2),
  ('Общее состояние', 'Головная боль', 3),
  ('Общее состояние', 'Головокружение', 4),
  ('Сон', 'Качество сна', 1),
  ('Сон', 'Бессонница', 2),
  ('Сон', 'Сонливость днем', 3),
  ('Настроение', 'Тревожность', 1),
  ('Настроение', 'Раздражительность', 2),
  ('Настроение', 'Депрессия', 3),
  ('Настроение', 'Стресс', 4),
  ('Пищеварение', 'Тошнота', 1),
  ('Пищеварение', 'Вздутие', 2),
  ('Пищеварение', 'Запор', 3),
  ('Пищеварение', 'Диарея', 4),
  ('Пищеварение', 'Изжога', 5),
  ('Боли и дискомфорт', 'Боль в суставах', 1),
  ('Боли и дискомфорт', 'Боль в мышцах', 2),
  ('Боли и дискомфорт', 'Боль в спине', 3),
  ('Боли и дискомфорт', 'Боль в животе', 4);