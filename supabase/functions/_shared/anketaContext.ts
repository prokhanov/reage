import { buildMedicationFacts } from "./medications.ts";

// Формирование текстового блока "анкета пациента" для AI-контекста:
// препараты и добавки, операции/процедуры, дополнительные заметки о здоровье.

const OPERATION_LABELS: Record<string, string> = {
  surgery_year: "Операции за последний год",
  transfusion_3m: "Переливание крови за последние 3 мес.",
  donation_3m: "Сдавали кровь как донор < 3 мес.",
  vaccination_2w: "Вакцинация за последние 2 недели",
};

export interface AnketaProfileLike {
  medications?: unknown;
  operations?: unknown;
  health_note?: unknown;
}

export function buildMedicationsText(profile: AnketaProfileLike | null | undefined): string {
  const meds = Array.isArray(profile?.medications)
    ? (profile!.medications as unknown[]).map((m) => String(m).trim()).filter(Boolean)
    : [];
  if (meds.length === 0) return "  Не указаны";
  return meds.map((m) => `  - ${m}`).join("\n");
}

export function buildOperationsText(profile: AnketaProfileLike | null | undefined): string {
  const ops = (profile?.operations && typeof profile.operations === "object")
    ? (profile.operations as Record<string, unknown>)
    : {};
  const lines: string[] = [];
  for (const [key, label] of Object.entries(OPERATION_LABELS)) {
    const v = ops[key];
    if (v === true) {
      let line = `  - ${label}: ДА`;
      if (key === "surgery_year" && typeof ops.surgery_year_details === "string" && ops.surgery_year_details.trim()) {
        line += ` (${ops.surgery_year_details.trim()})`;
      }
      lines.push(line);
    }
  }
  if (lines.length === 0) return "  Нет значимых вмешательств за последний год";
  return lines.join("\n");
}

export function buildHealthNoteText(profile: AnketaProfileLike | null | undefined): string {
  const note = typeof profile?.health_note === "string" ? profile.health_note.trim() : "";
  return note ? `  ${note}` : "  Не указана";
}

/** Готовый блок для вставки в промпт. */
export function buildAnketaContext(profile: AnketaProfileLike | null | undefined): string {
  return `ПРЕПАРАТЫ И ДОБАВКИ (принимает сейчас):
${buildMedicationsText(profile)}

ОПЕРАЦИИ И ПРОЦЕДУРЫ:
${buildOperationsText(profile)}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ О ЗДОРОВЬЕ (со слов пациента):
${buildHealthNoteText(profile)}

ВАЖНО ПРИ ИНТЕРПРЕТАЦИИ:
- Сначала анализируй биомаркеры по стандартным референсным диапазонам и патофизиологии; строй основной вывод на их значениях. Влияние препаратов и анамнеза — только как дополнительное объяснение или уточняющий фактор, а не как единственная причина отклонения.
- Обязательно учитывай принимаемые препараты и добавки: они могут напрямую менять показатели (например, антикоагулянты — коагулограмма; глюкокортикоиды — глюкоза, лейкоциты; иммуносупрессоры — лейкоциты, печёночные ферменты; препараты железа/витамины — соответствующие маркеры).
- Если несколько препаратов влияют на один показатель в противоположных направлениях (например, один повышает, другой понижает глюкозу), не пытайся вычислить «итоговый» эффект и не выбирай одно объяснение. Опиши вклад каждого препарата отдельно и укажи, что интерпретация показателя усложняется их сочетанием; основной вывод должен оставаться на значениях биомаркера.
- Не назначай препарат/добавку, которую пациент уже принимает, без явного указания на коррекцию дозы или отмену; избегай дублирования и опасных сочетаний.
- Недавние операции, переливание крови, донорство и вакцинация могут искажать воспалительные маркеры, показатели крови и железа — упоминай это при объяснении отклонений.
- Дополнительную информацию о здоровье учитывай как контекст жалоб и образа жизни.`;
}

/**
 * Асинхронный вариант: подставляет факты о препаратах из справочника
 * medication_dictionary (действующее вещество, группа, влияние на биомаркеры).
 */
export async function buildAnketaContextAsync(
  supabase: { from: (t: string) => any } | null | undefined,
  profile: AnketaProfileLike | null | undefined,
): Promise<string> {
  const base = buildAnketaContext(profile);
  if (!supabase) return base;
  try {
    const facts = await buildMedicationFacts(supabase, profile?.medications);
    return base.replace(
      `ПРЕПАРАТЫ И ДОБАВКИ (принимает сейчас):\n${buildMedicationsText(profile)}`,
      `ПРЕПАРАТЫ И ДОБАВКИ (принимает сейчас):\n${facts}`,
    );
  } catch (_e) {
    return base;
  }
}
