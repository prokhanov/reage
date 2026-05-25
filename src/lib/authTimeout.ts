import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * Обёртка над supabase.auth.getSession() с таймаутом.
 * Если backend (Lovable Cloud / GoTrue / HAProxy) перезапускается или сетевой
 * вызов зависает, мы не блокируем рендер UI бесконечным спиннером.
 */
export async function getSessionWithTimeout(
  timeoutMs = 2500
): Promise<{ session: Session | null; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<{ session: null; timedOut: true }>(
    (resolve) => {
      timer = setTimeout(() => resolve({ session: null, timedOut: true }), timeoutMs);
    }
  );

  const sessionPromise = supabase.auth
    .getSession()
    .then(({ data }) => ({ session: data.session, timedOut: false }))
    .catch(() => ({ session: null as Session | null, timedOut: false }));

  const result = await Promise.race([sessionPromise, timeoutPromise]);
  if (timer) clearTimeout(timer);
  return result;
}

/**
 * Универсальная обёртка с таймаутом для любых асинхронных операций
 * (включая supabase-запросы). Возвращает { value, timedOut, error }.
 * Никогда не бросает — всегда даёт UI шанс показать fallback.
 */
export async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number
): Promise<{ value: T | null; timedOut: boolean; error: unknown }> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<{ value: null; timedOut: true; error: null }>(
    (resolve) => {
      timer = setTimeout(
        () => resolve({ value: null, timedOut: true, error: null }),
        timeoutMs
      );
    }
  );

  const wrapped = Promise.resolve(promise)
    .then((value) => ({ value, timedOut: false, error: null as unknown }))
    .catch((error) => ({ value: null as T | null, timedOut: false, error }));

  const result = await Promise.race([wrapped, timeoutPromise]);
  if (timer) clearTimeout(timer);
  return result;
}
