/**
 * Санитайзер HTML-правок редактора отчёта.
 *
 * Правки врача сохраняются как готовая разметка (без обратной конверсии
 * в markdown), поэтому перед записью в БД и перед рендером мы удаляем всё,
 * что не относится к оформлению текста: скрипты, инлайн-обработчики,
 * служебные атрибуты paged.js и внешние ссылки на javascript:.
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "STRONG", "B", "EM", "I", "U", "S", "SPAN", "DIV",
  "UL", "OL", "LI", "H1", "H2", "H3", "H4", "H5", "H6",
  "BLOCKQUOTE", "CODE", "PRE", "A", "TABLE", "THEAD", "TBODY",
  "TR", "TH", "TD", "HR", "SUP", "SUB",
]);

const ALLOWED_ATTRS = new Set(["href", "colspan", "rowspan", "class"]);

const STRIPPED_CLASS_PREFIXES = ["pagedjs", "rl-page"];

function cleanNode(el: Element) {
  Array.from(el.children).forEach(cleanNode);

  if (!ALLOWED_TAGS.has(el.tagName)) {
    // Тег не разрешён — разворачиваем содержимое наружу, текст не теряем.
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    return;
  }

  Array.from(el.attributes).forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (!ALLOWED_ATTRS.has(name)) {
      el.removeAttribute(attr.name);
      return;
    }
    if (name === "href" && /^\s*javascript:/i.test(attr.value)) {
      el.removeAttribute(attr.name);
    }
  });

  const cls = el.getAttribute("class");
  if (cls) {
    const kept = cls
      .split(/\s+/)
      .filter((c) => c && !STRIPPED_CLASS_PREFIXES.some((p) => c.startsWith(p)));
    if (kept.length) el.setAttribute("class", kept.join(" "));
    else el.removeAttribute("class");
  }
}

/** Очищает HTML редактора. Возвращает пустую строку, если текста не осталось. */
export function sanitizeReportHtml(html: string): string {
  if (!html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll("script, style, iframe, object, embed, link, meta")
    .forEach((n) => n.remove());
  Array.from(template.content.children).forEach((child) => cleanNode(child));
  const result = template.innerHTML.trim();
  return htmlHasContent(result) ? result : "";
}

/** true, если в разметке есть видимый текст (или таблица/список). */
export function htmlHasContent(html: string): boolean {
  if (!html) return false;
  const template = document.createElement("template");
  template.innerHTML = html;
  const text = (template.content.textContent || "")
    .replace(/\u00A0/g, " ")
    .replace(/\u200B/g, "")
    .trim();
  if (text) return true;
  return Boolean(template.content.querySelector("table, img, hr"));
}
