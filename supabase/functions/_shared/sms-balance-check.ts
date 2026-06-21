// Checks SMS Aero balance after sending an SMS and notifies Telegram if below threshold.
// Designed to never throw — call from EdgeRuntime.waitUntil(...).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";
import { checkAuth } from "./smsaero.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export async function checkBalanceAndNotify(): Promise<void> {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) return;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: settings } = await admin
      .from("telegram_notification_settings")
      .select("low_balance_alerts_enabled, low_balance_threshold, internal_secret, is_active, bot_token, chat_id")
      .eq("singleton", true)
      .maybeSingle();

    if (!settings) return;
    if (!settings.low_balance_alerts_enabled) return;
    if (!settings.is_active || !settings.bot_token || !settings.chat_id) return;

    const threshold = Number(settings.low_balance_threshold ?? 0);
    if (!isFinite(threshold) || threshold <= 0) return;

    const auth = await checkAuth();
    if (!auth.ok || typeof auth.balance !== "number") return;
    if (auth.balance >= threshold) return;

    await fetch(`${SUPABASE_URL}/functions/v1/telegram-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": settings.internal_secret,
      },
      body: JSON.stringify({
        event_type: "sms_low_balance",
        payload: {
          balance: auth.balance,
          threshold,
        },
      }),
    });
  } catch (err) {
    console.error("checkBalanceAndNotify error", err);
  }
}
