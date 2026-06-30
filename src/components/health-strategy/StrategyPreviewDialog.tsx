import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Info } from "lucide-react";
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
  explanation: Explanation;
}

interface Props {
  open: boolean;
  data: PreviewPayload | null;
  startDate: string;
  nextCheckupDate: string | null;
  categories: string[];
  publishing: boolean;
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
  const [rationale, setRationale] = useState<string>("");
  const [excludedRoadmap, setExcludedRoadmap] = useState<Set<number>>(new Set());
  const [excludedExpectations, setExcludedExpectations] = useState<Set<number>>(new Set());

  // Reset state when new data arrives
  const dataKey = data?.analysis_id ?? "";
  const [lastKey, setLastKey] = useState<string>("");
  if (dataKey && dataKey !== lastKey) {
    setBio(String(data!.current_bio_age ?? ""));
    setTarget(String(data!.target_bio_age ?? ""));
    setHi(String(data!.health_index ?? ""));
    setRationale(data!.rationale ?? "");
    setExcludedRoadmap(new Set());
    setExcludedExpectations(new Set());
    setLastKey(dataKey);
  }

  if (!data) return null;

  const exp = data.explanation;

  const handlePublish = () => {
    const filteredRoadmap = Array.isArray(data.roadmap)
      ? data.roadmap.filter((_, i) => !excludedRoadmap.has(i))
      : data.roadmap;
    const filteredExpectations = Array.isArray(data.expectations)
      ? data.expectations.filter((_, i) => !excludedExpectations.has(i))
      : data.expectations;

    onPublish({
      analysis_id: data.analysis_id,
      current_bio_age: Number(bio),
      chronological_age: data.chronological_age,
      target_bio_age: Number(target),
      health_index: hi === "" ? null : Number(hi),
      rationale: rationale.trim(),
      system_goals: data.system_goals,
      action_map: data.action_map,
      cohort_percentile: data.cohort_percentile ?? null,
      cohort_label: data.cohort_label ?? null,
      trajectory: data.trajectory ?? null,
      roadmap: filteredRoadmap,
      key_biomarkers: data.key_biomarkers ?? null,
      expectations: filteredExpectations ?? [],
      analyses_per_year: data.analyses_per_year ?? null,
    });
  };

  const editedBio = Number(bio);
  const editedHi = hi === "" ? 0 : Number(hi);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Предпросмотр стратегии перед публикацией
          </DialogTitle>
          <DialogDescription>
            Проверьте расчёт, при необходимости отредактируйте ключевые цифры и опубликуйте клиенту.
            Пока не нажмёте «Опубликовать» — клиент видит прежнюю стратегию.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
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

            {/* Editable fields */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-semibold">Ручная коррекция</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Био-возраст</Label>
                    <Input type="number" step="0.1" value={bio} onChange={(e) => setBio(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Целевой био-возраст</Label>
                    <Input type="number" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Health Index</Label>
                    <Input type="number" step="1" value={hi} onChange={(e) => setHi(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Прогноз по траектории (показывается клиенту)</Label>
                  <Textarea rows={4} value={rationale} onChange={(e) => setRationale(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Roadmap exclude */}
            {Array.isArray(data.roadmap) && data.roadmap.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">Контрольные точки</div>
                  <div className="text-xs text-muted-foreground">Снимите галочки с пунктов, которые не нужно показывать клиенту.</div>
                  <div className="space-y-1.5 pt-1">
                    {data.roadmap.map((r: any, i: number) => {
                      const included = !excludedRoadmap.has(i);
                      return (
                        <label key={i} className="flex items-start gap-2 text-sm py-1 cursor-pointer">
                          <Checkbox
                            checked={included}
                            onCheckedChange={(v) => {
                              const next = new Set(excludedRoadmap);
                              if (v) next.delete(i); else next.add(i);
                              setExcludedRoadmap(next);
                            }}
                          />
                          <span className={included ? "" : "line-through opacity-50"}>
                            <span className="text-muted-foreground text-xs mr-2">{r.date_iso || r.date || ""}</span>
                            {r.title || r.label || JSON.stringify(r).slice(0, 80)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Expectations exclude */}
            {Array.isArray(data.expectations) && data.expectations.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="text-sm font-semibold">Ожидания по организму</div>
                  <div className="text-xs text-muted-foreground">Уберите события, которые не хотите показывать.</div>
                  <div className="space-y-1.5 pt-1">
                    {data.expectations.map((e: any, i: number) => {
                      const included = !excludedExpectations.has(i);
                      return (
                        <label key={i} className="flex items-start gap-2 text-sm py-1 cursor-pointer">
                          <Checkbox
                            checked={included}
                            onCheckedChange={(v) => {
                              const next = new Set(excludedExpectations);
                              if (v) next.delete(i); else next.add(i);
                              setExcludedExpectations(next);
                            }}
                          />
                          <span className={included ? "" : "line-through opacity-50"}>
                            <span className="text-muted-foreground text-xs mr-2">{e.date_iso || `+${e.day_from_start}д`}</span>
                            {e.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Live preview */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-muted-foreground">Как увидит клиент</div>
              <div className="space-y-4 pointer-events-none opacity-95">
                <RejuvenationTrajectory
                  startDate={startDate}
                  chronologicalAge={data.chronological_age}
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
                  roadmap={(Array.isArray(data.roadmap) ? data.roadmap.filter((_, i) => !excludedRoadmap.has(i)) : data.roadmap) ?? null}
                  keyBiomarkers={data.key_biomarkers ?? null}
                  analysesPerYear={data.analyses_per_year ?? null}
                  adherencePct={data.adherence_pct ?? null}
                />
                <ExpectationsTimeline
                  startDate={startDate}
                  expectations={(Array.isArray(data.expectations) ? data.expectations.filter((_, i) => !excludedExpectations.has(i)) : data.expectations) ?? null}
                />
                <ActionMap actions={(data.action_map as any[]) || []} systems={categories} />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t gap-2">
          <Button variant="outline" onClick={onCancel} disabled={publishing}>Отменить</Button>
          <Button onClick={handlePublish} disabled={publishing}>
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить и опубликовать клиенту
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-background/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
