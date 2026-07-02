// Минимальные конверторы Markdown <-> HTML для inline-редактора отчёта.
// Поддерживаем только то, что доступно в тулбаре Tiptap:
//   параграф, ##/### заголовки, - / 1. списки, **bold**, *italic*.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMdToHtml(s: string): string {
  let out = escapeHtml(s);
  // bold: **x** or __x__
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_\n]+)__/g, "<strong>$1</strong>");
  // italic: *x* or _x_
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
  return out;
}

export function markdownToHtml(md: string): string {
  const text = (md || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "<p></p>";

  const lines = text.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings ## / ###
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      html.push(`<h3>${inlineMdToHtml(h3[1])}</h3>`);
      i++;
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      html.push(`<h2>${inlineMdToHtml(h2[1])}</h2>`);
      i++;
      continue;
    }
    // h1 понижаем до h2
    const h1 = /^#\s+(.*)$/.exec(line);
    if (h1) {
      html.push(`<h2>${inlineMdToHtml(h1[1])}</h2>`);
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, ""));
        i++;
      }
      html.push(
        `<ul>${items.map((it) => `<li>${inlineMdToHtml(it)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      html.push(
        `<ol>${items.map((it) => `<li>${inlineMdToHtml(it)}</li>`).join("")}</ol>`,
      );
      continue;
    }

    // Paragraph — собираем до пустой строки
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    html.push(`<p>${inlineMdToHtml(buf.join(" "))}</p>`);
  }

  return html.join("") || "<p></p>";
}

// ─── HTML → Markdown ──────────────────────────────────────────────────────

function nodeToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "").replace(/\s+/g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(nodeToMd).join("");
  switch (tag) {
    case "strong":
    case "b":
      return `**${inner.trim()}**`;
    case "em":
    case "i":
      return `*${inner.trim()}*`;
    case "br":
      return "\n";
    default:
      return inner;
  }
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return "";
  const doc = new DOMParser().parseFromString(
    `<div id="root">${html}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root");
  if (!root) return "";

  const out: string[] = [];
  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent || "").trim();
      if (t) out.push(t);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case "h2":
        out.push(`## ${nodeToMd(el).trim()}`);
        break;
      case "h3":
        out.push(`### ${nodeToMd(el).trim()}`);
        break;
      case "h1":
        out.push(`## ${nodeToMd(el).trim()}`);
        break;
      case "ul": {
        const items = Array.from(el.querySelectorAll(":scope > li"));
        out.push(items.map((li) => `- ${nodeToMd(li).trim()}`).join("\n"));
        break;
      }
      case "ol": {
        const items = Array.from(el.querySelectorAll(":scope > li"));
        out.push(
          items
            .map((li, idx) => `${idx + 1}. ${nodeToMd(li).trim()}`)
            .join("\n"),
        );
        break;
      }
      case "p":
      default:
        out.push(nodeToMd(el).trim());
    }
  });

  return out.filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}
