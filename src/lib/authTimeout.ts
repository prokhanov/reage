import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/**
 * Обёртка над supabase.auth.getSession() с таймаутом.
 * Если backend (Lovable Cloud / GoTrue) перезапускается или сетевой вызов
 * зависает, мы не блокируем рендер UI бесконечным спиннером.
 *
 * При таймауте возвращаем session: null — вызывающий код решает, что делать
 * (показать публичный лендинг или редиректить на /auth).
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
