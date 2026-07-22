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
  if (typeof window === "undefined") return;
  const tmr = window._tmr;
  if (typeof tmr !== "object" || typeof tmr.push !== "function") {
    console.debug("[tmr] reachGoal skipped, window._tmr is not available", { goal });
    return;
  }
  try {
    tmr.push({ type: "reachGoal", id: 3780512, goal });
  } catch (err) {
    console.debug("[tmr] reachGoal threw", { goal, err });
  }
}

