// M2. Производные индексы.
// Считаем дополнительные маркеры из имеющихся: NLR, TyG, AIP, HOMA-IR, eGFR (CKD-EPI 2021),
// de Ritis (AST/ALT), Fib-4. Результат добавляется в общий пул маркеров со своими нормами.
//
// Все входы — числа в стандартных единицах:
//   GLU — ммоль/л, TG — ммоль/л, HDL — ммоль/л, INS — мкЕд/мл,
//   CREAT — мкмоль/л, AST/ALT/ЩФ — Ед/л, лимф% — %, PLT — ×10⁹/л, age — лет.

import type { MarkerInput, MarkerRange, SystemKey } from "./types.ts";

export interface DerivedInputs {
  age?: number;
  sex?: "male" | "female";
  neut_abs?: number; // ×10⁹/л
  lymph_abs?: number; // ×10⁹/л
  tg?: number; // ммоль/л
  hdl?: number; // ммоль/л
  glu?: number; // ммоль/л
  ins?: number; // мкЕд/мл
  creat_umol?: number; // мкмоль/л
  ast?: number; // Ед/л
  alt?: number; // Ед/л
  plt?: number; // ×10⁹/л
}

const RANGES: Record<string, { range: MarkerRange; system: SystemKey }> = {
  NLR: {
    system: "inflammation",
    range: { optimal_min: 1, optimal_max: 2, normal_min: 0.78, normal_max: 3.53 },
  },
  TyG: {
    system: "metabolism",
    range: { optimal_min: 8.0, optimal_max: 8.5, normal_min: 7.5, normal_max: 9.0 },
  },
  AIP: {
    system: "cardiovascular",
    range: { optimal_min: -0.3, optimal_max: 0.1, normal_min: -0.5, normal_max: 0.24 },
  },
  HOMA_IR: {
    system: "metabolism",
    range: { optimal_min: 0.5, optimal_max: 1.5, normal_min: null, normal_max: 2.7, is_critical: true },
  },
  eGFR: {
    system: "metabolism",
    range: { optimal_min: 90, optimal_max: 120, normal_min: 60, normal_max: null, is_critical: true },
  },
  DeRitis: {
    system: "metabolism",
    range: { optimal_min: 0.9, optimal_max: 1.3, normal_min: 0.6, normal_max: 1.7 },
  },
  Fib4: {
    system: "metabolism",
    range: { optimal_min: 0.5, optimal_max: 1.3, normal_min: null, normal_max: 2.67, is_critical: true },
  },
};

export function computeDerivedMarkers(d: DerivedInputs): MarkerInput[] {
  const out: MarkerInput[] = [];

  // NLR = neut / lymph (по абсолютным)
  if (isPos(d.neut_abs) && isPos(d.lymph_abs)) {
    out.push(make("NLR", d.neut_abs! / d.lymph_abs!));
  }

  // TyG = ln( TG[mg/dL] · GLU[mg/dL] / 2 ); конвертация: TG ммоль→мг/дл ×88.57, GLU ×18.0182
  if (isPos(d.tg) && isPos(d.glu)) {
    const tgMg = d.tg! * 88.57;
    const gluMg = d.glu! * 18.0182;
    out.push(make("TyG", Math.log((tgMg * gluMg) / 2)));
  }

  // AIP = log10( TG / HDL ) — обе в ммоль/л
  if (isPos(d.tg) && isPos(d.hdl)) {
    out.push(make("AIP", Math.log10(d.tg! / d.hdl!)));
  }

  // HOMA-IR = INS · GLU(ммоль/л) / 22.5
  if (isPos(d.ins) && isPos(d.glu)) {
    out.push(make("HOMA_IR", (d.ins! * d.glu!) / 22.5));
  }

  // eGFR CKD-EPI 2021 (без расы), креатинин в мг/дл
  if (isPos(d.creat_umol) && isPos(d.age) && d.sex) {
    const scr = d.creat_umol! / 88.4; // мкмоль/л → мг/дл
    const k = d.sex === "female" ? 0.7 : 0.9;
    const a = d.sex === "female" ? -0.241 : -0.302;
    const ratio = scr / k;
    const minTerm = Math.min(ratio, 1) ** a;
    const maxTerm = Math.max(ratio, 1) ** -1.2;
    const ageTerm = 0.9938 ** d.age!;
    const sexMult = d.sex === "female" ? 1.012 : 1;
    out.push(make("eGFR", 142 * minTerm * maxTerm * ageTerm * sexMult));
  }

  // de Ritis = AST/ALT
  if (isPos(d.ast) && isPos(d.alt)) {
    out.push(make("DeRitis", d.ast! / d.alt!));
  }

  // Fib-4 = (age · AST) / (PLT · √ALT)
  if (isPos(d.age) && isPos(d.ast) && isPos(d.plt) && isPos(d.alt)) {
    out.push(make("Fib4", (d.age! * d.ast!) / (d.plt! * Math.sqrt(d.alt!))));
  }

  return out;
}

function isPos(x: number | undefined): x is number {
  return typeof x === "number" && Number.isFinite(x) && x > 0;
}

function make(code: keyof typeof RANGES | string, value: number): MarkerInput {
  const meta = RANGES[code as keyof typeof RANGES];
  return { code, value, system: meta.system, range: meta.range };
}

export const DERIVED_RANGES = RANGES;
