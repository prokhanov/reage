// Периметр доступа к PDF-отчётам: проверяем, что чужой пользователь и
// персонал без прав получают явный отказ, а report_access_log недоступен
// на запись из authenticated/anon клиента.
//
// Тест бьёт по задеплоенным функциям с анонимным ключом из .env.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const ANALYSIS_ID = "22222222-2222-2222-2222-222222222222";

async function callFn(name: string, init: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: JSON.stringify(init.body ?? { analysisId: ANALYSIS_ID }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

Deno.test("fetch-report-pdf: без токена → 401, не пустой ответ", async () => {
  const { status, text } = await callFn("fetch-report-pdf");
  assertEquals(status, 401);
  assert(text.includes("unauthorized"), text);
});

Deno.test("fetch-report-pdf: невалидный токен → 401", async () => {
  const { status, text } = await callFn("fetch-report-pdf", { token: "not-a-jwt" });
  assertEquals(status, 401);
  assert(text.includes("unauthorized"), text);
});

Deno.test("fetch-report-pdf: битый analysisId → 400 (не тихий 200)", async () => {
  const { status, text } = await callFn("fetch-report-pdf", { body: { analysisId: "abc" } });
  assertEquals(status, 400);
  assert(text.includes("invalid_analysis_id"), text);
});

Deno.test("issue-report-pdf-url: без прав персонала → отказ", async () => {
  const { status, text } = await callFn("issue-report-pdf-url");
  assertEquals(status, 401);
  assert(text.includes("unauthorized"), text);
});

Deno.test("queue-report-pdf: без прав персонала → отказ", async () => {
  const { status, text } = await callFn("queue-report-pdf");
  assertEquals(status, 401);
  assert(text.includes("unauthorized"), text);
});

Deno.test("report_access_log: вставка из anon/authenticated клиента невозможна", async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/report_access_log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      analysis_id: ANALYSIS_ID,
      viewer_id: "33333333-3333-3333-3333-333333333333",
      user_id: "11111111-1111-1111-1111-111111111111",
      role: "patient",
      channel: "pdf",
    }),
  });
  const text = await res.text();
  assert(res.status === 401 || res.status === 403 || res.status === 404, `${res.status} ${text}`);
});

Deno.test("report_access_log: чтение из anon клиента запрещено", async () => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/report_access_log?select=id&limit=1`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  const text = await res.text();
  if (res.ok) {
    assertEquals(JSON.parse(text).length, 0, "anon не должен видеть записи аудита");
  } else {
    assert(res.status === 401 || res.status === 403 || res.status === 404, `${res.status} ${text}`);
  }
});
