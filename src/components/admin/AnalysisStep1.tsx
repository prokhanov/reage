import { useState, useContext, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { FlaskConical } from "lucide-react";
import { ButtonSpinner } from "@/components/admin/ButtonSpinner";
import {
  calculateAge,
  getNormalRangeForAge,
  getOptimalRangeForAge,
  getCriticalRangeForAge,
} from "@/lib/biomarkerNorms";
import {
  CALCULATED_BIOMARKER_CODES,
  computeAllDerivedValues,
} from "@/lib/calculatedBiomarkers";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalysisAutoImport } from "./AnalysisAutoImport";

interface AnalysisStep1Props {
  data: {
    date: string;
    labName: string;
  };
  onChange: (data: any) => void;
  onMockGenerate?: (values: Array<{ biomarkerId: string; value: string; unitOverride?: string }>) => void;
  mode?: "manual" | "auto";
  onModeChange?: (mode: "manual" | "auto") => void;
  onAutoImported?: () => void;
  onAutoClose?: () => void;
}

const HEALTH_LEVELS = [
  { level: 1, label: "Критичный", emoji: "🔴", description: "Много критичных значений" },
  { level: 2, label: "Больной", emoji: "🟠", description: "Риск и критичные значения" },
  { level: 3, label: "Средний", emoji: "🟡", description: "Микс оптимальных и рисковых" },
  { level: 4, label: "Здоровый", emoji: "🟢", description: "В основном оптимальные" },
  { level: 5, label: "Идеальный", emoji: "💚", description: "Почти все в оптимуме" },
];

// Weighted probabilities: [optimal, acceptable, risk, critical]
const HEALTH_WEIGHTS: Record<number, [number, number, number, number]> = {
  5: [0.90, 0.10, 0.00, 0.00],
  4: [0.70, 0.20, 0.10, 0.00],
  3: [0.30, 0.40, 0.25, 0.05],
  2: [0.10, 0.20, 0.40, 0.30],
  1: [0.05, 0.10, 0.30, 0.55],
};

