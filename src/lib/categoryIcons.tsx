import {
  Heart,
  Shield,
  Zap,
  RefreshCw,
  Brain,
  Moon,
  Smile,
  Utensils,
  Activity,
  Pill,
  Bone,
  Leaf,
  Droplet,
  Hourglass,
  Sparkles,
  Flame,
  Stethoscope,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

// Helper to wrap raw SVG paths into a Lucide-compatible icon
const makeIcon = (paths: React.ReactNode): LucideIcon =>
  (({ className, strokeWidth = 2, color = "currentColor", size = 24, ...props }: any) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {paths}
    </svg>
  )) as unknown as LucideIcon;

// Custom hormone molecule icon (matches landing page endocrine system)
export const HormoneMoleculeIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="5" cy="6" r="1.5" />
    <circle cx="19" cy="6" r="1.5" />
    <circle cx="5" cy="18" r="1.5" />
    <circle cx="19" cy="18" r="1.5" />
    <path d="M6.2 7.1l3.8 3.5" />
    <path d="M17.8 7.1l-3.8 3.5" />
    <path d="M6.2 16.9l3.8-3.5" />
    <path d="M17.8 16.9l-3.8-3.5" />
  </>
);

/**
 * Mapper: имя категории биомаркеров → Lucide-иконка.
 * Соответствует визуальному стилю лендинга (BiomarkersDeepDiveSection).
 */
const BIOMARKER_CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Сердечно-сосудистая система": Heart,
  "Воспалительная и иммунная система": Shield,
  "Эндокринная и стрессовая система": HormoneMoleculeIcon,
  "Метаболизм и Детоксикация": RefreshCw,
  "Метаболизм и детоксикация": RefreshCw,
  "Энергия и восстановление": Zap,
  // Legacy
  "Обмен веществ и детоксикация": RefreshCw,
  "Почки и водно-солевой баланс": Droplet,
};

/**
 * Mapper: имя категории симптомов → Lucide-иконка.
 */
const SYMPTOM_CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Энергия и фокус": Zap,
  "Общее состояние": Activity,
  "Сон": Moon,
  "Сон и восстановление": Moon,
  "Настроение": Smile,
  "Эмоции и стресс": Brain,
  "Пищеварение": Utensils,
  "Обмен веществ и вес": RefreshCw,
  "Сердце и сосуды": Heart,
  "Гормоны и либидо": HormoneMoleculeIcon,
  "Микроэлементы и кости": Bone,
  "Иммунитет и воспаление": Shield,
  "Витамины и антиоксиданты": Leaf,
  "Внешний вид": Sparkles,
  "Старение и долголетие": Hourglass,
  "Боли и дискомфорт": Flame,
};

/**
 * Универсальный геттер: ищет иконку и в биомаркерах, и в симптомах.
 * Возвращает `Activity` как fallback.
 */
export function getCategoryIcon(name: string | undefined | null): LucideIcon {
  if (!name) return Activity;
  return (
    BIOMARKER_CATEGORY_ICONS[name] ||
    SYMPTOM_CATEGORY_ICONS[name] ||
    Activity
  );
}

export function getBiomarkerCategoryIcon(name: string): LucideIcon {
  return BIOMARKER_CATEGORY_ICONS[name] || Activity;
}

export function getSymptomCategoryIcon(name: string): LucideIcon {
  return SYMPTOM_CATEGORY_ICONS[name] || Activity;
}

/** Иконка для общего рейтинга систем организма (заменяет 🏥). */
export const SystemRatingsIcon = HeartPulse;

/** Иконка для процентиля «Ваш результат». */
export { Stethoscope, Pill };
