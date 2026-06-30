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
  health_index: {
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
  drivers: string[];
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
    setBio(String(data.current_bio_age ?? ""));
    setTarget(String(data.target_bio_age ?? ""));
    setHi(String(data.health_index ?? ""));
    setChrono(String(data.chronological_age ?? ""));
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
  const exp = data.explanation;

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
            <Sparkles className="h-5 w-5 text-primary" />
            Предпросмотр стратегии перед публикацией
          </DialogTitle>
          <DialogDescription>
            Проверьте расчёт, при необходимости отредактируйте любые поля и опубликуйте клиенту.
            Пока не нажмёте «Опубликовать» — клиент видит прежнюю стратегию.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="p-5 space-y-5">

            {/* Explanation */}
            <Card className="border-primary/30 bg-primary/[0.04]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Info className="h-4 w-4 text-primary" /> Почему такие цифры
                </div>
                <ul className="text-sm space-y-1 text-foreground/85">
                  {exp.drivers.map((d, i) => <li key={i}>• {d}</li>)}
                </ul>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs">
                  <Stat label="Хроно" value={`${exp.formula.chronological_age} л.`} />
                  <Stat label="Health Index" value={`${exp.formula.health_index}`} />
                  <Stat label="База био" value={`${exp.formula.base_bio_age}`} />
                  <Stat label="AI δ" value={`${exp.formula.ai_delta >= 0 ? "+" : ""}${exp.formula.ai_delta}`} />
                </div>

                {exp.health_index.top_deviations.length > 0 && (
                  <div className="pt-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      Топ-{exp.health_index.top_deviations.length} отклонений (из {exp.health_index.total_deviations})
                    </div>
                    <div className="space-y-1.5">
                      {exp.health_index.top_deviations.map((d) => (
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
              </CardContent>
            </Card>

            {/* HI breakdown */}
            {Array.isArray(exp.health_index.breakdown) && exp.health_index.breakdown.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold">Индекс здоровья — разбивка</div>
                    <Badge variant="secondary" className="text-xs">{exp.health_index.value}/100</Badge>
                  </div>
                  <ul className="text-sm space-y-1 text-foreground/85">
                    {exp.health_index.breakdown.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Core editable */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-semibold">Ключевые цифры</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <Field label="Хронологический возраст">
                    <Input type="number" step="0.1" value={chrono} onChange={(e) => setChrono(e.target.value)} />
                  </Field>
                  <Field label="Новый био-возраст (к публикации)">
                    <Input type="number" step="0.1" value={bio} onChange={(e) => setBio(e.target.value)} />
                  </Field>
                  <Field label="Целевой био-возраст">
                    <Input type="number" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} />
                  </Field>
                  <Field label="Health Index">
                    <Input type="number" step="1" value={hi} onChange={(e) => setHi(e.target.value)} />
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

            {/* System ratings — editable */}
            {systemRatings.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">Рейтинги систем организма</div>
                  <div className="text-xs text-muted-foreground">Балл и обоснование можно менять.</div>
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
                </CardContent>
              </Card>
            )}

            {/* Roadmap — editable */}
            {roadmap.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">Контрольные точки (дорожная карта)</div>
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
                </CardContent>
              </Card>
            )}

            {/* Expectations — editable */}
            {expectations.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">Ожидания по организму</div>
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
                </CardContent>
              </Card>
            )}

            {/* JSON editors for arrays */}
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
                <ActionMap actions={(safeParseSilent(actionMapJson) as any[]) || []} systems={categories} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t gap-2">
          <Button variant="outline" onClick={onCancel} disabled={publishing}>Отменить</Button>
          <Button onClick={handlePublish} disabled={publishing || Object.keys(jsonErrors).length > 0}>
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить и опубликовать клиенту
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function safeParseSilent(raw: string): any {
  try { return JSON.parse(raw); } catch { return null; }
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
