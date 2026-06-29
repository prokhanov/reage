/**
 * Backward-compatible shim. Все вызовы `toast({...})` и `useToast()` из старого
 * shadcn-toast API теперь маршрутизируются в единый `notify` (sonner). Это даёт
 * один внешний вид, одну логику и автоматический перевод английских ошибок.
 *
 * Новый код должен использовать `import { notify } from "@/lib/toast"`.
 */
import * as React from "react";
import { notify } from "@/lib/toast";
import { translateError } from "@/lib/errorMessages";

type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

type ToastInput = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
  action?: React.ReactNode;
  // прочие поля игнорируются — оставляем для совместимости с типами
  [key: string]: unknown;
};

function toReactNodeToString(value: React.ReactNode): string | undefined {
  if (value == null || value === false) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function toast(input: ToastInput = {}) {
  const titleStr = toReactNodeToString(input.title) ?? "";
  const descStr = toReactNodeToString(input.description);
  const opts = input.duration ? { duration: input.duration } : undefined;

  const variant = input.variant ?? "default";

  if (variant === "destructive") {
    // Прогоняем description через словарь, чтобы английские error.message
    // не утекали к пользователю.
    notify.error(titleStr || "Ошибка", descStr, opts);
  } else if (variant === "success") {
    notify.success(titleStr, descStr, opts);
  } else if (variant === "warning") {
    notify.warning(titleStr, descStr, opts);
  } else if (variant === "info") {
    notify.info(titleStr, descStr, opts);
  } else {
    // default — короткое нейтральное сообщение
    if (descStr) {
      notify.message(titleStr, descStr, opts);
    } else {
      // Если в title уже сидит "Ошибка..." — считаем destructive по эвристике.
      const lower = titleStr.toLowerCase();
      if (/ошибк|не удалось|не получилось/i.test(lower)) {
        notify.error(titleStr, undefined, opts);
      } else {
        notify.success(titleStr, undefined, opts);
      }
    }
  }

  return {
    id: "",
    dismiss: () => notify.dismiss(),
    update: () => {},
  };
}

function useToast() {
  return {
    toast,
    dismiss: (id?: string) => notify.dismiss(id),
    toasts: [] as never[],
  };
}

export { useToast, toast };
// Реэкспорт на случай если где-то используется напрямую.
export { translateError };
