export const YM_COUNTER_ID = 109706546;

export function reachGoal(goal: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof window.ym === "function") {
    window.ym(YM_COUNTER_ID, "reachGoal", goal, params);
  }
}
