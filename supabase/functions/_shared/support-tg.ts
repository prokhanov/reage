// Helpers for the website support chat bridged to a Telegram forum group.
export async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.ok) {
    console.error(`telegram ${method} failed [${resp.status}]`, JSON.stringify(data));
  }
  return { ok: resp.ok && !!data?.ok, data };
}

export function esc(s: unknown): string {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
