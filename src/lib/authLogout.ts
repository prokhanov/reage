import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const LOGOUT_IN_PROGRESS_KEY = "reage_logout_in_progress";

const LOGOUT_FLAG_TTL_MS = 30_000;

type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "length" | "key">;

const getLogoutTimestamp = (storage: BrowserStorage | undefined): number | null => {
  if (!storage) return null;
  const raw = storage.getItem(LOGOUT_IN_PROGRESS_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
};

const markLogoutInStorage = () => {
  if (typeof window === "undefined") return;
  const value = String(Date.now());
  window.sessionStorage.setItem(LOGOUT_IN_PROGRESS_KEY, value);
  window.localStorage.setItem(LOGOUT_IN_PROGRESS_KEY, value);
};

export const clearLogoutInProgress = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
  window.localStorage.removeItem(LOGOUT_IN_PROGRESS_KEY);
};

export const isLogoutRedirect = (search = typeof window !== "undefined" ? window.location.search : "") => {
  if (new URLSearchParams(search).get("logout") === "1") return true;
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const timestamps = [
    getLogoutTimestamp(window.sessionStorage),
    getLogoutTimestamp(window.localStorage),
  ].filter((value): value is number => value !== null);

  return timestamps.some((timestamp) => now - timestamp < LOGOUT_FLAG_TTL_MS);
};

const shouldRemoveAuthKey = (key: string) => {
  const normalized = key.toLowerCase();
  return (
    normalized === "supabase.auth.token" ||
    normalized.includes("supabase.auth.token") ||
    (normalized.startsWith("sb-") && normalized.includes("auth-token"))
  );
};

const clearAuthStorage = (storage: Storage, label: string) => {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => !!key
  );
  const removedKeys = keys.filter(shouldRemoveAuthKey);
  removedKeys.forEach((key) => storage.removeItem(key));
  console.info("[auth-debug] cleared auth storage", { label, removedCount: removedKeys.length });
};

export const performSafeLogout = async (
  queryClient?: QueryClient,
  options?: { redirectTo?: string },
) => {
  console.info("[auth-debug] logout started");
  markLogoutInStorage();

  try {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error && !/session|missing|not found/i.test(error.message)) {
      console.warn("[auth-debug] logout signOut returned error", {
        message: error.message,
        name: error.name,
        status: error.status,
      });
    } else {
      console.info("[auth-debug] logout signOut completed", { hadIgnoredError: !!error });
    }
  } catch (error) {
    console.warn("[auth-debug] logout signOut threw", error);
  }

  if (typeof window !== "undefined") {
    clearAuthStorage(window.localStorage, "localStorage");
    clearAuthStorage(window.sessionStorage, "sessionStorage");
    markLogoutInStorage();
  }

  queryClient?.clear();
  const redirectTo = options?.redirectTo ?? "/auth?logout=1";
  console.info("[auth-debug] logout redirecting", { redirectTo });
  window.location.replace(redirectTo);
};