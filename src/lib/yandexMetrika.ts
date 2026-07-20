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
