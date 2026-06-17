// Shared constants for the medical "анкета" used at registration and in profile editing.
// Keep these in sync with RegisterStep3.

export const CHRONIC_CATEGORY = "Хронические заболевания";

export const CHRONIC_CHIPS = [
  "Сахарный диабет",
  "Гипертония",
  "Анемия",
  "ХБП (почки)",
  "Заболевания щитовидной железы",
  "Заболевания печени",
  "Сердечная недостаточность",
  "Аутоиммунные заболевания",
  "Нет хронических заболеваний",
];

export const MEDICATIONS_CHIPS = [
  "Антибиотики",
  "Антикоагулянты (варфарин, ксарелто и др.)",
  "Гормоны / контрацептивы",
  "Глюкокортикоиды (преднизолон и др.)",
  "НПВС (аспирин, ибупрофен)",
  "Мочегонные",
  "Иммуносупрессоры",
  "Химиотерапия",
  "Витамин С > 1г/сут",
  "Биодобавки / БАД",
  "Ничего из перечисленного",
];

export const OPERATIONS: { key: string; label: string }[] = [
  { key: "surgery_year", label: "Операции за последний год" },
  { key: "transfusion_3m", label: "Переливание крови за последние 3 мес." },
  { key: "donation_3m", label: "Сдавали кровь как донор < 3 мес." },
  { key: "vaccination_2w", label: "Вакцинация за последние 2 недели" },
];
