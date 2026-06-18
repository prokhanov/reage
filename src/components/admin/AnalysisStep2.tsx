import { useState, useEffect, useContext, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X, Search, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { calculateAge, getNormalRangeForAge, getOptimalRangeForAge, getCriticalRangeForAge, formatNormalRange, getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { BiomarkerScale } from "@/components/BiomarkerScale";
import {
  CALCULATED_BIOMARKER_CODES,
  computeAllDerivedValues,
  getFormulaDescription,
} from "@/lib/calculatedBiomarkers";

interface Biomarker {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  normal_min: number | null;
  normal_max: number | null;
  normal_min_male: number | null;
  normal_max_male: number | null;
  normal_min_female: number | null;
  normal_max_female: number | null;
}

interface BiomarkerValue {
  biomarkerId: string;
  value: string;
  unitOverride?: string;
}

interface AnalysisStep2Props {
  data: {
    values: BiomarkerValue[];
  };
  onChange: (data: any) => void;
}

export function AnalysisStep2({ data, onChange }: AnalysisStep2Props) {
  const { viewAsUserId } = useContext(ViewAsPatientContext);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPatientGender();
    loadBiomarkers();
  }, [viewAsUserId]);

  const loadPatientGender = async () => {
    if (!viewAsUserId) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, birth_date")
        .eq("id", viewAsUserId)
        .single();
      
      setPatientGender(profile?.gender || null);
      if (profile?.birth_date) {
        setPatientAge(calculateAge(profile.birth_date));
      }
    } catch (error) {
      console.error("Error loading patient data:", error);
    }
  };

  const loadBiomarkers = async () => {
    try {
      // Load category order from database
      const { data: categoriesData } = await supabase
        .from("biomarker_categories")
        .select("name, display_order")
        .order("display_order");

      const categoryOrderMap = new Map(
        (categoriesData || []).map((cat) => [cat.name, cat.display_order])
      );

      const { data: biomarkersData, error } = await supabase
        .from("biomarkers")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      
      // Sort biomarkers by category display_order
      const sortedBiomarkers = (biomarkersData || []).sort((a, b) => {
        const orderA = categoryOrderMap.get(a.category) ?? 999;
        const orderB = categoryOrderMap.get(b.category) ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      
      setBiomarkers(sortedBiomarkers as any);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBiomarkers = biomarkers.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBiomarkers = filteredBiomarkers.reduce((acc, biomarker) => {
    if (!acc[biomarker.category]) {
      acc[biomarker.category] = [];
    }
    acc[biomarker.category].push(biomarker);
    return acc;
  }, {} as Record<string, Biomarker[]>);

  const getValue = (biomarkerId: string) => {
    return data.values.find((v) => v.biomarkerId === biomarkerId);
  };

  const getRangesDisplay = (biomarker: Biomarker) => {
    if (!patientGender || patientAge === null) return null;
    const gender = patientGender === 'male' || patientGender === 'female' ? patientGender : 'male';
    const normal = getNormalRangeForAge(biomarker, patientAge, gender);
    const optimal = getOptimalRangeForAge(biomarker, patientAge, gender);
    const critical = getCriticalRangeForAge(biomarker, patientAge, gender);
    return { normal, optimal, critical, unit: biomarker.unit };
  };

  const getValueStatus = (biomarker: Biomarker, value: string) => {
    if (!value || isNaN(parseFloat(value))) return null;
    const gender = patientGender === 'male' || patientGender === 'female' ? patientGender : 'male';
    return getBiomarkerStatus(parseFloat(value), biomarker, patientAge, gender);
  };

  const updateValue = (biomarkerId: string, value: string, unitOverride?: string) => {
    const existing = data.values.find((v) => v.biomarkerId === biomarkerId);
    
    if (existing) {
      onChange({
        values: data.values.map((v) =>
          v.biomarkerId === biomarkerId ? { ...v, value, unitOverride } : v
        ),
      });
    } else {
      onChange({
        values: [...data.values, { biomarkerId, value, unitOverride }],
      });
    }
  };

  const removeValue = (biomarkerId: string) => {
    onChange({
      values: data.values.filter((v) => v.biomarkerId !== biomarkerId),
    });
  };

  // Карта code → biomarker для расчётов
  const codeToBiomarker = useMemo(() => {
    const map = new Map<string, Biomarker>();
    biomarkers.forEach((b) => map.set(b.code, b));
    return map;
  }, [biomarkers]);

  // Автопересчёт расчётных биомаркеров при изменении входных значений.
  // Сериализуем входы, чтобы хук не зацикливался.
  const inputsSignature = useMemo(() => {
    const parts: string[] = [];
    for (const v of data.values) {
      const bm = biomarkers.find((b) => b.id === v.biomarkerId);
      if (!bm || CALCULATED_BIOMARKER_CODES.has(bm.code)) continue;
      parts.push(`${bm.code}:${v.value}`);
    }
    return parts.sort().join("|");
  }, [data.values, biomarkers]);

  useEffect(() => {
    if (biomarkers.length === 0) return;

    // Собираем входы по кодам
    const inputs: Record<string, number> = {};
    for (const v of data.values) {
      const bm = biomarkers.find((b) => b.id === v.biomarkerId);
      if (!bm || CALCULATED_BIOMARKER_CODES.has(bm.code)) continue;
      const num = parseFloat(v.value);
      if (isFinite(num)) inputs[bm.code] = num;
    }

    const derived = computeAllDerivedValues(inputs);

    // Готовим обновлённый список значений
    let changed = false;
    const nextValues: BiomarkerValue[] = [];

    // Сохраняем все нерасчётные значения как есть
    for (const v of data.values) {
      const bm = biomarkers.find((b) => b.id === v.biomarkerId);
      if (!bm) {
        nextValues.push(v);
        continue;
      }
      if (CALCULATED_BIOMARKER_CODES.has(bm.code)) {
        // Заменим ниже расчётным значением (или удалим, если расчёт невозможен)
        continue;
      }
      nextValues.push(v);
    }

    // Добавляем расчётные значения
    derived.forEach((value, code) => {
      const bm = codeToBiomarker.get(code);
      if (!bm) return;
      nextValues.push({ biomarkerId: bm.id, value: String(value) });
    });

    // Проверяем, изменилось ли хоть что-то по расчётным
    const oldDerived = new Map<string, string>();
    for (const v of data.values) {
      const bm = biomarkers.find((b) => b.id === v.biomarkerId);
      if (bm && CALCULATED_BIOMARKER_CODES.has(bm.code)) {
        oldDerived.set(bm.code, v.value);
      }
    }
    if (oldDerived.size !== derived.size) changed = true;
    if (!changed) {
      derived.forEach((value, code) => {
        if (oldDerived.get(code) !== String(value)) changed = true;
      });
    }

    if (changed) onChange({ values: nextValues });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsSignature, biomarkers]);
  const addedCount = data.values.length;


  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <Label>Выберите биомаркеры и укажите значения</Label>
        <span className="text-sm text-muted-foreground">
          Добавлено: {addedCount}
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск биомаркера..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <AdminCenterLoader size="sm" />
      ) : (
        <Accordion type="multiple" className="w-full">
          {Object.entries(groupedBiomarkers).map(([category, markers]) => (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="text-sm font-semibold">
                {category} ({markers.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {markers.map((biomarker) => {
                    const currentValue = getValue(biomarker.id);
                    const ranges = getRangesDisplay(biomarker);
                    const status = currentValue ? getValueStatus(biomarker, currentValue.value) : null;
                    const isCalculated = CALCULATED_BIOMARKER_CODES.has(biomarker.code);
                    const formulaHint = isCalculated ? getFormulaDescription(biomarker.code) : null;
                    return (
                      <div
                        key={biomarker.id}
                        className={`flex items-start gap-2 p-3 rounded-lg border bg-card ${status ? status.borderClass : ''}`}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-sm font-medium">
                                {biomarker.name}
                              </Label>
                              {isCalculated && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  <Calculator className="h-3 w-3" />
                                  Расчётный
                                </span>
                              )}
                              {status && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${status.bgClass} ${status.colorClass}`}>
                                  {status.emoji} {status.label}
                                </span>
                              )}
                            </div>
                            {currentValue && !isCalculated && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeValue(biomarker.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {biomarker.code}
                            {ranges && (
                              <>
                                {' • '}
                                {ranges.optimal.min != null && <span className="text-status-optimal">Опт: {formatNormalRange(ranges.optimal.min, ranges.optimal.max)}</span>}
                                {ranges.optimal.min != null && ' • '}
                                <span>Норма: {formatNormalRange(ranges.normal.min, ranges.normal.max)}</span>
                                {ranges.critical.min != null && <span className="text-status-critical"> • Крит: {formatNormalRange(ranges.critical.min, ranges.critical.max)}</span>}
                                {' '}{ranges.unit}
                              </>
                            )}
                            {!ranges && ' • Норма: не указана'}
                          </p>
                          {formulaHint && (
                            <p className="text-[11px] text-muted-foreground italic">
                              Формула: {formulaHint}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={isCalculated ? "Будет рассчитано автоматически" : "Значение"}
                              value={currentValue?.value || ""}
                              readOnly={isCalculated}
                              disabled={isCalculated}
                              onChange={(e) =>
                                updateValue(
                                  biomarker.id,
                                  e.target.value,
                                  currentValue?.unitOverride
                                )
                              }
                              className={`flex-1 ${isCalculated ? 'bg-muted/50 cursor-not-allowed' : ''}`}
                            />
                            <Input
                              type="text"
                              placeholder={biomarker.unit}
                              value={currentValue?.unitOverride || ""}
                              readOnly={isCalculated}
                              disabled={isCalculated}
                              onChange={(e) =>
                                updateValue(
                                  biomarker.id,
                                  currentValue?.value || "",
                                  e.target.value
                                )
                              }
                              className={`w-24 ${isCalculated ? 'bg-muted/50 cursor-not-allowed' : ''}`}
                            />
                          </div>
                          {currentValue?.value && !isNaN(parseFloat(currentValue.value)) && (
                            <BiomarkerScale
                              biomarker={biomarker}
                              value={parseFloat(currentValue.value)}
                              age={patientAge}
                              gender={patientGender}
                              unit={currentValue?.unitOverride || biomarker.unit}
                              showHeader
                              compact
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
