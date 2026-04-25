/**
 * ReportSnapshot — единый источник истины для отчёта.
 *
 * Хранится в `recommendations.content_json` (JSONB).
 * Из этой структуры рендерится:
 *   - Web view (snapshotRenderer.tsx → React)
 *   - PDF (snapshotRenderer.tsx → pdfmake content)
 *
 * AI генерирует JSON по этой схеме (через tool calling).
 * После генерации мы валидируем через Zod — если невалидно, ретрай.
 *
 * Биомаркеры привязаны по `biomarker_id` (UUID из БД), а не по строке кода.
 * Это полностью устраняет проблему ненадёжного матчинга по коду
 * (TNF-α vs TNF-a, Hb vs HB и пр.).
 */
import { z } from "zod";

// ─── Базовые блоки ─────────────────────────────────────────────────────────

/** Свободный markdown-текст (заголовки, абзацы, списки, выделения). */
export const TextBlockSchema = z.object({
  type: z.literal("text"),
  /** Markdown-контент. Парсится через MarkdownContent / parseMarkdownToPdfContent. */
  content: z.string().min(1),
});

/** Заголовок раздела категории (например, "Сердечно-сосудистая система"). */
export const SectionBlockSchema = z.object({
  type: z.literal("section"),
  title: z.string().min(1),
  /** Опциональный emoji/иконка категории. */
  emoji: z.string().optional(),
});

/**
 * Общее резюме всего отчёта (один на отчёт).
 * Рендерится в выделенный блок с фиолетовой рамкой.
 *
 * Категорийных summary не существует — в категориях используются
 * обычные text-блоки. scope оставлен опциональным enum только ради
 * обратной совместимости со старыми snapshot'ами в БД; новые AI-генерации
 * должны проставлять "overall" либо опускать поле.
 */
export const SummaryBlockSchema = z.object({
  type: z.literal("summary"),
  /** Markdown-контент резюме. */
  content: z.string().min(1),
  /** Только "overall". "category" сохранён для обратной совместимости со старыми записями. */
  scope: z.enum(["overall", "category"]).optional(),
});

/**
 * Карточка биомаркера: метаданные (имя, код, значение, статус, шкала)
 * + комментарий AI о клиническом значении.
 *
 * КЛЮЧЕВОЕ: привязка по UUID `biomarker_id`, не по строке кода.
 * Все визуальные данные (значение, статус, шкала) ресолвятся на рендере
 * из `analysis_values` + `biomarkers`, что гарантирует свежесть данных
 * (если админ поменял референсы — карточки обновятся автоматически).
 */
export const BiomarkerBlockSchema = z.object({
  type: z.literal("biomarker"),
  /** UUID биомаркера из таблицы `biomarkers`. Источник истины. */
  biomarker_id: z.string().uuid(),
  /**
   * Комментарий AI: клиническое значение, рекомендации.
   * Markdown поддерживается (списки, выделения).
   * Может быть пустым — тогда карточка показывает только метаданные.
   */
  commentary: z.string().default(""),
});

/** Вертикальный отступ между блоками. */
export const SpacerBlockSchema = z.object({
  type: z.literal("spacer"),
  /** Размер отступа (по умолчанию medium). */
  size: z.enum(["small", "medium", "large"]).default("medium"),
});

/** Принудительный разрыв страницы (только в PDF, в web игнорируется). */
export const PageBreakBlockSchema = z.object({
  type: z.literal("pagebreak"),
});

// ─── Объединённый дискриминатор ────────────────────────────────────────────

export const ReportBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  SectionBlockSchema,
  SummaryBlockSchema,
  BiomarkerBlockSchema,
  SpacerBlockSchema,
  PageBreakBlockSchema,
]);

// ─── Корневой snapshot ─────────────────────────────────────────────────────

export const ReportSnapshotSchema = z.object({
  /** Версия схемы. Меняем при breaking changes. */
  version: z.literal(1),
  /** Линейный список блоков. Порядок = порядок отображения. */
  blocks: z.array(ReportBlockSchema).min(1),
  /** Опциональные метаданные генерации (модель, дата, токены). */
  meta: z
    .object({
      generated_at: z.string().optional(),
      model: z.string().optional(),
      analysis_id: z.string().uuid().optional(),
    })
    .optional(),
});

// ─── TypeScript типы (выведены из схем) ────────────────────────────────────

export type TextBlock = z.infer<typeof TextBlockSchema>;
export type SectionBlock = z.infer<typeof SectionBlockSchema>;
export type SummaryBlock = z.infer<typeof SummaryBlockSchema>;
export type BiomarkerBlock = z.infer<typeof BiomarkerBlockSchema>;
export type SpacerBlock = z.infer<typeof SpacerBlockSchema>;
export type PageBreakBlock = z.infer<typeof PageBreakBlockSchema>;
export type ReportBlock = z.infer<typeof ReportBlockSchema>;
export type ReportSnapshot = z.infer<typeof ReportSnapshotSchema>;

// ─── Хелперы ───────────────────────────────────────────────────────────────

/**
 * Безопасно валидирует произвольный объект как ReportSnapshot.
 * Возвращает либо валидный snapshot, либо null + детальную ошибку.
 */
export function parseReportSnapshot(
  raw: unknown,
): { ok: true; snapshot: ReportSnapshot } | { ok: false; error: string } {
  const result = ReportSnapshotSchema.safeParse(raw);
  if (result.success) {
    return { ok: true, snapshot: result.data };
  }
  return {
    ok: false,
    error: result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; "),
  };
}

/**
 * JSON Schema для tool calling AI. Описывает контракт, которому должна
 * соответствовать структура отчёта, генерируемого моделью.
 *
 * Используется в edge function analyze-biomarkers как `tools[].function.parameters`.
 * Намеренно держим вручную (не через zod-to-json-schema), чтобы:
 *   1) явно контролировать, что видит AI;
 *   2) не тащить лишнюю зависимость в edge runtime (Deno).
 */
export const REPORT_SNAPSHOT_JSON_SCHEMA = {
  type: "object",
  properties: {
    // Без enum на числе — Gemini не принимает такую конструкцию в OpenAPI subset.
    // Жёсткую проверку version === 1 делаем через Zod после получения ответа.
    version: { type: "number", description: "Версия схемы, всегда 1" },
    blocks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["text", "section", "summary", "biomarker", "spacer", "pagebreak"],
          },
          // text
          content: { type: "string" },
          // section
          title: { type: "string" },
          emoji: { type: "string" },
          // summary
          scope: { type: "string", enum: ["overall", "category"] },
          // biomarker
          biomarker_id: { type: "string" },
          commentary: { type: "string" },
          // spacer
          size: { type: "string", enum: ["small", "medium", "large"] },
        },
        required: ["type"],
      },
    },
  },
  required: ["version", "blocks"],
} as const;
