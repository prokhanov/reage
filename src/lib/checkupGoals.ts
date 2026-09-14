/**
 * Цели Яндекс.Метрики для воронки оплаты чекапов.
 * Для каждого шага отправляем пару целей: по направлению (<slug>_...) и общую (checkup_...).
 */
import { CHECKUPS } from "@/data/checkups";
import { reachGoal } from "@/lib/yandexMetrika";

const ORDER_KEY = "reage:checkup:lastOrder";
const SENT_PREFIX = "reage:checkup:goalSent:";

type StoredOrder = { invId: string; slug: string };

/** Запоминаем, какой чекап оплачивается, чтобы узнать его на странице возврата. */
export function rememberCheckupOrder(invId: string | null, slug: string) {
  try {
    const payload: StoredOrder = { invId: invId ?? "", slug };
    localStorage.setItem(ORDER_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

/** Достаём slug заказа: сперва из памяти браузера, затем по bundle из БД. */
export function resolveCheckupSlug(invId: string | null, bundle?: string | null): string | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as StoredOrder;
      if (stored?.slug && (!invId || !stored.invId || stored.invId === invId)) return stored.slug;
    }
  } catch {
    /* noop */
  }
  if (bundle) {
    const match = CHECKUPS.find((c) => c.bundle === bundle || c.slug === bundle);
    if (match) return match.slug;
  }
  return null;
}

/** Достаём номер заказа из платёжного URL Робокассы. */
export function invIdFromPaymentUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("InvId");
  } catch {
    return null;
  }
}

function send(slug: string | null, suffix: string) {
  if (slug) reachGoal(`${slug.replace(/-/g, "_")}_${suffix}`);
  reachGoal(`checkup_${suffix}`);
}

export function goalPaymentClick(slug: string) {
  send(slug, "payment_click");
}

/** Отправляем один раз на заказ (страница возврата может опрашивать статус повторно). */
function sendOnce(key: string, slug: string | null, suffix: string) {
  try {
    const storageKey = `${SENT_PREFIX}${suffix}:${key}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    /* noop */
  }
  send(slug, suffix);
}

export function goalPaid(invId: string | null, bundle?: string | null) {
  sendOnce(invId ?? "unknown", resolveCheckupSlug(invId, bundle), "paid");
}

export function goalPaymentFailed(invId: string | null, bundle?: string | null) {
  sendOnce(invId ?? "unknown", resolveCheckupSlug(invId, bundle), "payment_failed");
}
