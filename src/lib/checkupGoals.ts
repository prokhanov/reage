/**
 * Цели Яндекс.Метрики для воронки оплаты чекапов.
 * Для каждого шага отправляем цель по каждому чекапу заказа (<slug>_...) и одну общую (checkup_...).
 */
import { CHECKUPS } from "@/data/checkups";
import { reachGoal } from "@/lib/yandexMetrika";

const ORDER_KEY = "reage:checkup:lastOrder";
const SENT_PREFIX = "reage:checkup:goalSent:";

type StoredOrder = { invId: string; slug?: string; slugs?: string[] };

/** Запоминаем, какие чекапы оплачиваются, чтобы узнать их на странице возврата. */
export function rememberCheckupOrder(invId: string | null, slugs: string[] | string) {
  try {
    const list = Array.isArray(slugs) ? slugs : [slugs];
    const payload: StoredOrder = { invId: invId ?? "", slug: list[0], slugs: list };
    localStorage.setItem(ORDER_KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

function slugFromBundle(bundle: string): string | null {
  const match = CHECKUPS.find((c) => c.bundle === bundle || c.slug === bundle);
  return match ? match.slug : null;
}

/** Достаём slug'и заказа: сперва из памяти браузера, затем по bundle из БД. */
export function resolveCheckupSlugs(
  invId: string | null,
  bundle?: string | null,
  bundles?: string[] | null,
): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as StoredOrder;
      const list = stored?.slugs?.length ? stored.slugs : stored?.slug ? [stored.slug] : [];
      if (list.length && (!invId || !stored.invId || stored.invId === invId)) return list;
    }
  } catch {
    /* noop */
  }
  const source = bundles?.length ? bundles : bundle ? [bundle] : [];
  return source.map(slugFromBundle).filter((s): s is string => Boolean(s));
}

/** Совместимость: один slug заказа. */
export function resolveCheckupSlug(invId: string | null, bundle?: string | null): string | null {
  return resolveCheckupSlugs(invId, bundle)[0] ?? null;
}

/** Достаём номер заказа из платёжного URL Робокассы. */
export function invIdFromPaymentUrl(url: string): string | null {
  try {
    return new URL(url).searchParams.get("InvId");
  } catch {
    return null;
  }
}

function send(slugs: string[], suffix: string) {
  for (const slug of slugs) reachGoal(`${slug.replace(/-/g, "_")}_${suffix}`);
  reachGoal(`checkup_${suffix}`);
}

export function goalPaymentClick(slugs: string[] | string) {
  send(Array.isArray(slugs) ? slugs : [slugs], "payment_click");
}

/** Отправляем один раз на заказ (страница возврата может опрашивать статус повторно). */
function sendOnce(key: string, slugs: string[], suffix: string) {
  try {
    const storageKey = `${SENT_PREFIX}${suffix}:${key}`;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    /* noop */
  }
  send(slugs, suffix);
}

export function goalPaid(invId: string | null, bundle?: string | null, bundles?: string[] | null) {
  sendOnce(invId ?? "unknown", resolveCheckupSlugs(invId, bundle, bundles), "paid");
}

export function goalPaymentFailed(
  invId: string | null,
  bundle?: string | null,
  bundles?: string[] | null,
) {
  sendOnce(invId ?? "unknown", resolveCheckupSlugs(invId, bundle, bundles), "payment_failed");
}
