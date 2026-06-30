import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Info, Trash2, Pencil } from "lucide-react";
import { RejuvenationTrajectory } from "./RejuvenationTrajectory";
import { RoadmapTimeline } from "./RoadmapTimeline";
import { ExpectationsTimeline } from "./ExpectationsTimeline";
import { ActionMap } from "./ActionMap";

interface Explanation {
  formula: {
    anchor: number;
    slope: number;
    base_bio_age: number;
    ai_delta: number;
    ai_corridor: number;
    final_bio_age: number;
    chronological_age: number;
    health_index: number;
  };
  health_index?: {
    value: number;
    total_deviations: number;
    total_markers: number;
    optimal_share_pct?: number;
    breakdown?: string[];
    top_deviations: Array<{
      name: string;
      code: string;
      value: number;
      unit: string;
      category: string;
      optimal_min: number | null;
      optimal_max: number | null;
      deviation_pct: number;
    }>;
  };
  system_ratings?: Array<{
    category: string;
    score: number | null;
    deviated: number;
    total: number;
    rationale: string;
  }>;
  drivers?: string[];
  aging_pace?: {
    pace_bio_years_per_year: number | null;
    trend: "improving" | "stable" | "worsening" | "insufficient_data";
    samples: number;
    window_months: number | null;
    note?: string;
  } | null;
  trajectory_v2?: {
    horizons: Array<{
      months: 3 | 6 | 12;
      projected_bio_age: number;
      projected_health_index: number;
      ba_delta: number;
      hi_delta: number;
    }>;
    assumptions: string[];
  } | null;
  explainability?: {
    top_negative?: Array<{ code: string; system: string | null; contribution: number; zone?: string }>;
    top_positive?: Array<{ code: string; system: string | null; contribution: number; zone?: string }>;
    per_system?: Record<string, { code: string; contribution: number; zone?: string }>;
    total_negative_load?: number;
    total_positive_anchor?: number;
  } | null;
}

interface PreviewPayload {
  analysis_id: string;
  current_bio_age: number;
  chronological_age: number;
  target_bio_age: number;
  health_index: number | null;
  rationale: string | null;
  system_goals: any[];
  action_map: any[];
  cohort_percentile?: number | null;
  cohort_label?: string | null;
  trajectory?: any;
  roadmap?: any[];
  key_biomarkers?: any;
  expectations?: any[];
  analyses_per_year?: number | null;
  adherence_pct?: number | null;
  explanation?: Explanation | null;
}

interface Props {
  open: boolean;
  data: PreviewPayload | null;
  startDate: string;
  nextCheckupDate: string | null;
  categories: string[];
  publishing: boolean;
  mode?: "preview" | "edit";
  onCancel: () => void;
  onPublish: (edited: any) => void;
}

