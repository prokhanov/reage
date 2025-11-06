-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create app_role enum
create type public.app_role as enum ('user', 'admin', 'superadmin');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  birth_date date not null,
  gender text check (gender in ('male', 'female', 'other')) not null,
  telegram_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Profiles RLS policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz default now() not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- User roles RLS policies
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Create security definer function for role checking
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Create biomarkers table
create table public.biomarkers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  unit text not null,
  category text not null,
  normal_min float,
  normal_max float,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.biomarkers enable row level security;

-- Biomarkers RLS - read-only for all authenticated users
create policy "Authenticated users can view biomarkers"
  on public.biomarkers for select
  to authenticated
  using (true);

-- Create complaints table
create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  main_complaints text,
  goals text,
  lifestyle text,
  created_at timestamptz default now() not null
);

alter table public.complaints enable row level security;

-- Complaints RLS policies
create policy "Users can view their own complaints"
  on public.complaints for select
  using (auth.uid() = user_id);

create policy "Users can insert their own complaints"
  on public.complaints for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own complaints"
  on public.complaints for update
  using (auth.uid() = user_id);

-- Create analyses table
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  lab_name text,
  note text,
  health_index float,
  biological_age float,
  created_at timestamptz default now() not null
);

alter table public.analyses enable row level security;

-- Analyses RLS policies
create policy "Users can view their own analyses"
  on public.analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own analyses"
  on public.analyses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own analyses"
  on public.analyses for update
  using (auth.uid() = user_id);

create policy "Users can delete their own analyses"
  on public.analyses for delete
  using (auth.uid() = user_id);

-- Create analysis_values table
create table public.analysis_values (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.analyses(id) on delete cascade not null,
  biomarker_id uuid references public.biomarkers(id) on delete cascade not null,
  value float not null,
  unit_override text,
  created_at timestamptz default now() not null,
  unique (analysis_id, biomarker_id)
);

alter table public.analysis_values enable row level security;

-- Analysis values RLS policies
create policy "Users can view their own analysis values"
  on public.analysis_values for select
  using (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_values.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

create policy "Users can insert their own analysis values"
  on public.analysis_values for insert
  with check (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_values.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

create policy "Users can update their own analysis values"
  on public.analysis_values for update
  using (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_values.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

create policy "Users can delete their own analysis values"
  on public.analysis_values for delete
  using (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_values.analysis_id
        and analyses.user_id = auth.uid()
    )
  );

-- Create recommendations table
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  analysis_id uuid references public.analyses(id) on delete cascade,
  type text check (type in ('Питание', 'Сон', 'Активность', 'Добавки', 'Стресс', 'Образ жизни', 'Общее резюме')) not null,
  text text not null,
  created_at timestamptz default now() not null
);

alter table public.recommendations enable row level security;

-- Recommendations RLS policies
create policy "Users can view their own recommendations"
  on public.recommendations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recommendations"
  on public.recommendations for insert
  with check (auth.uid() = user_id);

-- Create ai_prompt_settings table
create table public.ai_prompt_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  prompt_text text not null,
  updated_at timestamptz default now() not null
);

alter table public.ai_prompt_settings enable row level security;

-- AI prompt settings RLS - only superadmins can manage
create policy "Superadmins can manage AI prompts"
  on public.ai_prompt_settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'superadmin'));

-- Create trigger function for profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  return new;
end;
$$;

-- Trigger to auto-assign user role on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create trigger function for updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add updated_at triggers
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger biomarkers_updated_at
  before update on public.biomarkers
  for each row execute procedure public.handle_updated_at();

