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

/**
 * Запускает асинхронную операцию с таймаутом и одним автоматическим ретраем
 * при сетевом сбое. Используется в route-гвардах, чтобы разовый 503/таймаут
 * прокси не отправлял пользователя в экран «Повторить».
 */
export async function withTimeoutAndRetry<T>(
  factory: () => PromiseLike<T>,
  options: { timeoutMs?: number; retries?: number; label?: string } = {}
): Promise<{ value: T | null; timedOut: boolean; error: unknown; attempts: number }> {
  const { timeoutMs = 15000, retries = 1, label = "request" } = options;
  let lastResult: { value: T | null; timedOut: boolean; error: unknown } = {
    value: null,
    timedOut: false,
    error: null,
  };

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    lastResult = await withTimeout(factory(), timeoutMs);
    if (!lastResult.timedOut && !lastResult.error) {
      return { ...lastResult, attempts: attempt };
    }
    // Логируем каждую неудачную попытку — поможет в проде увидеть причину.
    // eslint-disable-next-line no-console
    console.warn(
      `[withTimeoutAndRetry] "${label}" attempt ${attempt}/${retries + 1} failed`,
      {
        timedOut: lastResult.timedOut,
        error: lastResult.error,
      }
    );
    if (attempt <= retries) {
      // Небольшая пауза перед повтором.
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return { ...lastResult, attempts: retries + 1 };
}

/** Формирует читаемую техническую причину для dev-режима. */
export function describeFailure(
  label: string,
  res: { timedOut: boolean; error: unknown }
): string {
  if (res.timedOut) return `${label}: timeout (>15s)`;
  const err = res.error as { message?: string; code?: string; status?: number } | null;
  const parts = [
    err?.code ? `code=${err.code}` : null,
    err?.status ? `status=${err.status}` : null,
    err?.message ? `message=${err.message}` : null,
  ].filter(Boolean);
  return `${label}: ${parts.join(" • ") || "unknown error"}`;
}