export function StrategyPreviewDialog({
  open,
  data,
  startDate,
  nextCheckupDate,
  categories,
  publishing,
  mode = "preview",
  onCancel,
  onPublish,
}: Props) {
  const [bio, setBio] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [hi, setHi] = useState<string>("");
  const [chrono, setChrono] = useState<string>("");
  const [perYear, setPerYear] = useState<string>("");
  const [rationale, setRationale] = useState<string>("");
  const [roadmap, setRoadmap] = useState<any[]>([]);
  const [expectations, setExpectations] = useState<any[]>([]);
  const [systemRatings, setSystemRatings] = useState<any[]>([]);
  const [systemGoalsJson, setSystemGoalsJson] = useState<string>("[]");
  const [actionMapJson, setActionMapJson] = useState<string>("[]");
  const [keyBiomarkersJson, setKeyBiomarkersJson] = useState<string>("{}");
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  const dataKey = data?.analysis_id ?? "";

  useEffect(() => {
    if (!data) return;
    setBio(data.current_bio_age != null ? Number(data.current_bio_age).toFixed(1) : "");
    setTarget(data.target_bio_age != null ? Number(data.target_bio_age).toFixed(1) : "");
    setHi(data.health_index != null ? String(Math.round(Number(data.health_index))) : "");
    setChrono(data.chronological_age != null ? Number(data.chronological_age).toFixed(1) : "");
    setPerYear(String(data.analyses_per_year ?? ""));
    setRationale(data.rationale ?? "");
    setRoadmap(Array.isArray(data.roadmap) ? JSON.parse(JSON.stringify(data.roadmap)) : []);
    setExpectations(Array.isArray(data.expectations) ? JSON.parse(JSON.stringify(data.expectations)) : []);
    setSystemRatings(Array.isArray(data.explanation?.system_ratings) ? JSON.parse(JSON.stringify(data.explanation.system_ratings)) : []);
    setSystemGoalsJson(JSON.stringify(data.system_goals ?? [], null, 2));
    setActionMapJson(JSON.stringify(data.action_map ?? [], null, 2));
    setKeyBiomarkersJson(JSON.stringify(data.key_biomarkers ?? {}, null, 2));
    setJsonErrors({});
  }, [dataKey]);

  if (!data) return null;
  const exp = data.explanation ?? null;
  const isEdit = mode === "edit";
  const drivers = Array.isArray(exp?.drivers) ? exp.drivers : [];
  const topDeviations = Array.isArray(exp?.health_index?.top_deviations) ? exp.health_index.top_deviations : [];
  const healthBreakdown = Array.isArray(exp?.health_index?.breakdown) ? exp.health_index.breakdown : [];
  const trajectoryHorizons = Array.isArray(exp?.trajectory_v2?.horizons) ? exp.trajectory_v2.horizons : [];
  const trajectoryAssumptions = Array.isArray(exp?.trajectory_v2?.assumptions) ? exp.trajectory_v2.assumptions : [];
  const topNegativeDrivers = Array.isArray(exp?.explainability?.top_negative) ? exp.explainability.top_negative : [];
  const topPositiveDrivers = Array.isArray(exp?.explainability?.top_positive) ? exp.explainability.top_positive : [];
  const actionMapPreview = safeParseSilent(actionMapJson);

  const safeParse = (raw: string, fallback: any, key: string) => {
    try {
      const v = JSON.parse(raw);
      setJsonErrors((e) => { const n = { ...e }; delete n[key]; return n; });
      return v;
    } catch (err: any) {
      setJsonErrors((e) => ({ ...e, [key]: err.message }));
      return fallback;
    }
  };

  const handlePublish = () => {
    const sg = safeParse(systemGoalsJson, data.system_goals, "system_goals");
    const am = safeParse(actionMapJson, data.action_map, "action_map");
    const kb = safeParse(keyBiomarkersJson, data.key_biomarkers, "key_biomarkers");
    if (Object.keys(jsonErrors).length > 0) return;

    onPublish({
      analysis_id: data.analysis_id,
      current_bio_age: Number(bio),
      chronological_age: Number(chrono),
      target_bio_age: Number(target),
      health_index: hi === "" ? null : Number(hi),
      rationale: rationale.trim(),
      system_goals: sg,
      action_map: am,
      cohort_percentile: data.cohort_percentile ?? null,
      cohort_label: data.cohort_label ?? null,
      trajectory: data.trajectory ?? null,
      roadmap,
      key_biomarkers: kb,
      expectations,
      analyses_per_year: perYear === "" ? null : Number(perYear),
      system_ratings: systemRatings,
    });
  };

  const editedBio = Number(bio);
  const editedHi = hi === "" ? 0 : Number(hi);

  const updateRoadmap = (i: number, patch: any) => {
    setRoadmap((r) => r.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const removeRoadmap = (i: number) => setRoadmap((r) => r.filter((_, idx) => idx !== i));

  const updateExpectation = (i: number, patch: any) => {
    setExpectations((r) => r.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };
  const removeExpectation = (i: number) => setExpectations((r) => r.filter((_, idx) => idx !== i));

  const updateRating = (i: number, patch: any) => {
    setSystemRatings((r) => r.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
            {isEdit ? "Редактирование стратегии (без перерасчёта)" : "Предпросмотр стратегии перед публикацией"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Меняйте любые поля напрямую — изменения сохранятся новой версией стратегии без вызова ИИ."
              : "Проверьте расчёт, при необходимости отредактируйте любые поля и опубликуйте клиенту. Пока не нажмёте «Опубликовать» — клиент видит прежнюю стратегию."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="health" className="flex-1 min-h-0 flex flex-col">
          <div className="px-5 pt-3 border-b">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted">
              <TabsTrigger value="health">Моё здоровье</TabsTrigger>
              <TabsTrigger value="strategy">Стратегия здоровья</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <TabsContent value="health" className="mt-0">
              <div className="p-5 space-y-5">
                {/* Что повлияло на расчёт */}
                <Card className="border-primary/30 bg-primary/[0.04]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Info className="h-4 w-4 text-primary" /> Что повлияло на расчёт
                    </div>
                    {exp ? (
                      <>
                        <ul className="text-sm space-y-1 text-foreground/85">
                          {drivers.map((d, i) => <li key={i}>• {d}</li>)}
                        </ul>
                        {topDeviations.length > 0 && (
                          <div className="pt-2">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">
                              Топ-{topDeviations.length} отклонений (из {exp.health_index?.total_deviations ?? topDeviations.length})
                            </div>
                            <div className="space-y-1.5">
                              {topDeviations.map((d) => (
                                <div key={d.code} className="flex items-center justify-between text-xs gap-2 py-1 px-2 rounded bg-background/50">
                                  <span className="truncate">{d.name} <span className="text-muted-foreground">({d.code})</span></span>
                                  <span className="flex items-center gap-2 shrink-0">
                                    <span className="text-foreground/80">{d.value} {d.unit}</span>
                                    <Badge variant="destructive" className="text-[10px]">
                                      {d.deviation_pct >= 0 ? "+" : ""}{d.deviation_pct}%
                                    </Badge>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Расшифровка факторов не сохраняется в БД. Нажмите «Пересчитать», чтобы получить актуальные drivers и топ-отклонения.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* HI breakdown — show only if it adds info beyond drivers */}
                {healthBreakdown.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm font-semibold">Как сложился индекс здоровья</div>
                      <ul className="text-sm space-y-1 text-foreground/85">
                        {healthBreakdown.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Core editable — health metrics */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">Ключевые цифры здоровья</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Field label="Хронологический возраст">
                          <Input type="number" value={chrono} readOnly disabled className="bg-muted/40" />
                        </Field>
                        <p className="text-[11px] text-muted-foreground mt-1">считается автоматически по дате рождения</p>
                      </div>
                      <div>
                        <Field label="Биологический возраст">
                          <Input type="number" step="0.1" placeholder="23.4" value={bio} onChange={(e) => setBio(e.target.value)} />
                        </Field>
                        <p className="text-[11px] text-muted-foreground mt-1">итог расчёта — это число увидит клиент</p>
                      </div>
                      <div>
                        <Field label="Индекс здоровья">
                          <Input type="number" step="1" min="0" max="100" placeholder="0–100" value={hi} onChange={(e) => setHi(e.target.value)} />
                        </Field>
                        <p className="text-[11px] text-muted-foreground mt-1">доля показателей в норме, с учётом важности</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Aging pace (M6) */}
                {exp?.aging_pace && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm font-semibold">Темп старения</div>
                      {exp.aging_pace.pace_bio_years_per_year != null ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-semibold">
                              {exp.aging_pace.pace_bio_years_per_year.toFixed(2)}
                              <span className="text-sm text-muted-foreground font-normal ml-1">биолет / год</span>
                            </div>
                            <Badge variant={paceBadgeVariant(exp.aging_pace.trend)}>
                              {paceTrendLabel(exp.aging_pace.trend)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            По истории {exp.aging_pace.samples} анализов
                            {exp.aging_pace.window_months ? ` за последние ${exp.aging_pace.window_months} мес.` : ""}
                            {" "}— значения &lt;1.0 означают замедление старения, &gt;1.0 — ускорение.
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {exp.aging_pace.note ?? "Недостаточно данных. Нужно минимум 2 анализа."}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Trajectory v2 (M7) */}
                {trajectoryHorizons.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm font-semibold">Прогноз траектории</div>
                      <div className="text-xs text-muted-foreground">
                        Ожидаемое значение био-возраста и индекса здоровья с учётом активных назначений.
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        {trajectoryHorizons.map((h) => (
                          <div key={h.months} className="rounded-md bg-background/60 p-3 space-y-1">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              через {h.months} мес.
                            </div>
                            <div className="text-sm font-semibold">
                              BA {h.projected_bio_age.toFixed(1)}{" "}
                              <span className={`text-[11px] font-normal ${h.ba_delta <= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                                ({h.ba_delta >= 0 ? "+" : ""}{h.ba_delta.toFixed(2)})
                              </span>
                            </div>
                            <div className="text-xs">
                              HI {Math.round(h.projected_health_index)}{" "}
                              <span className={`text-[11px] ${h.hi_delta >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                                ({h.hi_delta >= 0 ? "+" : ""}{h.hi_delta.toFixed(1)})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {trajectoryAssumptions.length > 0 && (
                        <ul className="text-[11px] text-muted-foreground pt-2 space-y-0.5">
                          {trajectoryAssumptions.map((a, i) => <li key={i}>• {a}</li>)}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Explainability (M8) — top drivers */}
                {(topNegativeDrivers.length > 0 || topPositiveDrivers.length > 0) && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="text-sm font-semibold">Драйверы здоровья</div>
                      <div className="text-xs text-muted-foreground">
                        Маркеры, которые сильнее всего тянут балл вниз или удерживают его наверху.
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wide text-destructive">Минусы</div>
                          {topNegativeDrivers.length > 0 ? topNegativeDrivers.map((m) => (
                            <div key={m.code} className="text-xs flex items-center justify-between gap-2 py-1 px-2 rounded bg-background/50">
                              <span className="truncate">{m.code} {m.system && <span className="text-muted-foreground">({m.system})</span>}</span>
                              <Badge variant="destructive" className="text-[10px] shrink-0">−{Number(m.contribution).toFixed(2)}</Badge>
                            </div>
                          )) : <div className="text-[11px] text-muted-foreground">—</div>}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wide text-emerald-600">Плюсы</div>
                          {topPositiveDrivers.length > 0 ? topPositiveDrivers.map((m) => (
                            <div key={m.code} className="text-xs flex items-center justify-between gap-2 py-1 px-2 rounded bg-background/50">
                              <span className="truncate">{m.code} {m.system && <span className="text-muted-foreground">({m.system})</span>}</span>
                              <Badge className="text-[10px] shrink-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">+{Number(m.contribution).toFixed(2)}</Badge>
                            </div>
                          )) : <div className="text-[11px] text-muted-foreground">—</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* System ratings — editable, always shown */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="text-sm font-semibold">Рейтинги систем организма</div>
                    <div className="text-xs text-muted-foreground">Балл и обоснование можно менять.</div>
                    {systemRatings.length > 0 ? (
                      <div className="space-y-2 pt-1">

                        {systemRatings.map((r, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-start py-2 px-2 rounded bg-background/50">
                            <div className="col-span-12 md:col-span-4 text-sm font-medium pt-1.5">{r.category}</div>
                            <div className="col-span-4 md:col-span-2">
                              <Input
                                type="number"
                                step="1"
                                value={r.score ?? ""}
                                placeholder="—"
                                onChange={(e) => updateRating(i, { score: e.target.value === "" ? null : Number(e.target.value) })}
                              />
                            </div>
                            <div className="col-span-8 md:col-span-6">
                              <Textarea
                                rows={2}
                                value={r.rationale ?? ""}
                                onChange={(e) => updateRating(i, { rationale: e.target.value })}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pt-1">
                        Рейтинги систем не сохраняются в снапшоте. Нажмите «Пересчитать», чтобы получить актуальные значения.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>


            <TabsContent value="strategy" className="mt-0">
              <div className="p-5 space-y-5">
                {/* Strategy core */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">Цели стратегии</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Field label="Целевой био-возраст">
                        <Input type="number" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} />
                      </Field>
                      <Field label="Анализов в год (тариф)">
                        <Input type="number" step="1" value={perYear} onChange={(e) => setPerYear(e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Прогноз по траектории (показывается клиенту)">
                      <Textarea rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} />
                    </Field>
                  </CardContent>
                </Card>

                {/* Roadmap — editable, always shown */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Контрольные точки (дорожная карта)</div>
                      <Button size="sm" variant="outline" onClick={() => setRoadmap((r) => [...r, { date_iso: "", title: "", description: "" }])}>
                        + Добавить
                      </Button>
                    </div>
                    {roadmap.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {roadmap.map((r: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-start py-2 px-2 rounded bg-background/50">
                            <div className="col-span-12 md:col-span-3">
                              <Input
                                type="date"
                                value={r.date_iso || r.date || ""}
                                onChange={(e) => updateRoadmap(i, { date_iso: e.target.value, date: e.target.value })}
                              />
                            </div>
                            <div className="col-span-11 md:col-span-8 space-y-1">
                              <Input
                                value={r.title ?? r.label ?? ""}
                                placeholder="Заголовок"
                                onChange={(e) => updateRoadmap(i, { title: e.target.value })}
                              />
                              <Textarea
                                rows={2}
                                value={r.description ?? ""}
                                placeholder="Описание"
                                onChange={(e) => updateRoadmap(i, { description: e.target.value })}
                              />
                            </div>
                            <div className="col-span-1 flex justify-end pt-1.5">
                              <Button size="icon" variant="ghost" onClick={() => removeRoadmap(i)} aria-label="Удалить">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pt-1">Дорожная карта пуста. Нажмите «+ Добавить» или «Пересчитать».</p>
                    )}
                  </CardContent>
                </Card>

                {/* Expectations — editable, always shown */}
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Ожидания по организму</div>
                      <Button size="sm" variant="outline" onClick={() => setExpectations((r) => [...r, { date_iso: "", title: "", description: "" }])}>
                        + Добавить
                      </Button>
                    </div>
                    {expectations.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        {expectations.map((e: any, i: number) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-start py-2 px-2 rounded bg-background/50">
                            <div className="col-span-12 md:col-span-3">
                              <Input
                                type="date"
                                value={e.date_iso || ""}
                                onChange={(ev) => updateExpectation(i, { date_iso: ev.target.value })}
                              />
                            </div>
                            <div className="col-span-11 md:col-span-8 space-y-1">
                              <Input
                                value={e.title ?? ""}
                                placeholder="Заголовок события"
                                onChange={(ev) => updateExpectation(i, { title: ev.target.value })}
                              />
                              <Textarea
                                rows={2}
                                value={e.description ?? ""}
                                placeholder="Описание"
                                onChange={(ev) => updateExpectation(i, { description: ev.target.value })}
                              />
                            </div>
                            <div className="col-span-1 flex justify-end pt-1.5">
                              <Button size="icon" variant="ghost" onClick={() => removeExpectation(i)} aria-label="Удалить">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pt-1">Ожидания пока не заданы. Нажмите «+ Добавить» или «Пересчитать».</p>
                    )}
                  </CardContent>
                </Card>


                {/* JSON editors */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm font-semibold">Расширенное редактирование (JSON)</div>
                    <div className="text-xs text-muted-foreground">Для тонкой настройки целей по системам, плана действий и ключевых биомаркеров.</div>

                    <JsonField label="Цели по системам (system_goals)" value={systemGoalsJson} onChange={(v) => { setSystemGoalsJson(v); safeParse(v, [], "system_goals"); }} error={jsonErrors["system_goals"]} />
                    <JsonField label="План действий (action_map)" value={actionMapJson} onChange={(v) => { setActionMapJson(v); safeParse(v, [], "action_map"); }} error={jsonErrors["action_map"]} />
                    <JsonField label="Ключевые биомаркеры (key_biomarkers)" value={keyBiomarkersJson} onChange={(v) => { setKeyBiomarkersJson(v); safeParse(v, {}, "key_biomarkers"); }} error={jsonErrors["key_biomarkers"]} />
                  </CardContent>
                </Card>

                {/* Live preview */}
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-muted-foreground">Как увидит клиент</div>
                  <div className="space-y-4 pointer-events-none opacity-95">
                    <RejuvenationTrajectory
                      startDate={startDate}
                      chronologicalAge={Number(chrono) || data.chronological_age}
                      currentBioAge={isFinite(editedBio) ? editedBio : data.current_bio_age}
                      targetBioAge={Number(target) || data.target_bio_age}
                      healthIndex={hi === "" ? null : editedHi}
                      previousBioAge={null}
                      previousDate={null}
                      trajectoryPoints={(data.trajectory as any) ?? null}
                    />
                    <RoadmapTimeline
                      startDate={startDate}
                      nextCheckupDate={nextCheckupDate}
                      roadmap={roadmap}
                      keyBiomarkers={data.key_biomarkers ?? null}
                      analysesPerYear={perYear === "" ? null : Number(perYear)}
                      adherencePct={data.adherence_pct ?? null}
                    />
                    <ExpectationsTimeline
                      startDate={startDate}
                      expectations={expectations}
                    />
                    <ActionMap actions={Array.isArray(actionMapPreview) ? actionMapPreview : []} systems={categories} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 border-t gap-2">
          <Button variant="outline" onClick={onCancel} disabled={publishing}>Отменить</Button>
          <Button onClick={handlePublish} disabled={publishing || Object.keys(jsonErrors).length > 0}>
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Сохранить изменения" : "Сохранить и опубликовать клиенту"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function safeParseSilent(raw: string): any {
  try { return JSON.parse(raw); } catch { return null; }
}

function paceTrendLabel(t: string): string {
  switch (t) {
    case "improving": return "омоложение";
    case "stable": return "стабильно";
    case "worsening": return "ускорение старения";
    default: return "мало данных";
  }
}

function paceBadgeVariant(t: string): "default" | "secondary" | "destructive" | "outline" {
  switch (t) {
    case "improving": return "default";
    case "worsening": return "destructive";
    case "stable": return "secondary";
    default: return "outline";
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function JsonField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {error && <span className="text-[10px] text-destructive">JSON ошибка: {error}</span>}
      </div>
      <Textarea rows={6} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    </div>
  );
}