-- Seed biomarkers (50 items in Russian)
insert into public.biomarkers (name, code, unit, category, normal_min, normal_max, description) values
  -- Метаболизм и энергия
  ('Глюкоза натощак', 'GLUCOSE', 'ммоль/л', 'Метаболизм', 3.9, 5.6, 'Уровень сахара в крови натощак'),
  ('HbA1c', 'HBA1C', '%', 'Метаболизм', 4.0, 5.7, 'Гликированный гемоглобин'),
  ('Инсулин', 'INSULIN', 'мкЕд/мл', 'Метаболизм', 2.6, 24.9, 'Гормон регуляции глюкозы'),
  ('Гомоцистеин', 'HOMOCYSTEINE', 'мкмоль/л', 'Метаболизм', 5.0, 15.0, 'Маркер метаболизма метионина'),
  ('Лактат', 'LACTATE', 'ммоль/л', 'Метаболизм', 0.5, 2.2, 'Продукт анаэробного гликолиза'),
  ('Мочевая кислота', 'URIC_ACID', 'мкмоль/л', 'Метаболизм', 200, 420, 'Продукт обмена пуринов'),
  ('ЛДГ', 'LDH', 'Ед/л', 'Метаболизм', 135, 225, 'Лактатдегидрогеназа'),
  ('АСТ', 'AST', 'Ед/л', 'Метаболизм', 0, 40, 'Аспартатаминотрансфераза'),
  ('АЛТ', 'ALT', 'Ед/л', 'Метаболизм', 0, 41, 'Аланинаминотрансфераза'),
  ('ГГТ', 'GGT', 'Ед/л', 'Метаболизм', 0, 55, 'Гамма-глутамилтрансфераза'),
  
  -- Липиды
  ('Общий холестерин', 'TOTAL_CHOLESTEROL', 'ммоль/л', 'Липиды', 3.0, 5.2, 'Общий холестерин в крови'),
  ('ЛПНП', 'LDL', 'ммоль/л', 'Липиды', 0, 3.0, 'Липопротеины низкой плотности'),
  ('ЛПВП', 'HDL', 'ммоль/л', 'Липиды', 1.0, 999, 'Липопротеины высокой плотности'),
  ('Триглицериды', 'TRIGLYCERIDES', 'ммоль/л', 'Липиды', 0, 1.7, 'Триглицериды в крови'),
  ('Аполипопротеин A1', 'APO_A1', 'г/л', 'Липиды', 1.0, 1.8, 'Компонент ЛПВП'),
  ('Аполипопротеин B', 'APO_B', 'г/л', 'Липиды', 0.5, 1.3, 'Компонент ЛПНП'),
  
  -- Гормоны и стресс
  ('Тестостерон', 'TESTOSTERONE', 'нмоль/л', 'Гормоны', 8.0, 30.0, 'Мужской половой гормон'),
  ('Эстрадиол', 'ESTRADIOL', 'пмоль/л', 'Гормоны', 40, 160, 'Женский половой гормон'),
  ('DHEA-S', 'DHEA_S', 'мкг/дл', 'Гормоны', 80, 560, 'Дегидроэпиандростерон-сульфат'),
  ('Кортизол', 'CORTISOL', 'нмоль/л', 'Гормоны', 140, 690, 'Гормон стресса'),
  ('ТТГ', 'TSH', 'мЕд/л', 'Гормоны', 0.4, 4.0, 'Тиреотропный гормон'),
  ('Свободный T4', 'FREE_T4', 'пмоль/л', 'Гормоны', 9.0, 22.0, 'Свободный тироксин'),
  ('Свободный T3', 'FREE_T3', 'пмоль/л', 'Гормоны', 2.6, 5.7, 'Свободный трийодтиронин'),
  ('IGF-1', 'IGF_1', 'нг/мл', 'Гормоны', 100, 300, 'Инсулиноподобный фактор роста'),
  
  -- Воспаление и иммунитет
  ('С-реактивный белок', 'CRP', 'мг/л', 'Воспаление', 0, 5.0, 'Маркер воспаления'),
  ('Ферритин', 'FERRITIN', 'нг/мл', 'Воспаление', 30, 400, 'Запасы железа'),
  ('Альбумин', 'ALBUMIN', 'г/л', 'Воспаление', 35, 52, 'Основной белок плазмы'),
  ('Лейкоциты', 'WBC', '10^9/л', 'Иммунитет', 4.0, 9.0, 'Белые кровяные клетки'),
  ('Интерлейкин-6', 'IL_6', 'пг/мл', 'Воспаление', 0, 7.0, 'Провоспалительный цитокин'),
  ('TNF-альфа', 'TNF_ALPHA', 'пг/мл', 'Воспаление', 0, 8.1, 'Фактор некроза опухоли'),
  
  -- Витамины и микроэлементы
  ('Витамин D', 'VITAMIN_D', 'нг/мл', 'Витамины', 30, 100, '25-гидроксивитамин D'),
  ('Витамин B12', 'VITAMIN_B12', 'пмоль/л', 'Витамины', 148, 664, 'Кобаламин'),
  ('Фолиевая кислота', 'FOLATE', 'нмоль/л', 'Витамины', 10, 42, 'Витамин B9'),
  ('Магний', 'MAGNESIUM', 'ммоль/л', 'Микроэлементы', 0.7, 1.05, 'Важный минерал'),
  ('Цинк', 'ZINC', 'мкмоль/л', 'Микроэлементы', 10.7, 22.9, 'Микроэлемент для иммунитета'),
  ('Селен', 'SELENIUM', 'мкг/л', 'Микроэлементы', 70, 150, 'Антиоксидантный минерал'),
  ('Железо', 'IRON', 'мкмоль/л', 'Микроэлементы', 9.0, 30.0, 'Микроэлемент для транспорта кислорода'),
  ('Кальций', 'CALCIUM', 'ммоль/л', 'Микроэлементы', 2.15, 2.55, 'Минерал для костей'),
  ('Калий', 'POTASSIUM', 'ммоль/л', 'Микроэлементы', 3.5, 5.1, 'Электролит'),
  ('Натрий', 'SODIUM', 'ммоль/л', 'Микроэлементы', 136, 145, 'Основной электролит'),
  
  -- Антиоксиданты и маркеры старения
  ('Коэнзим Q10', 'COQ10', 'мкг/мл', 'Антиоксиданты', 0.5, 1.7, 'Митохондриальный кофактор'),
  ('Глутатион', 'GLUTATHIONE', 'мкмоль/л', 'Антиоксиданты', 900, 1600, 'Главный антиоксидант клетки'),
  ('Малоновый диальдегид', 'MDA', 'мкмоль/л', 'Старение', 0, 2.5, 'Маркер перекисного окисления'),
  ('Супероксиддисмутаза', 'SOD', 'Ед/мл', 'Антиоксиданты', 150, 250, 'Антиоксидантный фермент'),
  ('Каталаза', 'CATALASE', 'мкмоль/мин/мл', 'Антиоксиданты', 15, 40, 'Фермент разложения перекиси'),
  ('AGE', 'AGE', 'усл.ед.', 'Старение', 0, 100, 'Конечные продукты гликирования'),
  ('NAD+', 'NAD_PLUS', 'мкмоль/л', 'Антиоксиданты', 20, 100, 'Никотинамидадениндинуклеотид'),
  ('Креатинин', 'CREATININE', 'мкмоль/л', 'Метаболизм', 44, 106, 'Маркер функции почек'),
  ('Мочевина', 'UREA', 'ммоль/л', 'Метаболизм', 2.5, 7.5, 'Продукт белкового обмена'),
  ('Билирубин общий', 'TOTAL_BILIRUBIN', 'мкмоль/л', 'Метаболизм', 3.4, 20.5, 'Пигмент желчи');

-- Seed default AI prompts
insert into public.ai_prompt_settings (key, description, prompt_text) values
  ('analysis_summary_prompt', 'Системный промт для генерации общего резюме анализа', 
   'Ты эксперт по долголетию и здоровью. Проанализируй результаты анализов пользователя и создай краткое резюме на русском языке в дружелюбном и поддерживающем тоне. Объясни основные находки простым языком без медицинского жаргона. Сфокусируйся на позитивных трендах и конкретных рекомендациях. Никогда не ставь диагнозы.'),
  ('trends_summary_prompt', 'Системный промт для генерации описания трендов', 
   'Ты эксперт по анализу здоровья. Опиши динамику изменения показателей за указанный период на русском языке. Отметь, что улучшилось и что требует внимания. Используй простой и понятный язык.');