import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pill, Zap, Flame, Heart, Brain, Activity, Droplet,
  Leaf, FlaskConical, Sun, Moon, Apple, Dumbbell, Sparkles,
  Beaker, TestTube, Atom, Microscope, Stethoscope, Salad,
} from "lucide-react";
import { getBiomarkerCategoryIcon } from "@/lib/categoryIcons";
import { useTheme } from "next-themes";

interface ActionMapItem {
  prescription_name: string;
  systems: string[];
  biomarker_codes: string[];
  expected_effect: string;
  effect_eta: string;
}

interface Props {
  actions: ActionMapItem[];
  systems: string[];
}

/**
 * Активная карта действий — сетевой flow «препарат → система».
 * Левая колонка: гексагоны препаратов (1-2 ряда).
 * Правая часть: целевые системы как гексагоны-приёмники.
 * Связи — кривые Безье с анимированным потоком.
 */

const PRESC_COLORS = [
  { stroke: "#a78bfa", fill: "#8b5cf6" }, // violet
  { stroke: "#60a5fa", fill: "#3b82f6" }, // blue
  { stroke: "#f87171", fill: "#ef4444" }, // red (HCl)
  { stroke: "#34d399", fill: "#10b981" }, // emerald
  { stroke: "#fbbf24", fill: "#f59e0b" }, // amber
  { stroke: "#22d3ee", fill: "#06b6d4" }, // cyan
  { stroke: "#f472b6", fill: "#ec4899" }, // pink
  { stroke: "#c084fc", fill: "#a855f7" }, // purple
];

const SYSTEM_COLORS: Record<string, { stroke: string; fill: string; Icon: any }> = {
  default: { stroke: "#a78bfa", fill: "#8b5cf6", Icon: Activity },
};

function pickSystemMeta(name: string) {
  const n = name.toLowerCase();
  const Icon = getBiomarkerCategoryIcon(name);
  if (n.includes("энерг") || n.includes("восст"))
    return { stroke: "#fbbf24", fill: "#f59e0b", Icon };
  if (n.includes("воспал") || n.includes("иммун"))
    return { stroke: "#34d399", fill: "#10b981", Icon };
  if (n.includes("сердеч") || n.includes("сосуд"))
    return { stroke: "#fb7185", fill: "#e11d48", Icon };
  if (n.includes("эндокр") || n.includes("стресс") || n.includes("нерв") || n.includes("гормон"))
    return { stroke: "#a78bfa", fill: "#8b5cf6", Icon };
  if (n.includes("метабол") || n.includes("деток"))
    return { stroke: "#60a5fa", fill: "#3b82f6", Icon };
  return { ...SYSTEM_COLORS.default, Icon };
}

