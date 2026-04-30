/**
 * pdfSnapshotExport.ts — экспериментальный экспорт отчёта в PDF
 * методом «фотографирования» web-DOM через html2canvas + jsPDF.
 *
 * Цель: PDF 1-в-1 как web (шрифты, цвета, иконки, графики).
 * Каждая верхнеуровневая секция #report-content > div идёт с новой страницы,
 * чтобы избежать ручной логики переносов.
 *
 * НЕ ЗАМЕНЯЕТ текущий pdfmake-экспорт. Подключается отдельной кнопкой
 * «Скачать тест PDF» для A/B-сравнения.
 */
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface SnapshotExportOptions {
  /** Контейнер с отчётом. Прямые дети считаются «секциями» — каждая на свою страницу. */
  container: HTMLElement;
  /** Имя итогового файла. */
  fileName?: string;
  /** Множитель плотности рендера (2 = retina). Больше = чётче, но тяжелее. */
  scale?: number;
  /** Прогресс-колбэк (0..1). */
  onProgress?: (ratio: number) => void;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 8;

/**
 * Превратить HTMLElement в data:image/png и вставить в jsPDF.
 * Если высота секции больше A4 — режем на несколько страниц без зазоров.
 */
async function renderSectionToPdf(
  pdf: jsPDF,
  el: HTMLElement,
  scale: number,
  isFirst: boolean,
  bgColor: string,
): Promise<void> {
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: bgColor,
    useCORS: true,
    logging: false,
    // На странице есть градиенты и box-shadow — пусть рендерит как видит
    windowWidth: el.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const usableW = A4_WIDTH_MM - PAGE_PADDING_MM * 2;
  const pxPerMm = canvas.width / usableW;
  const totalHmm = canvas.height / pxPerMm;
  const pageUsableH = A4_HEIGHT_MM - PAGE_PADDING_MM * 2;

  if (!isFirst) pdf.addPage();

  if (totalHmm <= pageUsableH) {
    pdf.addImage(
      imgData,
      "JPEG",
      PAGE_PADDING_MM,
      PAGE_PADDING_MM,
      usableW,
      totalHmm,
      undefined,
      "FAST",
    );
    return;
  }

  // Слишком высокая секция — выводим как длинное изображение, скроллящееся
  // через addImage с отрицательным y на доп. страницах.
  let renderedH = 0;
  let pageIdx = 0;
  while (renderedH < totalHmm - 0.5) {
    if (pageIdx > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "JPEG",
      PAGE_PADDING_MM,
      PAGE_PADDING_MM - renderedH,
      usableW,
      totalHmm,
      undefined,
      "FAST",
    );
    renderedH += pageUsableH;
    pageIdx++;
  }
}

/**
 * Получить актуальный фон страницы из CSS-токена --background,
 * чтобы тёмная тема экспортировалась тёмным фоном.
 */
function getBackgroundColor(): string {
  try {
    const root = document.documentElement;
    const hsl = getComputedStyle(root).getPropertyValue("--background").trim();
    if (hsl) return `hsl(${hsl})`;
  } catch {
    /* ignore */
  }
  return "#ffffff";
}

export async function exportReportSnapshotToPdf(
  opts: SnapshotExportOptions,
): Promise<void> {
  const { container, fileName = "report-test.pdf", scale = 2, onProgress } = opts;

  const sections = Array.from(container.children).filter(
    (n): n is HTMLElement => n instanceof HTMLElement && n.offsetHeight > 0,
  );

  if (sections.length === 0) {
    throw new Error("Нет секций для экспорта");
  }

  const bg = getBackgroundColor();

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  for (let i = 0; i < sections.length; i++) {
    await renderSectionToPdf(pdf, sections[i], scale, i === 0, bg);
    onProgress?.((i + 1) / sections.length);
  }

  pdf.save(fileName);
}
