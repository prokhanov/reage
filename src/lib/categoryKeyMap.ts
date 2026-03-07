export const CATEGORY_KEY_MAP: Record<string, string> = {
  "Энергия и восстановление": "energy",
  "Сердечно-сосудистая система": "cardiovascular",
  "Воспалительная и иммунная система": "inflammation",
  "Эндокринная и стрессовая система": "endocrine",
  "Обмен веществ и детоксикация": "metabolism",
  "Почки и водно-солевой баланс": "kidneys"
};

export function getCategoryKey(categoryName: string): string {
  return CATEGORY_KEY_MAP[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '_');
}
