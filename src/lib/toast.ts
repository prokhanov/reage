/**
 * Единая обёртка над `sonner` для всех тостов проекта.
 * Никаких других систем уведомлений (shadcn `useToast`, прямые `toast` из sonner)
 * в коде быть не должно — только `notify`.
 */
import { toast as sonnerToast, type ExternalToast } from "sonner";
import { translateError } from "./errorMessages";

type Description = string | undefined;
type ErrorInput = unknown;

function show(
  kind: "success" | "error" | "info" | "warning",
  title: string,
  description?: Description,
  opts?: ExternalToast,
) {
  const payload: ExternalToast = { description, ...opts };
  return sonnerToast[kind](title, payload);
}

export const notify = {
  success: (title: string, description?: Description, opts?: ExternalToast) =>
    show("success", title, description, opts),

  info: (title: string, description?: Description, opts?: ExternalToast) =>
    show("info", title, description, opts),

  warning: (title: string, description?: Description, opts?: ExternalToast) =>
    show("warning", title, description, opts),

  /**
   * Для ошибок. Второй аргумент может быть либо готовым русским текстом,
   * либо объектом ошибки — в этом случае он автоматически переводится.
   */
  error: (
    title: string,
    errorOrDescription?: ErrorInput,
    opts?: ExternalToast & { fallback?: string },
  ) => {
    const { fallback, ...rest } = opts ?? {};
    let description: string | undefined;
    if (errorOrDescription != null) {
      // Для отладки оставляем оригинал в консоли.
      if (typeof errorOrDescription === "object") {
        // eslint-disable-next-line no-console
        console.error(`[notify.error] ${title}:`, errorOrDescription);
      }
      description = translateError(errorOrDescription, fallback ?? "");
      if (!description) description = undefined;
    }
    return show("error", title, description, rest);
  },

  message: (title: string, description?: Description, opts?: ExternalToast) =>
    sonnerToast(title, { description, ...opts }),

  promise: sonnerToast.promise.bind(sonnerToast),
  loading: sonnerToast.loading.bind(sonnerToast),
  dismiss: sonnerToast.dismiss.bind(sonnerToast),
};

export type Notify = typeof notify;
