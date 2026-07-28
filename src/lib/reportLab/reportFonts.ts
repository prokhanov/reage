/**
 * Самохостинг шрифтов отчёта.
 *
 * Почему это важно: пагинация отчёта (Paged.js в редакторе и Playwright на
 * сервере) полностью зависит от метрик шрифта. Если шрифт не загрузился
 * (Google Fonts заблокирован/медленный/кэш браузера пуст), браузер подставляет
 * системный fallback — и текст на страницах «разъезжается» по-разному на разных
 * компьютерах. Поэтому все шрифты отчёта лежат в бандле (src/assets/fonts) и
 * подключаются через @font-face с локальными URL.
 *
 * Отдельная проблема: у Fraunces НЕТ кириллицы, поэтому русские заголовки
 * раньше рисовались случайным системным serif'ом (Times / Georgia / DejaVu —
 * у каждого свои метрики). Теперь кириллический serif жёстко зафиксирован как
 * Lora.
 */

import interRegular from "@/assets/fonts/inter-regular.woff2";
import inter500 from "@/assets/fonts/inter-500.woff2";
import inter600 from "@/assets/fonts/inter-600.woff2";
import inter700 from "@/assets/fonts/inter-700.woff2";
import inter800 from "@/assets/fonts/inter-800.woff2";

import frauncesRegular from "@/assets/fonts/fraunces-regular.woff2";
import fraunces600 from "@/assets/fonts/fraunces-600.woff2";
import fraunces700 from "@/assets/fonts/fraunces-700.woff2";
import frauncesItalic from "@/assets/fonts/fraunces-italic.woff2";

import loraRegular from "@/assets/fonts/lora-regular.woff2";
import lora500 from "@/assets/fonts/lora-500.woff2";
import lora600 from "@/assets/fonts/lora-600.woff2";
import lora700 from "@/assets/fonts/lora-700.woff2";
import loraItalic from "@/assets/fonts/lora-italic.woff2";

import monoRegular from "@/assets/fonts/jetbrains-mono-regular.woff2";
import mono500 from "@/assets/fonts/jetbrains-mono-500.woff2";
import mono700 from "@/assets/fonts/jetbrains-mono-700.woff2";

const face = (
  family: string,
  weight: number,
  style: "normal" | "italic",
  url: string,
) =>
  `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:block;src:url(${url}) format("woff2");}`;

/** CSS с @font-face для всех шрифтов отчёта (локальные bundled-файлы). */
export const reportFontFaceCss = [
  face("Inter", 400, "normal", interRegular),
  face("Inter", 500, "normal", inter500),
  face("Inter", 600, "normal", inter600),
  face("Inter", 700, "normal", inter700),
  face("Inter", 800, "normal", inter800),

  face("Fraunces", 400, "normal", frauncesRegular),
  face("Fraunces", 600, "normal", fraunces600),
  face("Fraunces", 700, "normal", fraunces700),
  face("Fraunces", 400, "italic", frauncesItalic),

  face("Lora", 400, "normal", loraRegular),
  face("Lora", 500, "normal", lora500),
  face("Lora", 600, "normal", lora600),
  face("Lora", 700, "normal", lora700),
  face("Lora", 400, "italic", loraItalic),

  face("JetBrains Mono", 400, "normal", monoRegular),
  face("JetBrains Mono", 500, "normal", mono500),
  face("JetBrains Mono", 700, "normal", mono700),
].join("\n");

/** Пары «шрифт → начертания», которые обязаны быть загружены до пагинации. */
const REQUIRED_FONTS: string[] = [
  '400 12px "Inter"',
  '500 12px "Inter"',
  '600 12px "Inter"',
  '700 12px "Inter"',
  '800 12px "Inter"',
  '400 12px "Fraunces"',
  '600 12px "Fraunces"',
  '700 12px "Fraunces"',
  'italic 400 12px "Fraunces"',
  '400 12px "Lora"',
  '500 12px "Lora"',
  '600 12px "Lora"',
  '700 12px "Lora"',
  'italic 400 12px "Lora"',
  '400 12px "JetBrains Mono"',
  '500 12px "JetBrains Mono"',
  '700 12px "JetBrains Mono"',
];

/**
 * Гарантирует, что все шрифты отчёта реально загружены в переданном документе.
 * Пагинацию можно запускать только после резолва этого промиса — иначе метрики
 * текста поменяются уже после разбиения на страницы.
 */
export async function ensureReportFontsLoaded(doc: Document = document): Promise<void> {
  const fonts = (doc as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return;
  try {
    await Promise.all(
      REQUIRED_FONTS.map((spec) =>
        // Кириллица + латиница: подгружаем оба набора глифов.
        Promise.all([fonts.load(spec, "Аг"), fonts.load(spec, "Ag")]).catch(() => undefined),
      ),
    );
    await fonts.ready;
  } catch {
    // Не блокируем рендер, если FontFaceSet повёл себя неожиданно.
  }
}
