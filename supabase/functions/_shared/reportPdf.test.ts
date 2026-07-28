// Тесты пайплайна серверного PDF: хэш/дедупликация/аудит.
// Chromium не требуется — проверяем чистую логику и стабы БД.

import {
  assert,
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  RENDERER_VERSION,
  THEME_VERSION,
  canonicalJSON,
  computeReportPdfHash,
  logReportAccess,
  reportPdfPath,
} from "./reportPdf.ts";

const BLOCKS = [
  { type: "section", id: "s1", title: "Липиды", body: "<p>Текст</p>" },
  { type: "biomarker", id: "b1", code: "LDL", value: 3.1 },
];

// Те же данные, но с другим порядком ключей и элементов объекта.
const BLOCKS_REORDERED_KEYS = [
  { id: "s1", body: "<p>Текст</p>", title: "Липиды", type: "section" },
  { value: 3.1, code: "LDL", id: "b1", type: "biomarker" },
];

// ── 1. Идемпотентность хэша ────────────────────────────────────────────────

Deno.test("hash: одинаковый контент → одинаковый хэш (повторная публикация не рендерит)", async () => {
  const a = await computeReportPdfHash(BLOCKS);
  const b = await computeReportPdfHash(structuredClone(BLOCKS));
  assertEquals(a, b);
});

Deno.test("hash: порядок ключей в JSON не влияет на хэш", async () => {
  assertEquals(
    await computeReportPdfHash(BLOCKS),
    await computeReportPdfHash(BLOCKS_REORDERED_KEYS),
  );
});

Deno.test("hash: изменение контента меняет хэш", async () => {
  const changed = structuredClone(BLOCKS);
  (changed[0] as Record<string, unknown>).body = "<p>Другой текст</p>";
  assertNotEquals(await computeReportPdfHash(BLOCKS), await computeReportPdfHash(changed));
});

Deno.test("canonicalJSON: детерминированная сортировка ключей", () => {
  assertEquals(canonicalJSON({ b: 1, a: [2, { d: 3, c: 4 }] }), '{"a":[2,{"c":4,"d":3}],"b":1}');
});

// ── 2. Инвалидация по версии рендерера/темы ────────────────────────────────

Deno.test("hash: бамп RENDERER_VERSION инвалидирует кэш при том же контенте", async () => {
  const current = await computeReportPdfHash(BLOCKS);
  const bumped = await computeReportPdfHash(BLOCKS, {
    renderer: String(Number(RENDERER_VERSION) + 1),
  });
  assertNotEquals(current, bumped);
});

Deno.test("hash: бамп THEME_VERSION инвалидирует кэш при том же контенте", async () => {
  const current = await computeReportPdfHash(BLOCKS);
  const bumped = await computeReportPdfHash(BLOCKS, {
    theme: String(Number(THEME_VERSION) + 1),
  });
  assertNotEquals(current, bumped);
});

Deno.test("path: файл лежит в папке пациента/анализа и зависит от хэша", async () => {
  const hash = await computeReportPdfHash(BLOCKS);
  const p = reportPdfPath("11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", hash);
  assertEquals(
    p,
    `11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/${hash.slice(0, 16)}.pdf`,
  );
  const other = reportPdfPath(
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222",
    await computeReportPdfHash(BLOCKS, { theme: "999" }),
  );
  assertNotEquals(p, other);
});

// ── 4. Дедупликация записей аудита ─────────────────────────────────────────

/** Мини-стаб PostgREST-клиента поверх массива строк. */
function makeAdminStub(rows: Array<Record<string, unknown>>) {
  const inserted: Array<Record<string, unknown>> = [];
  const from = (_table: string) => {
    const filters: Array<(r: Record<string, unknown>) => boolean> = [];
    const builder: any = {
      select: () => builder,
      eq: (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return builder;
      },
      gte: (col: string, val: string) => {
        filters.push((r) => String(r[col]) >= val);
        return builder;
      },
      limit: (n: number) =>
        Promise.resolve({ data: rows.filter((r) => filters.every((f) => f(r))).slice(0, n) }),
      insert: (row: Record<string, unknown>) => {
        const stored = { ...row, created_at: new Date().toISOString() };
        inserted.push(stored);
        rows.push(stored);
        return Promise.resolve({ data: null, error: null });
      },
    };
    return builder;
  };
  return { admin: { from }, inserted };
}

const ACCESS = {
  analysisId: "22222222-2222-2222-2222-222222222222",
  viewerId: "33333333-3333-3333-3333-333333333333",
  userId: "11111111-1111-1111-1111-111111111111",
  role: "patient" as const,
  channel: "pdf" as const,
};

Deno.test("audit: два открытия одним viewer в пределах 30 минут → одна запись", async () => {
  const { admin, inserted } = makeAdminStub([]);
  await logReportAccess(admin as any, ACCESS);
  await logReportAccess(admin as any, ACCESS);
  assertEquals(inserted.length, 1);
  assertEquals(inserted[0].role, "patient");
});

Deno.test("audit: другой viewer пишет свою запись", async () => {
  const { admin, inserted } = makeAdminStub([]);
  await logReportAccess(admin as any, ACCESS);
  await logReportAccess(admin as any, { ...ACCESS, viewerId: "44444444-4444-4444-4444-444444444444", role: "staff", channel: "signed_url" });
  assertEquals(inserted.length, 2);
});

Deno.test("audit: запись старше 30 минут не мешает новой", async () => {
  const old = {
    id: "old",
    analysis_id: ACCESS.analysisId,
    viewer_id: ACCESS.viewerId,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  };
  const { admin, inserted } = makeAdminStub([old]);
  await logReportAccess(admin as any, ACCESS);
  assertEquals(inserted.length, 1);
});

Deno.test("audit: сбой лога не роняет выдачу PDF", async () => {
  const brokenAdmin = {
    from: () => {
      throw new Error("db down");
    },
  };
  await logReportAccess(brokenAdmin as any, ACCESS);
  assert(true);
});