function hexPath(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2; // pointy-top
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function pickPrescIcon(name: string) {
  const n = name.toLowerCase();
  if (/(омега|omega|epa|dha|рыб)/.test(n)) return Droplet;
  if (/(вит.*d|витамин d|d3|холекаль)/.test(n)) return Sun;
  if (/(вит.*b|витамин b|b12|b6|b9|фолиев|folate|метилкоб)/.test(n)) return Atom;
  if (/(вит.*c|витамин c|аскорб)/.test(n)) return Apple;
  if (/(магн|\bmg\b|magn)/.test(n)) return Sparkles;
  if (/(цинк|\bzn\b|zinc|селен|\bse\b|йод|\bi2?\b)/.test(n)) return Beaker;
  if (/(железо|\bfe\b|iron|ферр)/.test(n)) return FlaskConical;
  if (/(коэнз|coq|q10|убихин)/.test(n)) return Zap;
  if (/(куркум|ресверат|кверцет|полифен|антиокс)/.test(n)) return Leaf;
  if (/(пробио|лакто|бифидо|кишеч|псил|клетч)/.test(n)) return Salad;
  if (/(мелатон|сон|sleep)/.test(n)) return Moon;
  if (/(статин|липид|холест|нэк|niacin)/.test(n)) return Heart;
  if (/(метформ|берберин|инсулин|глюкоз)/.test(n)) return TestTube;
  if (/(адаптог|ашваг|родиол|стресс|нерв)/.test(n)) return Brain;
  if (/(спорт|трен|нагруз|кардио|hiit)/.test(n)) return Dumbbell;
  if (/(анализ|чек.?ап|осмотр|обследов)/.test(n)) return Stethoscope;
  if (/(гормон|тест.*стер|днэа|щитов)/.test(n)) return Microscope;
  return Pill;
}

/**
 * Сокращение названия нутрицевтика до международного обозначения,
 * если оно общеизвестно. Иначе — короткое русское имя.
 */
function getShortLabel(raw: string) {
  const t = raw.trim();
  const n = t.toLowerCase();
  // Витамины
  if (/витамин\s*d3|d-?3|холекаль/.test(n)) return "Vit D3";
  if (/витамин\s*d\b/.test(n)) return "Vit D";
  if (/витамин\s*c|аскорб/.test(n)) return "Vit C";
  if (/витамин\s*k2|менахин/.test(n)) return "Vit K2";
  if (/витамин\s*k\b/.test(n)) return "Vit K";
  if (/витамин\s*a\b|ретинол/.test(n)) return "Vit A";
  if (/витамин\s*e\b|токофер/.test(n)) return "Vit E";
  if (/b\s*12|метилкоб|цианкоб/.test(n)) return "B12";
  if (/b\s*9|фолиев|folate|метилфол/.test(n)) return "B9";
  if (/b\s*6|пиридокс/.test(n)) return "B6";
  if (/b\s*1|тиамин/.test(n)) return "B1";
  if (/b\s*2|рибофлав/.test(n)) return "B2";
  if (/b\s*3|ниацин|никотин/.test(n)) return "B3";
  if (/b\s*5|пантотен/.test(n)) return "B5";
  if (/(b-?комплекс|витамины\s*группы\s*b)/.test(n)) return "B-комплекс";
  // Минералы
  if (/магн|\bmg\b/.test(n)) return "Mg";
  if (/цинк|\bzn\b/.test(n)) return "Zn";
  if (/селен|\bse\b/.test(n)) return "Se";
  if (/железо|\bfe\b|iron|ферр/.test(n)) return "Fe";
  if (/йод|\biod|\bi\b/.test(n)) return "I";
  if (/кальц|\bca\b/.test(n)) return "Ca";
  if (/калий|\bk\b\s*\(/.test(n)) return "K";
  if (/хром|\bcr\b/.test(n)) return "Cr";
  if (/медь|\bcu\b/.test(n)) return "Cu";
  // Прочее популярное
  if (/омега.?3|epa.*dha|dha.*epa|рыбий\s*жир/.test(n)) return "Omega-3";
  if (/коэнз|coq.?10|убихин/.test(n)) return "CoQ10";
  if (/куркум/.test(n)) return "Куркумин";
  if (/ресверат/.test(n)) return "Ресвератрол";
  if (/мелатон/.test(n)) return "Мелатонин";
  if (/пробио/.test(n)) return "Пробиотики";
  if (/ашваг/.test(n)) return "Ашваганда";
  if (/родиол/.test(n)) return "Родиола";
  if (/глутатион/.test(n)) return "Glutathione";
  if (/nac|n-?ацетил|ацетилцист/.test(n)) return "NAC";
  if (/тестосте?рон/.test(n)) return "Testo";
  if (/мет(ф|ph)ормин/.test(n)) return "Metformin";
  if (/берберин/.test(n)) return "Berberine";
  if (/статин/.test(n)) return "Statin";
  if (t.length <= 14) return t;
  return t.slice(0, 13) + "…";
}

export function ActionMap({ actions, systems }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [hovered, setHovered] = useState<string | null>(null);

  // Build target system list — все 5 систем организма (или те, что переданы)
  const targetSystems = useMemo(() => {
    const fromActions = new Set<string>();
    for (const a of actions) for (const s of a.systems || []) fromActions.add(s);
    // приоритет: переданные категории + всё, что упомянуто в назначениях
    const merged: string[] = [];
    for (const s of systems) if (!merged.includes(s)) merged.push(s);
    for (const s of fromActions) if (!merged.includes(s)) merged.push(s);
    return merged.slice(0, 6);
  }, [actions, systems]);

  // Сортируем назначения по их главной системе — для логичной раскладки
  const items = useMemo(() => {
    const order = new Map(targetSystems.map((s, i) => [s, i] as const));
    return [...actions]
      .sort((a, b) => {
        const ai = a.systems?.[0] ? order.get(a.systems[0]) ?? 999 : 999;
        const bi = b.systems?.[0] ? order.get(b.systems[0]) ?? 999 : 999;
        return ai - bi;
      })
      .slice(0, 10);
  }, [actions, targetSystems]);

  // Layout — широкая канва на всю ширину
  const W = 1200;
  const H = 480;
  const padX = 90;
  const padY = 50;

  // Колонка препаратов слева — 1 или 2 ряда, упорядочены по системе-цели
  const prescNodes = useMemo(() => {
    const n = items.length;
    if (n === 0) return [];
    const cols = n <= 5 ? 1 : 2;
    const rows = Math.ceil(n / cols);
    const colW = (W * 0.5 - padX) / Math.max(cols, 1);
    const rowH = (H - padY * 2) / Math.max(rows - 1, 1);
    return items.map((a, i) => {
      const r = i % rows;
      const c = Math.floor(i / rows);
      const x = padX + c * colW + colW * 0.5;
      const y = rows === 1 ? H / 2 : padY + r * rowH;
      const palette = PRESC_COLORS[i % PRESC_COLORS.length];
      return { action: a, x, y, ...palette };
    });
  }, [items]);

  // Системы — справа, равномерно распределены по высоте
  const sysNodes = useMemo(() => {
    if (targetSystems.length === 0) return [];
    const rowH = (H - padY * 2) / Math.max(targetSystems.length - 1, 1);
    return targetSystems.map((s, i) => {
      const meta = pickSystemMeta(s);
      const y = targetSystems.length === 1 ? H / 2 : padY + i * rowH;
      return { name: s, x: W - padX, y, ...meta };
    });
  }, [targetSystems]);

  const hoveredAction = items.find((a) => a.prescription_name === hovered);

  // Build connections
  const connections = useMemo(() => {
    const cs: Array<{
      from: { x: number; y: number };
      to: { x: number; y: number };
      stroke: string;
      key: string;
      prescName: string;
      sysName: string;
    }> = [];
    for (const p of prescNodes) {
      for (const s of p.action.systems || []) {
        const target = sysNodes.find((sn) => sn.name === s);
        if (!target) continue;
        cs.push({
          from: { x: p.x, y: p.y },
          to: { x: target.x, y: target.y },
          stroke: p.stroke,
          key: `${p.action.prescription_name}__${s}`,
          prescName: p.action.prescription_name,
          sysName: s,
        });
      }
    }
    return cs;
  }, [prescNodes, sysNodes]);

  return (
    <Card className="relative overflow-hidden rounded-2xl border dark:border-white/10 border-slate-200/60 dark:bg-white/[0.03] bg-white/60 backdrop-blur-xl dark:shadow-2xl shadow-xl shadow-slate-200/50 transition-colors duration-300">
      <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full dark:bg-violet-500/10 bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full dark:bg-amber-500/10 bg-amber-200/30 blur-3xl pointer-events-none" />

      <CardContent className="relative p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg md:text-xl font-bold dark:text-white text-slate-900 font-display">
              Активная карта действий
            </h3>
            <p className="text-xs dark:text-white/55 text-slate-500 mt-1">
              {items.length === 0
                ? "Нет активных назначений"
                : `${items.length} назначений · ${targetSystems.length} систем-целей`}
            </p>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full dark:bg-white/5 bg-white/70 border dark:border-white/10 border-slate-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono-tech dark:text-white/70 text-slate-600">LIVE</span>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Pill className="h-10 w-10 dark:text-white/30 text-slate-300" />
            <p className="text-xs dark:text-white/40 text-slate-400">Назначений пока нет</p>
          </div>
        ) : (
          <div className="relative">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 520 }}>
              <defs>
                {/* Gradient for each connection: from prescription color to target indigo */}
                {connections.map((c, i) => (
                  <linearGradient
                    key={`cgrad-${i}`}
                    id={`cgrad-${i}`}
                    x1={c.from.x}
                    y1={c.from.y}
                    x2={c.to.x}
                    y2={c.to.y}
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor={c.stroke} stopOpacity={isDark ? 0.95 : 0.85} />
                    <stop
                      offset="100%"
                      stopColor={isDark ? "#a78bfa" : "#6366f1"}
                      stopOpacity={isDark ? 0.85 : 0.7}
                    />
                  </linearGradient>
                ))}
                {/* Hex fill gradients per prescription */}
                {prescNodes.map((p, i) => (
                  <radialGradient key={`pgrad-${i}`} id={`pgrad-${i}`} cx="50%" cy="40%" r="65%">
                    <stop offset="0%" stopColor={p.stroke} stopOpacity={isDark ? 0.55 : 0.35} />
                    <stop offset="100%" stopColor={p.fill} stopOpacity={isDark ? 0.18 : 0.10} />
                  </radialGradient>
                ))}
                {/* Hex fill gradients per system */}
                {sysNodes.map((s, i) => (
                  <radialGradient key={`sgrad-${i}`} id={`sgrad-${i}`} cx="50%" cy="40%" r="65%">
                    <stop offset="0%" stopColor={s.stroke} stopOpacity={isDark ? 0.6 : 0.4} />
                    <stop offset="100%" stopColor={s.fill} stopOpacity={isDark ? 0.22 : 0.12} />
                  </radialGradient>
                ))}
                <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Connection curves */}
              {connections.map((c, i) => {
                const isActive = hovered === c.prescName;
                const isDimmed = hovered && !isActive;
                const dx = c.to.x - c.from.x;
                const cp1x = c.from.x + dx * 0.45;
                const cp2x = c.from.x + dx * 0.55;
                const path = `M ${c.from.x} ${c.from.y} C ${cp1x} ${c.from.y}, ${cp2x} ${c.to.y}, ${c.to.x} ${c.to.y}`;
                return (
                  <g
                    key={c.key}
                    style={{
                      opacity: isDimmed ? 0.12 : isActive ? 1 : isDark ? 0.7 : 0.55,
                      transition: "opacity 0.25s",
                    }}
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke={`url(#cgrad-${i})`}
                      strokeWidth={isActive ? 2.4 : 1.4}
                      strokeLinecap="round"
                      strokeDasharray="5 4"
                      style={{ transition: "stroke-width 0.25s" }}
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="-18"
                        dur={isActive ? "0.7s" : "2.4s"}
                        repeatCount="indefinite"
                      />
                    </path>
                    {isActive && (
                      <circle r={3} fill={c.stroke}>
                        <animateMotion dur="1.1s" repeatCount="indefinite" path={path} />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Prescription hexagons */}
              {prescNodes.map((p, i) => {
                const isActive = hovered === p.action.prescription_name;
                const isDimmed = hovered && !isActive;
                const r = isActive ? 30 : 27;
                const PIcon = pickPrescIcon(p.action.prescription_name);
                return (
                  <g
                    key={`p-${i}`}
                    style={{
                      opacity: isDimmed ? 0.35 : 1,
                      transition: "opacity 0.25s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={() => setHovered(p.action.prescription_name)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {isActive && (
                      <path
                        d={hexPath(p.x, p.y, r + 8)}
                        fill={p.stroke}
                        opacity={isDark ? 0.18 : 0.12}
                      />
                    )}
                    <path
                      d={hexPath(p.x, p.y, r)}
                      fill={`url(#pgrad-${i})`}
                      stroke={p.stroke}
                      strokeWidth={isActive ? 1.8 : 1.2}
                      style={{
                        transition: "all 0.25s",
                        filter: isActive
                          ? `drop-shadow(0 0 10px ${p.stroke}aa)`
                          : isDark
                          ? `drop-shadow(0 0 4px ${p.stroke}55)`
                          : "none",
                      }}
                    />
                    <foreignObject x={p.x - 13} y={p.y - 13} width={26} height={26} style={{ pointerEvents: "none" }}>
                      <div className="w-full h-full flex items-center justify-center">
                        <PIcon
                          style={{
                            width: 19,
                            height: 19,
                            color: isDark ? "#fff" : p.stroke,
                          }}
                          strokeWidth={2.2}
                        />
                      </div>
                    </foreignObject>
                    <text
                      x={p.x}
                      y={p.y + r + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      fill={isDark ? "rgba(255,255,255,0.78)" : "#475569"}
                      style={{ pointerEvents: "none" }}
                    >
                      {getShortLabel(p.action.prescription_name)}
                    </text>
                  </g>
                );
              })}

              {/* Target system hexagons */}
              {sysNodes.map((s, i) => {
                const linkedHover =
                  hovered &&
                  prescNodes.find(
                    (p) =>
                      p.action.prescription_name === hovered &&
                      (p.action.systems || []).includes(s.name),
                  );
                const isDimmed = hovered && !linkedHover;
                const r = linkedHover ? 30 : 27;
                const Icon = s.Icon;
                return (
                  <g
                    key={`s-${i}`}
                    style={{
                      opacity: isDimmed ? 0.4 : 1,
                      transition: "opacity 0.25s",
                    }}
                  >
                    {linkedHover && (
                      <path
                        d={hexPath(s.x, s.y, r + 9)}
                        fill={s.stroke}
                        opacity={isDark ? 0.2 : 0.14}
                      />
                    )}
                    <path
                      d={hexPath(s.x, s.y, r)}
                      fill={`url(#sgrad-${i})`}
                      stroke={s.stroke}
                      strokeWidth={linkedHover ? 1.8 : 1.3}
                      style={{
                        transition: "all 0.25s",
                        filter: linkedHover
                          ? `drop-shadow(0 0 12px ${s.stroke}cc)`
                          : isDark
                          ? `drop-shadow(0 0 5px ${s.stroke}66)`
                          : "none",
                      }}
                    />
                    <foreignObject x={s.x - 12} y={s.y - 12} width={24} height={24}>
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon
                          style={{
                            width: 18,
                            height: 18,
                            color: isDark ? "#fff" : s.stroke,
                          }}
                          strokeWidth={2.2}
                        />
                      </div>
                    </foreignObject>
                    <text
                      x={s.x}
                      y={s.y + r + 14}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="Inter, sans-serif"
                      fontWeight={600}
                      fill={isDark ? "rgba(255,255,255,0.85)" : "#334155"}
                    >
                      {getShortLabel(s.name)}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip / detail panel */}
            <div className="mt-3 min-h-[88px]">
              {hoveredAction ? (
                <div
                  className="p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-200 border"
                  style={{
                    background: "#1E293B",
                    borderColor: "rgba(255,255,255,0.10)",
                    color: "#fff",
                    borderRadius: 8,
                  }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="text-sm font-semibold text-white font-display">
                      {hoveredAction.prescription_name}
                    </div>
                    <span className="text-[10px] text-slate-300 whitespace-nowrap font-mono-tech px-2 py-0.5 rounded bg-white/10">
                      ETA {hoveredAction.effect_eta}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {hoveredAction.expected_effect}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hoveredAction.biomarker_codes.slice(0, 6).map((code) => (
                      <span
                        key={code}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-mono-tech bg-white/10 text-white/90 border border-white/15"
                      >
                        {code}
                      </span>
                    ))}
                    {hoveredAction.systems.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded-md text-[10px] bg-violet-500/25 text-violet-100 border border-violet-300/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-dashed dark:border-white/10 border-slate-200 text-center">
                  <p className="text-[11px] dark:text-white/45 text-slate-400">
                    Поток препарат → система. Наведите на узел, чтобы увидеть прогноз нормализации.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
