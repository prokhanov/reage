import { supabase } from "@/integrations/supabase/client";

/**
 * Фоновое распознавание препаратов: неизвестные названия отправляются в
 * edge-функцию, которая определяет действующее вещество через AI и пополняет
 * справочник. Ошибки намеренно игнорируются — это не должно ломать сохранение.
 */
export function resolveMedicationsInBackground(medications: unknown): void {
  const list = Array.isArray(medications)
    ? medications.map((m) => String(m).trim()).filter(Boolean)
    : [];
  if (list.length === 0) return;

  void supabase.functions
    .invoke("resolve-medications", { body: { medications: list } })
    .catch((e) => console.warn("[medications] resolve failed", e));
}
