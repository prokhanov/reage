/**
 * Сериализация и обратный парсинг ReportSnapshot ↔ Markdown.
 *
 * Используется в админ-редакторе:
 *   1. snapshotToMarkdown(snapshot)  — превращает структуру в плоский MD,
 *      который удобно править в одном поле.
 *   2. markdownToSnapshot(md, prev)  — восстанавливает структуру из MD,
 *      сохраняя биомаркер-карточки по UUID, найденному в маркер-комментариях.
 *
 * Формат маркеров:
 *   <!-- block:section title="..." emoji="..." -->
 *   <!-- block:summary scope="overall" -->
 *   <!-- block:biomarker id="uuid" -->
 *   <!-- block:prescriptions title="..." -->
 *   <!-- block:pagebreak -->
 *   <!-- block:spacer size="medium" -->
 *
 * Контент между маркерами трактуется как markdown текст для предыдущего
 * блока (если он поддерживает content/commentary), либо превращается в
 * отдельный TextBlock.
 */
import type {
  ReportSnapshot,
  ReportBlock,
} from "./reportSnapshot";

// ─── snapshot → markdown ──────────────────────────────────────────────────

export function snapshotToMarkdown(snapshot: ReportSnapshot): string {
  const parts: string[] = [];

  for (const block of snapshot.blocks) {
    switch (block.type) {
      case "section": {
        const attrs = [
          `title="${escapeAttr(block.title)}"`,
          block.emoji ? `emoji="${escapeAttr(block.emoji)}"` : "",
        ]
          .filter(Boolean)
          .join(" ");
        parts.push(`<!-- block:section ${attrs} -->`);
        parts.push(`## ${block.emoji ? block.emoji + " " : ""}${block.title}`);
        break;
      }
      case "summary": {
        const attrs = block.scope ? `scope="${block.scope}"` : "";
        parts.push(`<!-- block:summary ${attrs} -->`);
        parts.push(block.content.trim());
        break;
      }
      case "text": {
        parts.push(`<!-- block:text -->`);
        parts.push(block.content.trim());
        break;
      }
      case "biomarker": {
        parts.push(`<!-- block:biomarker id="${block.biomarker_id}" -->`);
        if (block.commentary && block.commentary.trim()) {
          parts.push(block.commentary.trim());
        }
        break;
      }
      case "prescriptions": {
        const attrs = block.title ? `title="${escapeAttr(block.title)}"` : "";
        parts.push(`<!-- block:prescriptions ${attrs} -->`);
        break;
      }
      case "spacer": {
        parts.push(`<!-- block:spacer size="${block.size ?? "medium"}" -->`);
        break;
      }
      case "pagebreak": {
        parts.push(`<!-- block:pagebreak -->`);
        break;
      }
    }
    parts.push(""); // blank line separator
  }

  return parts.join("\n").trim() + "\n";
}

// ─── markdown → snapshot ──────────────────────────────────────────────────

const MARKER_RE = /<!--\s*block:(\w+)([^>]*?)-->/g;

export function markdownToSnapshot(
  md: string,
  prev?: ReportSnapshot,
): { ok: true; snapshot: ReportSnapshot } | { ok: false; error: string } {
  const blocks: ReportBlock[] = [];
  const matches = [...md.matchAll(MARKER_RE)];

  if (matches.length === 0) {
    return {
      ok: false,
      error: "Не найдено ни одного маркера блока (<!-- block:... -->)",
    };
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const next = matches[i + 1];
    const type = m[1];
    const attrs = parseAttrs(m[2] ?? "");
    const start = m.index! + m[0].length;
    const end = next ? next.index! : md.length;
    const inner = md.slice(start, end).trim();

    // Удаляем сгенерированный заголовок ## Title для section, чтобы не попал в content
    const innerWithoutSectionHeader =
      type === "section" ? inner.replace(/^##\s+.*$/m, "").trim() : inner;

    switch (type) {
      case "section": {
        if (!attrs.title) {
          return { ok: false, error: "block:section без title" };
        }
        blocks.push({
          type: "section",
          title: attrs.title,
          ...(attrs.emoji ? { emoji: attrs.emoji } : {}),
        });
        // Если после section есть текст, не относящийся к маркеру, делаем text
        if (innerWithoutSectionHeader) {
          blocks.push({ type: "text", content: innerWithoutSectionHeader });
        }
        break;
      }
      case "summary": {
        const scope =
          attrs.scope === "overall" || attrs.scope === "category"
            ? attrs.scope
            : undefined;
        blocks.push({
          type: "summary",
          content: inner || "—",
          ...(scope ? { scope } : {}),
        });
        break;
      }
      case "text": {
        if (inner) blocks.push({ type: "text", content: inner });
        break;
      }
      case "biomarker": {
        if (!attrs.id) {
          return { ok: false, error: "block:biomarker без id" };
        }
        blocks.push({
          type: "biomarker",
          biomarker_id: attrs.id,
          commentary: inner,
        });
        break;
      }
      case "prescriptions": {
        blocks.push({
          type: "prescriptions",
          ...(attrs.title ? { title: attrs.title } : {}),
        });
        break;
      }
      case "spacer": {
        const size =
          attrs.size === "small" || attrs.size === "large" ? attrs.size : "medium";
        blocks.push({ type: "spacer", size });
        break;
      }
      case "pagebreak": {
        blocks.push({ type: "pagebreak" });
        break;
      }
      default:
        // Неизвестный — игнорируем
        break;
    }
  }

  if (blocks.length === 0) {
    return { ok: false, error: "После парсинга получилось 0 блоков" };
  }

  return {
    ok: true,
    snapshot: {
      version: 1,
      blocks,
      meta: prev?.meta,
    },
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────

function escapeAttr(value: string): string {
  return value.replace(/"/g, '\\"');
}

function parseAttrs(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    result[m[1]] = m[2].replace(/\\"/g, '"');
  }
  return result;
}
