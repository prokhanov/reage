import pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = (pdfFonts as any).vfs ?? (pdfFonts as any).default?.vfs ?? pdfFonts;

type PMNode = any;

const HEADING_STYLES: Record<string, { fontSize: number; bold: boolean; marginTop: number; marginBottom: number }> = {
  H1: { fontSize: 20, bold: true, marginTop: 12, marginBottom: 8 },
  H2: { fontSize: 16, bold: true, marginTop: 14, marginBottom: 6 },
  H3: { fontSize: 13, bold: true, marginTop: 10, marginBottom: 4 },
  H4: { fontSize: 12, bold: true, marginTop: 8, marginBottom: 4 },
};

function inlineFromNode(node: Node): PMNode[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? "";
    return t ? [{ text: t }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const el = node as HTMLElement;
  const tag = el.tagName;
  if (tag === "SVG" || tag === "BUTTON" || el.getAttribute("aria-hidden") === "true") return [];
  const children: PMNode[] = [];
  el.childNodes.forEach((c) => children.push(...inlineFromNode(c)));
  if (tag === "STRONG" || tag === "B") return children.map((c) => ({ ...c, bold: true }));
  if (tag === "EM" || tag === "I") return children.map((c) => ({ ...c, italics: true }));
  if (tag === "A") {
    const href = el.getAttribute("href") || "";
    return children.map((c) => ({ ...c, link: href, color: "#1d4ed8", decoration: "underline" }));
  }
  if (tag === "BR") return [{ text: "\n" }];
  return children;
}

function blockFromElement(el: HTMLElement): PMNode[] {
  const tag = el.tagName;

  if (tag === "SVG" || tag === "HR" || tag === "BUTTON") return [];
  if (el.classList.contains("print:hidden")) return [];

  if (HEADING_STYLES[tag]) {
    const s = HEADING_STYLES[tag];
    const inline = inlineFromNode(el);
    if (!inline.length) return [];
    return [{ text: inline, fontSize: s.fontSize, bold: s.bold, margin: [0, s.marginTop, 0, s.marginBottom] }];
  }

  if (tag === "P") {
    const inline = inlineFromNode(el);
    const txt = inline.map((i: any) => i.text || "").join("").trim();
    if (!txt) return [];
    return [{ text: inline, fontSize: 11, lineHeight: 1.45, margin: [0, 0, 0, 8], alignment: "justify" }];
  }

  if (tag === "UL" || tag === "OL") {
    const items: PMNode[] = [];
    el.querySelectorAll(":scope > li").forEach((li) => {
      const inline = inlineFromNode(li);
      if (inline.length) items.push({ text: inline, fontSize: 11, lineHeight: 1.4, margin: [0, 0, 0, 3] });
    });
    if (!items.length) return [];
    const list = tag === "OL" ? { ol: items } : { ul: items };
    return [{ ...list, margin: [0, 0, 0, 8] }];
  }

  if (tag === "BLOCKQUOTE") {
    const inline = inlineFromNode(el);
    if (!inline.length) return [];
    return [{ text: inline, italics: true, color: "#374151", margin: [12, 4, 0, 8] }];
  }

  // Container: recurse into children
  const out: PMNode[] = [];
  el.childNodes.forEach((c) => {
    if (c.nodeType === Node.ELEMENT_NODE) {
      out.push(...blockFromElement(c as HTMLElement));
    } else if (c.nodeType === Node.TEXT_NODE) {
      const t = (c.textContent || "").trim();
      if (t) out.push({ text: t, fontSize: 11, margin: [0, 0, 0, 6] });
    }
  });
  return out;
}

export function downloadLegalPdf(opts: { title: string; subtitle?: string; container: HTMLElement; fileName?: string }) {
  const { title, subtitle, container } = opts;
  const content: PMNode[] = [
    { text: title, fontSize: 22, bold: true, margin: [0, 0, 0, subtitle ? 4 : 12] },
  ];
  if (subtitle) content.push({ text: subtitle, fontSize: 11, color: "#525252", margin: [0, 0, 0, 16] });

  content.push(...blockFromElement(container));

  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [56, 56, 56, 64],
    defaultStyle: { font: "Roboto", fontSize: 11, color: "#111111", lineHeight: 1.4 },
    info: { title, author: "ReAge" },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "reage.life", fontSize: 9, color: "#9ca3af", margin: [56, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, fontSize: 9, color: "#9ca3af", alignment: "right", margin: [0, 0, 56, 0] },
      ],
      margin: [0, 20, 0, 0],
    }),
    content,
  };

  const safe = (opts.fileName || title).replace(/[^\p{L}\p{N}\-_]+/gu, "_").slice(0, 80);
  pdfMake.createPdf(docDefinition).download(`${safe}.pdf`);
}
