import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/phone";
import type { RegisterFormData } from "@/pages/Register";

/**
 * Единая точка сохранения анкеты онбординга.
 * Пишет профиль, историю веса и мед. историю, ставит onboarding_completed=true.
 * Дубликаты в medical_history не создаются: перед вставкой всё чистим.
 */
export async function saveOnboardingData(
  userId: string,
  data: RegisterFormData,
  opts?: {
    /** Не ставить onboarding_completed=true (для пошагового сохранения). */
    skipComplete?: boolean;
    /** Пометить факт пропуска шага. */
    markSkipped?: boolean;
    /** Паспортные данные. */
    passportSeries?: string;
    passportNumber?: string;
  },
): Promise<void> {
  const fullName = `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim();
  const profileUpdate: Record<string, any> = {};

  // Заполненные поля обновляем; пустые НЕ трогаем, чтобы не затирать ранее сохранённые значения.
  if (data.gender) profileUpdate.gender = data.gender;
  if (data.birth_date) profileUpdate.birth_date = format(data.birth_date, "yyyy-MM-dd");
  if (data.weight) profileUpdate.weight = Number(data.weight);
  if (data.height) profileUpdate.height = Number(data.height);
  if (data.healthNote?.trim()) profileUpdate.health_note = data.healthNote.trim();

  if (!opts?.skipComplete) profileUpdate.onboarding_completed = true;
  if (opts?.markSkipped) profileUpdate.onboarding_skipped_at = new Date().toISOString();

  if (data.lastName?.trim()) profileUpdate.last_name = data.lastName.trim();
  if (data.firstName?.trim()) {
    profileUpdate.first_name = data.firstName.trim();
    profileUpdate.name = fullName || data.firstName.trim();
  }
  if (data.phone) profileUpdate.phone = normalizePhone(data.phone);
  if (data.operations && Object.keys(data.operations).length > 0) {
    profileUpdate.operations = data.operations;
  }
  if (data.medications && data.medications.length > 0) {
    profileUpdate.medications = data.medications;
  }
  if (opts?.passportSeries) {
    profileUpdate.passport_series = opts.passportSeries.replace(/\D/g, "");
  }
  if (opts?.passportNumber) {
    profileUpdate.passport_number = opts.passportNumber.replace(/\D/g, "");
  }

  const { error: profileErr } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);
  if (profileErr) throw profileErr;

  // Вес — добавляем запись только если изменился (проверка последней записи).
  if (data.weight) {
    const weightNum = Number(data.weight);
    const { data: last } = await supabase
      .from("weight_history")
      .select("weight")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last || Number((last as any).weight) !== weightNum) {
      await supabase.from("weight_history").insert({
        user_id: userId,
        weight: weightNum,
      });
    }
  }

  // Мед. история — перезаписываем целиком, чтобы избежать дублей и осиротевших записей.
  await supabase.from("medical_history").delete().eq("user_id", userId);
  if (data.medicalHistory && data.medicalHistory.length > 0) {
    const rows = data.medicalHistory
      .map((item) => {
        const parts = item.split("|");
        if (parts.length < 2) return null;
        return {
          user_id: userId,
          category: parts[0],
          condition: parts.slice(1).join("|"),
        };
      })
      .filter(Boolean) as { user_id: string; category: string; condition: string }[];
    if (rows.length > 0) {
      await supabase.from("medical_history").insert(rows);
    }
  }
}
