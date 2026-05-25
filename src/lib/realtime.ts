/**
 * Realtime feature flag.
 *
 * Set `VITE_DISABLE_REALTIME=true` (env) or `localStorage['disable-realtime']='1'`
 * to skip all `supabase.channel(...)` subscriptions.
 *
 * Используется для диагностики проблем Safari + nginx reverse-proxy:
 * REST идёт нормально, а WebSocket-апгрейд через прокси может вешать UI.
 */
export const isRealtimeDisabled = (): boolean => {
  if (import.meta.env.VITE_DISABLE_REALTIME === "true") return true;
  try {
    if (typeof window !== "undefined" && window.localStorage?.getItem("disable-realtime") === "1") {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
};
