/**
 * pdfPrescriptions.ts — единый рендер раздела «Назначения» в PDF.
 *
 * Цель: визуально и по составу полей повторить web-версию, которая в
 *   - src/pages/Prescriptions.tsx (раздел «Рекомендации» в меню)
 *   - src/pages/Recommendations.tsx (модалка отчёта)
 * рендерится через `PrescriptionCard` + `AdvisorySections`.
 *
 * До этого PDF собирался из «сырого» markdown-склейки, из-за чего колонки
 * полей и эмодзи-блоки выглядели иначе, чем в личном кабинете. Теперь
 * блок строится напрямую из тех же структурированных данных:
 *   - prescriptions[]   → карточки нутрицевтиков (колонки Форма/Дозировка/…)
 *   - lifestyle.{nutrition,activity,sleep} → блоки питания/активности/сна
 *   - follow_ups[]      → блоки доп. консультаций
 */
import type { PrescriptionCardData } from "@/components/prescriptions/PrescriptionCard";
import {
  sanitizeLifestyle,
  extractFollowUpsFromLifestyle,
  mergeFollowUps,
  type LifestyleData,
  type FollowUpData,
} from "@/components/prescriptions/AdvisorySections";

const COLOR = {
  text: "#1F2937",
  muted: "#6B7280",
  primary: "#7C3AED",
  primarySoft: "#F5F3FF",
  primaryBorder: "#C4B5FD",
  cardBg: "#FAFAFA",
  cardBorder: "#E5E7EB",
};

function fieldRow(label: string, value: string): any {
  return {
    text: [
      { text: `${label}: `, bold: true, color: COLOR.text, fontSize: 10 },
      { text: value, color: COLOR.muted, fontSize: 10 },
    ],
    margin: [0, 1, 0, 1],
  };
}

function prescriptionCardPdf(p: PrescriptionCardData, idx: number): any {
  const title = p.name || p.prescription;
  const reason = (p.reason || "").replace(/^[\s📊📈📉]+/u, "").trim();
  const stack: any[] = [
    {
      text: `${idx + 1}. ${title}`,
      bold: true,
      fontSize: 12,
      color: COLOR.primary,
      margin: [0, 0, 0, 6],
    },
  ];

  if (p.form) stack.push(fieldRow("Форма", p.form));
  if (p.dosage) stack.push(fieldRow("Дозировка", p.dosage));
  if (p.how_to_take) stack.push(fieldRow("Как принимать", p.how_to_take));
  if (p.duration) stack.push(fieldRow("Длительность", p.duration));

  if (reason) {
    stack.push({
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: [
                { text: "Причина: ", bold: true, color: COLOR.text, fontSize: 10 },
                { text: reason, color: COLOR.text, fontSize: 10 },
              ],
              margin: [8, 6, 8, 6],
              fillColor: COLOR.primarySoft,
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => COLOR.primaryBorder,
        vLineColor: () => COLOR.primaryBorder,
      },
      margin: [0, 4, 0, 0],
    });
  }

  if (p.effect) {
    stack.push({
      text: [
        { text: "На что это влияет: ", bold: true, color: COLOR.text, fontSize: 10 },
        { text: p.effect, color: COLOR.muted, fontSize: 10 },
      ],
      margin: [0, 4, 0, 0],
    });
  }

  return {
    table: {
      widths: ["*"],
      body: [[{ stack, margin: [10, 10, 10, 10] }]],
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => COLOR.cardBorder,
      vLineColor: () => COLOR.cardBorder,
      fillColor: () => COLOR.cardBg,
    },
    margin: [0, 0, 0, 8],
  };
}

function sectionTitle(text: string): any {
  return {
    stack: [
      { text, style: "h1", color: COLOR.primary, margin: [0, 0, 0, 4] },
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 50, h: 2, color: COLOR.primary },
        ],
      },
    ],
    margin: [0, 6, 0, 10],
  };
}

function bulletList(items: string[]): any {
  return {
    ul: items.map((it) => ({ text: it, color: COLOR.text, fontSize: 10 })),
    margin: [0, 0, 0, 0],
  };
}

function lifestyleCard(emoji: string, title: string, items: string[]): any {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              {
                text: `${emoji}  ${title}`,
                bold: true,
                fontSize: 11,
                color: COLOR.text,
                margin: [0, 0, 0, 6],
              },
              bulletList(items),
            ],
            margin: [10, 10, 10, 10],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => COLOR.cardBorder,
      vLineColor: () => COLOR.cardBorder,
      fillColor: () => COLOR.cardBg,
    },
    margin: [0, 0, 0, 8],
  };
}

function followUpCard(f: FollowUpData): any {
  const stack: any[] = [
    {
      text: [
        { text: "🩺  ", color: COLOR.primary, fontSize: 11 },
        {
          text: f.specialist || "Специалист",
          bold: true,
          color: COLOR.text,
          fontSize: 11,
        },
      ],
      margin: [0, 0, 0, 4],
    },
  ];
  if (f.goal) stack.push(fieldRow("Цель", f.goal));
  if (f.trigger) stack.push(fieldRow("Основание", f.trigger));

  return {
    table: {
      widths: ["*"],
      body: [[{ stack, margin: [10, 8, 10, 8] }]],
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => COLOR.cardBorder,
      vLineColor: () => COLOR.cardBorder,
      fillColor: () => COLOR.cardBg,
    },
    margin: [0, 0, 0, 6],
  };
}

export interface BuildPrescriptionsPdfInput {
  prescriptions: PrescriptionCardData[];
  lifestyle?: LifestyleData;
  followUps?: FollowUpData[];
}

/**
 * Build pdfmake content[] for the «Назначения» section.
 * Mirrors the web layout: PrescriptionCard cards + AdvisorySections blocks.
 */
export function buildPrescriptionsPdf(
  input: BuildPrescriptionsPdfInput,
): any[] {
  const { prescriptions, lifestyle, followUps } = input;
  const ls = sanitizeLifestyle(lifestyle);
  const hasNutrition = (ls.nutrition?.length || 0) > 0;
  const hasActivity = (ls.activity?.length || 0) > 0;
  const hasSleep = (ls.sleep?.length || 0) > 0;
  const hasLifestyle = hasNutrition || hasActivity || hasSleep;
  const hasFollowUps = (followUps?.length || 0) > 0;

  const out: any[] = [];

  if (prescriptions.length > 0) {
    out.push({
      text: `Нутрицевтики (${prescriptions.length})`,
      bold: true,
      fontSize: 14,
      color: COLOR.text,
      margin: [0, 0, 0, 8],
    });
    prescriptions.forEach((p, i) => out.push(prescriptionCardPdf(p, i)));
  }

  if (hasLifestyle) {
    out.push(sectionTitle("Питание и коррекция образа жизни"));
    if (hasNutrition) out.push(lifestyleCard("🥗", "Питание", ls.nutrition!));
    if (hasActivity) out.push(lifestyleCard("🏃", "Физическая активность", ls.activity!));
    if (hasSleep) out.push(lifestyleCard("😴", "Сон и режим", ls.sleep!));
  }

  if (hasFollowUps && followUps) {
    out.push(sectionTitle("Дополнительные консультации и обследования"));
    followUps.forEach((f) => out.push(followUpCard(f)));
  }

  return out;
}
