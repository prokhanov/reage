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
 * Краткое резюме раздела или общего отчёта.
 * Рендерится в выделенный блок с фиолетовой рамкой.
 */
export const SummaryBlockSchema = z.object({
  type: z.literal("summary"),
  /** Markdown-контент резюме. */
  content: z.string().min(1),
  /** Опционально: какой это summary — общий или категорийный. */
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

/**
 * Маркер для вставки секции назначений (prescriptions).
 * Сами назначения хранятся в таблице `prescriptions` и подгружаются на рендере
 * по `analysis_id`. Renderer вставляет заголовок + сгруппированные карточки.
 *
 * AI НЕ генерирует этот блок — его добавляет edge function в самом конце
 * snapshot, чтобы prescriptions всегда были последней секцией отчёта.
 */
export const PrescriptionsBlockSchema = z.object({
  type: z.literal("prescriptions"),
  /** Заголовок секции (по умолчанию "Назначения"). */
  title: z.string().optional(),
});

// ─── Объединённый дискриминатор ────────────────────────────────────────────

export const ReportBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  SectionBlockSchema,
  SummaryBlockSchema,
  BiomarkerBlockSchema,
  SpacerBlockSchema,
  PageBreakBlockSchema,
  PrescriptionsBlockSchema,
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
export type PrescriptionsBlock = z.infer<typeof PrescriptionsBlockSchema>;
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
    version: { type: "number", enum: [1] },
    blocks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "text",
              "section",
              "summary",
              "biomarker",
              "spacer",
              "pagebreak",
              "prescriptions",
            ],
          },
          // text
          content: { type: "string" },
          // section / prescriptions
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

/**
 * JSON Schema для tool calling одной категории.
 *
 * AI получает: список биомаркеров категории (UUID + name + value + status)
 *   + контекст пациента + промпт категории.
 * AI возвращает: blocks[] со структурой:
 *   1. section { title, emoji }              — заголовок категории
 *   2. summary { content, scope: "category" } — краткое резюме
 *   3. text     { content }                  — нарратив (опционально)
 *   4. biomarker { biomarker_id, commentary } — карточка для каждого маркера
 *   5. text/spacer                            — дополнительные пояснения
 *
 * НЕ генерирует: prescriptions, pagebreak, scope:"overall".
 * Этим занимается edge function на этапе сборки финального snapshot.
 */
export const CATEGORY_BLOCKS_JSON_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      minItems: 2,
      description:
        "Массив блоков категории. Первым ОБЯЗАТЕЛЬНО идёт section (заголовок), затем summary с scope='category', далее любая комбинация text и biomarker.",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["text", "section", "summary", "biomarker", "spacer"],
          },
          content: {
            type: "string",
            description:
              "Markdown-контент. Для text/summary. Поддерживает заголовки, списки, выделения.",
          },
          title: {
            type: "string",
            description: "Только для section: название категории.",
          },
          emoji: {
            type: "string",
            description: "Только для section: эмодзи категории (опционально).",
          },
          scope: {
            type: "string",
            enum: ["category"],
            description:
              "Только для summary в категорийном вызове: должно быть 'category'.",
          },
          biomarker_id: {
            type: "string",
            description:
              "Только для biomarker: UUID из переданного списка. Запрещено выдумывать.",
          },
          commentary: {
            type: "string",
            description:
              "Только для biomarker: клинический комментарий (markdown). Может быть пустой строкой, если нечего добавить.",
          },
          size: {
            type: "string",
            enum: ["small", "medium", "large"],
            description: "Только для spacer.",
          },
        },
        required: ["type"],
      },
    },
  },
  required: ["blocks"],
} as const;

/**
 * JSON Schema для финального overall-summary вызова.
 * Возвращает один summary-блок со scope:"overall".
 */
export const OVERALL_SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description:
        "Markdown-резюме всего отчёта. 2-4 абзаца. Без заголовка категорий — только синтез.",
    },
  },
  required: ["content"],
} as const;