function pickZone(weights: [number, number, number, number]): "optimal" | "acceptable" | "risk" | "critical" {
  const roll = Math.random();
  let cumulative = 0;
  const zones: Array<"optimal" | "acceptable" | "risk" | "critical"> = ["optimal", "acceptable", "risk", "critical"];
  for (let i = 0; i < 4; i++) {
    cumulative += weights[i];
    if (roll < cumulative) return zones[i];
  }
  return "optimal";
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function generateValueInZone(
  zone: "optimal" | "acceptable" | "risk" | "critical",
  normal: { min: number | null; max: number | null },
  optimal: { min: number | null; max: number | null },
  critical: { min: number | null; max: number | null }
): number | null {
  const nMin = normal.min;
  const nMax = normal.max;

  // We need at least some reference
  if (nMin === null && nMax === null) return null;

  // Build effective boundaries
  const effectiveMin = nMin ?? 0;
  const effectiveMax = nMax ?? (effectiveMin * 3 || 100);
  const range = effectiveMax - effectiveMin;

  if (zone === "optimal") {
    const oMin = optimal.min ?? effectiveMin;
    const oMax = optimal.max ?? effectiveMax;
    if (oMin >= oMax) return oMin;
    return randomInRange(oMin, oMax);
  }

  if (zone === "acceptable") {
    // Between normal and optimal boundaries
    const oMin = optimal.min ?? effectiveMin;
    const oMax = optimal.max ?? effectiveMax;
    // Pick either low-acceptable or high-acceptable
    const lowGap = oMin - effectiveMin;
    const highGap = effectiveMax - oMax;
    if (lowGap <= 0 && highGap <= 0) {
      // No acceptable zone, fall back to optimal
      return randomInRange(oMin, oMax);
    }
    if (Math.random() < 0.5 && lowGap > 0) {
      return randomInRange(effectiveMin, oMin);
    }
    if (highGap > 0) {
      return randomInRange(oMax, effectiveMax);
    }
    return randomInRange(effectiveMin, oMin);
  }

  if (zone === "risk") {
    // Outside normal but inside critical
    const cMin = critical.min ?? (effectiveMin - range * 0.3);
    const cMax = critical.max ?? (effectiveMax + range * 0.3);
    if (Math.random() < 0.5 && nMin !== null) {
      // Below normal
      const low = Math.max(cMin, effectiveMin - range * 0.3);
      return randomInRange(low, effectiveMin);
    }
    if (nMax !== null) {
      const high = Math.min(cMax, effectiveMax + range * 0.3);
      return randomInRange(effectiveMax, high);
    }
    // Fallback
    return randomInRange(effectiveMin - range * 0.2, effectiveMin);
  }

  if (zone === "critical") {
    const cMin = critical.min ?? (effectiveMin - range * 0.5);
    const cMax = critical.max ?? (effectiveMax + range * 0.5);
    if (Math.random() < 0.5 && critical.min !== null) {
      return randomInRange(Math.max(0, cMin - range * 0.3), cMin);
    }
    if (critical.max !== null) {
      return randomInRange(cMax, cMax + range * 0.3);
    }
    // No critical defined, generate far outside normal
    if (nMin !== null) {
      return randomInRange(Math.max(0, effectiveMin - range * 0.5), effectiveMin - range * 0.2);
    }
    return randomInRange(effectiveMax + range * 0.2, effectiveMax + range * 0.5);
  }

  return null;
}

function roundToReasonable(value: number): number {
  if (Math.abs(value) >= 100) return Math.round(value * 10) / 10;
  if (Math.abs(value) >= 10) return Math.round(value * 100) / 100;
  return Math.round(value * 100) / 100;
}

export function AnalysisStep1({ data, onChange, onMockGenerate, mode = "manual", onModeChange, onAutoImported, onAutoClose }: AnalysisStep1Props) {
  const [showHealthDialog, setShowHealthDialog] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const { viewAsUserId } = useContext(ViewAsPatientContext);
  const { toast } = useToast();

  useEffect(() => {
    if (!showHealthDialog || plans.length > 0 || !viewAsUserId) return;
    setPlansLoading(true);
    (async () => {
      try {
        const [plansRes, pbRes, subRes] = await Promise.all([
          supabase.from("subscription_plans").select("id, name").order("name"),
          supabase.from("plan_biomarkers").select("plan_id, biomarker_id"),
          supabase
            .from("subscriptions")
            .select("plan_id")
            .eq("user_id", viewAsUserId)
            .eq("status", "active")
            .maybeSingle(),
        ]);
        if (plansRes.error) throw plansRes.error;
        if (pbRes.error) throw pbRes.error;

        const counts = new Map<string, number>();
        (pbRes.data || []).forEach((row: any) => {
          counts.set(row.plan_id, (counts.get(row.plan_id) || 0) + 1);
        });
        const list = (plansRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          count: counts.get(p.id) || 0,
        }));
        setPlans(list);

        const activePlanId = subRes.data?.plan_id as string | undefined;
        const defaultId =
          (activePlanId && list.find((p) => p.id === activePlanId)?.id) ||
          list[0]?.id ||
          null;
        setSelectedPlanId(defaultId);
      } catch (err: any) {
        console.error("Error loading plans:", err);
        toast({ title: "Ошибка загрузки тарифов", description: err.message, variant: "destructive" });
      } finally {
        setPlansLoading(false);
      }
    })();
  }, [showHealthDialog, viewAsUserId, plans.length, toast]);

  const handleGenerateMock = async (healthLevel: number) => {
    if (!viewAsUserId || !onMockGenerate) return;
    if (!selectedPlanId) {
      toast({ title: "Выберите тариф", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setShowHealthDialog(false);

    try {
      // Fetch patient profile, all biomarkers, and plan biomarkers in parallel
      const [profileRes, biomarkersRes, planBmRes] = await Promise.all([
        supabase.from("profiles").select("birth_date, gender").eq("id", viewAsUserId).single(),
        supabase.from("biomarkers").select("*").order("display_order"),
        supabase.from("plan_biomarkers").select("biomarker_id").eq("plan_id", selectedPlanId),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (biomarkersRes.error) throw biomarkersRes.error;
      if (planBmRes.error) throw planBmRes.error;

      const profile = profileRes.data;
      const biomarkers = biomarkersRes.data;
      const allowedIds = new Set<string>((planBmRes.data || []).map((r: any) => r.biomarker_id));
      const age = calculateAge(profile.birth_date);
      const gender = (profile.gender === "female" ? "female" : "male") as "male" | "female";
      const weights = HEALTH_WEIGHTS[healthLevel];

      const values: Array<{ biomarkerId: string; value: string; unitOverride?: string }> = [];

      for (const bm of biomarkers) {
        if (!allowedIds.has(bm.id)) continue;
        // Расчётные биомаркеры пропускаем — заполним их формулами после генерации.
        if (CALCULATED_BIOMARKER_CODES.has(bm.code)) continue;

        const normal = getNormalRangeForAge(bm, age, gender);
        const optimal = getOptimalRangeForAge(bm, age, gender);
        const critical = getCriticalRangeForAge(bm, age, gender);

        if (normal.min === null && normal.max === null) continue;

        const zone = pickZone(weights);
        const val = generateValueInZone(zone, normal, optimal, critical);

        if (val !== null && isFinite(val) && val >= 0) {
          values.push({
            biomarkerId: bm.id,
            value: String(roundToReasonable(val)),
          });
        }
      }

      // Считаем производные показатели на основе сгенерированных входных значений.
      const codeToBiomarker = new Map(biomarkers.map((b) => [b.code, b]));
      const inputsByCode: Record<string, number> = {};
      for (const v of values) {
        const bm = biomarkers.find((b) => b.id === v.biomarkerId);
        if (bm) inputsByCode[bm.code] = parseFloat(v.value);
      }

      const derived = computeAllDerivedValues(inputsByCode, { age, sex: gender });
      derived.forEach((value, code) => {
        const bm = codeToBiomarker.get(code);
        if (!bm) return;
        values.push({
          biomarkerId: bm.id,
          value: String(value),
        });
      });

      onMockGenerate(values);
      toast({
        title: "Мок-данные сгенерированы",
        description: `${values.length} значений (уровень: ${HEALTH_LEVELS[healthLevel - 1].label})`,
      });
    } catch (error: any) {
      console.error("Error generating mock data:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Tabs value={mode} onValueChange={(v) => onModeChange?.(v as "manual" | "auto")} className="py-2">
      <TabsList className="flex w-full h-auto p-1 gap-1">
        <TabsTrigger value="manual" className="flex-1 px-3 py-2">Вручную</TabsTrigger>
        <TabsTrigger value="auto" className="flex-1 px-3 py-2">Авто-импорт PDF</TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="date">Дата анализа</Label>
          <Input
            id="date"
            type="date"
            value={data.date}
            onChange={(e) => onChange({ ...data, date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="labName">Лаборатория (опционально)</Label>
          <Input
            id="labName"
            type="text"
            placeholder="Инвитро, KDL и т.д."
            value={data.labName}
            onChange={(e) => onChange({ ...data, labName: e.target.value })}
          />
        </div>

        {onMockGenerate && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowHealthDialog(true)}
              disabled={generating}
            >
              {generating ? (
                <>
                  <ButtonSpinner className="mr-2" />
                  Генерация...
                </>
              ) : (
                <>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  🧪 Заполнить мок-данные
                </>
              )}
            </Button>
          </div>
        )}

        <Dialog open={showHealthDialog} onOpenChange={setShowHealthDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Уровень здоровья</DialogTitle>
              <DialogDescription>
                Выберите профиль для генерации мок-значений биомаркеров
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              {HEALTH_LEVELS.map((hl) => (
                <Button
                  key={hl.level}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => handleGenerateMock(hl.level)}
                >
                  <span className="text-lg mr-3">{hl.emoji}</span>
                  <div className="text-left">
                    <div className="font-medium">{hl.level}. {hl.label}</div>
                    <div className="text-xs text-muted-foreground">{hl.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="auto" className="pt-4">
        <AnalysisAutoImport onImported={onAutoImported} onClose={onAutoClose} />
      </TabsContent>
    </Tabs>
  );
}
