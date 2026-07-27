export const YM_COUNTER_ID = 109706546;

export function reachGoal(goal: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const ym = window.ym;
  if (typeof ym !== "function") {
    // Snippet in index.html initializes window.ym as a queue function immediately,
    // so this branch means the counter snippet failed to load at all.
    console.debug("[ym] reachGoal skipped, window.ym is not available", { goal });
    return;
  }
  try {
    if (params) {
      ym(YM_COUNTER_ID, "reachGoal", goal, params);
    } else {
      ym(YM_COUNTER_ID, "reachGoal", goal);
    }
    console.debug("[ym] reachGoal sent", { counterId: YM_COUNTER_ID, goal, params });
  } catch (err) {
    console.debug("[ym] reachGoal threw", { goal, err });
  }
}

export function tgpEvent(eventId: string) {
  if (typeof window === "undefined") return;
  const tgp = window.tgp;
  if (typeof tgp !== "function") {
    console.debug("[tgp] event skipped, window.tgp is not available", { eventId });
    return;
  }
  try {
    tgp("event", eventId);
  } catch (err) {
    console.debug("[tgp] event threw", { eventId, err });
  }
}

export function tmrEvent(goal: string) {
  console.log("[vk] tmrEvent called", { goal });
  if (typeof window === "undefined") {
    console.log("[vk] no window (SSR?)", { goal });
    return;
  }
  const tmr = window._tmr as unknown as { push?: (...args: unknown[]) => void; length?: number } | undefined;
  const state = {
    exists: typeof tmr !== "undefined",
    isArray: Array.isArray(tmr),
    hasPush: !!(tmr && typeof tmr.push === "function"),
    length: tmr && typeof tmr.length === "number" ? tmr.length : undefined,
  };
  console.log("[vk] _tmr state", state);
  if (!tmr || typeof tmr.push !== "function") {
    console.warn("[vk] _tmr not ready, event dropped", { goal });
    return;
  }
  const payload = { type: "reachGoal", id: 3780512, goal };
  try {
    console.log("[vk] pushing", payload);
    tmr.push(payload);
    console.log("[vk] push ok", { goal });
  } catch (err) {
    console.error("[vk] push threw", { goal, err });
  }
}

