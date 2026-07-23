/**
 * Active-time tracker: fires Yandex.Metrika goals every N seconds of REAL user activity
 * (mouse move, scroll, clicks, keys, etc.). Idle time is not counted.
 *
 * Goals sent: `active_time_30`, `active_time_60`, `active_time_90`, ...
 */
declare global {
  interface Window {
    __uao_started?: boolean;
    uao_settings?: unknown;
    ym?: (...args: unknown[]) => void;
    dataLayer?: Array<Record<string, unknown>>;
  }
}

const UAO_COUNT = "uao_count";
const UAO_GLOBAL_COUNT = "uao_global_count";

interface Settings {
  interval: number;
  checkInterval: number;
  ym: number;
  ym_period_goal_prefix: string;
  data_layer_prefix: string;
  callback?: (seconds: number) => void;
}

const EVENTS = [
  "touchmove", "blur", "focus", "focusin", "focusout", "resize", "scroll",
  "click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseover",
  "mouseout", "mouseenter", "mouseleave", "change", "select", "submit",
  "keydown", "keypress", "keyup", "error", "load",
];

export function initActiveTimeTracker() {
  if (typeof window === "undefined") return;
  if (window.__uao_started) return;
  window.__uao_started = true;

  const settings: Settings = {
    interval: 30,
    checkInterval: 5,
    ym: 109706546,
    ym_period_goal_prefix: "active_time_",
    data_layer_prefix: "active_time_",
  };

  const targetCount = Math.ceil(settings.interval / settings.checkInterval);
  let commit = false;

  EVENTS.forEach((evt) => {
    window.addEventListener(evt, (e) => {
      if ((e as Event).isTrusted) commit = true;
    }, { passive: true });
  });

  if (+(sessionStorage.getItem(UAO_COUNT) ?? 0) <= 0) sessionStorage.setItem(UAO_COUNT, "0");
  if (+(sessionStorage.getItem(UAO_GLOBAL_COUNT) ?? 0) <= 0) sessionStorage.setItem(UAO_GLOBAL_COUNT, "0");

  const tick = () => {
    if (commit) {
      let currentCount = +(sessionStorage.getItem(UAO_COUNT) ?? 0) + 1;
      sessionStorage.setItem(UAO_COUNT, String(currentCount));
      let globalCount = +(sessionStorage.getItem(UAO_GLOBAL_COUNT) ?? 0) + 1;
      sessionStorage.setItem(UAO_GLOBAL_COUNT, String(globalCount));

      if (currentCount === targetCount) {
        const globalSeconds = globalCount * settings.checkInterval;
        try {
          if (window.ym) {
            window.ym(settings.ym, "reachGoal", `${settings.ym_period_goal_prefix}${globalSeconds}`);
          }
          if (window.dataLayer) {
            window.dataLayer.push({ event: `${settings.data_layer_prefix}${globalSeconds}` });
          }
          settings.callback?.(globalSeconds);
        } catch {
          /* noop */
        }
        sessionStorage.setItem(UAO_COUNT, "0");
      }
    }
    commit = false;
  };

  window.setInterval(tick, settings.checkInterval * 1000);
}
