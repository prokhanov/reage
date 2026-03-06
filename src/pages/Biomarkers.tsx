import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { BiomarkerTableSkeleton } from "@/components/skeletons/BiomarkerTableSkeleton";
import { calculateAge, getNormalRangeForAge, getBiomarkerStatus, getStatusHslColor } from "@/lib/biomarkerNorms";
import { BiomarkerRangeBar } from "@/components/BiomarkerRangeBar";
import { useDemoMode, transformDemoBiomarkersToDisplay } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { Progress } from "@/components/ui/progress";

interface BiomarkerData {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  description: string | null;
  normal_min: number | null;
  normal_max: number | null;
  normal_min_male: number | null;
  normal_max_male: number | null;
  normal_min_female: number | null;
  normal_max_female: number | null;
  optimal_min?: number | null;
  optimal_max?: number | null;
  critical_min?: number | null;
  critical_max?: number | null;
  latest_value: number | null;
  latest_date: string | null;
  previous_value: number | null;
  trend: "up" | "down" | "stable" | null;
}

interface GroupedBiomarkers {
  [category: string]: BiomarkerData[];
}

interface CategoryScoreValue {
  score: number;
  impact?: string;
  key_markers?: string[];
}

interface BiomarkersProps {
  categoryScores?: Record<string, number | CategoryScoreValue | null>;
}

export default function Biomarkers({ categoryScores }: BiomarkersProps = {}) {
  const { getUserId } = useViewAsUser();
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
  const [biomarkers, setBiomarkers] = useState<GroupedBiomarkers>({});
  const [loading, setLoading] = useState(true);
  const [patientGender, setPatientGender] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (demoLoading) return;
    loadBiomarkers();
  }, [demoMode, demoData, demoLoading]);

  const loadBiomarkers = async () => {
    if (demoMode) {
      if (!demoData) {
        console.error("Demo mode active but demo data not loaded");
        setLoading(false);
        return;
      }
      
      try {
        const { data: categoriesData } = await supabase
          .from("biomarker_categories")
          .select("name, display_order")
          .order("display_order");

        const transformed = await transformDemoBiomarkersToDisplay(
          demoData.biomarkers,
          demoData.analyses,
          categoriesData || []
        );
        
        setBiomarkers(transformed);
        setPatientGender(demoData.profile.gender || null);
        setPatientAge(demoData.profile.chronological_age || null);
      } catch (error) {
        console.error("Error loading demo biomarkers:", error);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const userId = await getUserId();
      if (!userId) throw new Error("Не авторизован");

      const { data: profile } = await supabase
        .from("profiles")
        .select("gender, birth_date")
        .eq("id", userId)
        .single();
      
      setPatientGender(profile?.gender || null);
      if (profile?.birth_date) {
        setPatientAge(calculateAge(profile.birth_date));
      }

      const { data: categoriesData } = await supabase
        .from("biomarker_categories")
        .select("name, display_order")
        .order("display_order");

      const categoryOrderMap = new Map(
        (categoriesData || []).map((cat) => [cat.name, cat.display_order])
      );

      const { data: biomarkersData, error: biomarkersError } = await supabase
        .from("biomarkers")
        .select("*")
        .order("name", { ascending: true });

      if (biomarkersError) throw biomarkersError;

      const biomarkersWithData = await Promise.all(
        (biomarkersData || []).map(async (biomarker: any) => {
          const { data: valuesData } = await supabase
            .from("analysis_values")
            .select(`
              value,
              analysis_id,
              analyses!inner(date, user_id)
            `)
            .eq("biomarker_id", biomarker.id)
            .eq("analyses.user_id", userId)
            .order("analyses(date)", { ascending: false })
            .limit(2);

          if (!valuesData || valuesData.length === 0) {
            return {
              ...biomarker,
              latest_value: null,
              latest_date: null,
              previous_value: null,
              trend: null,
            };
          }

          const latestValue = valuesData[0].value;
          const latestDate = valuesData[0].analyses.date;
          const previousValue = valuesData.length > 1 ? valuesData[1].value : null;

          let trend: "up" | "down" | "stable" | null = null;
          if (previousValue !== null) {
            const diff = latestValue - previousValue;
            const threshold = Math.abs(previousValue) * 0.05;
            if (Math.abs(diff) < threshold) {
              trend = "stable";
            } else if (diff > 0) {
              trend = "up";
            } else {
              trend = "down";
            }
          }

          return {
            ...biomarker,
            latest_value: latestValue,
            latest_date: latestDate,
            previous_value: previousValue,
            trend,
          };
        })
      );

      const grouped = biomarkersWithData.reduce((acc, biomarker) => {
        const category = biomarker.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(biomarker);
        return acc;
      }, {} as GroupedBiomarkers);

      const sortedGrouped: GroupedBiomarkers = {};
      Object.keys(grouped)
        .sort((a, b) => {
          const orderA = categoryOrderMap.get(a) ?? 999;
          const orderB = categoryOrderMap.get(b) ?? 999;
          return orderA - orderB;
        })
        .forEach(cat => {
          sortedGrouped[cat] = grouped[cat];
        });

      setBiomarkers(sortedGrouped as any);
    } catch (error: any) {
      console.error("Error loading biomarkers:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить маркеры",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable" | null) => {
    if (!trend) return null;
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "stable":
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendLabel = (trend: "up" | "down" | "stable" | null) => {
    if (!trend) return "Нет данных";
    switch (trend) {
      case "up":
        return "Рост";
      case "down":
        return "Снижение";
      case "stable":
        return "Стабильно";
    }
  };

  const getNormalRange = (biomarker: BiomarkerData) => {
    if (patientGender && patientAge !== null) {
      const gender = patientGender === 'male' || patientGender === 'female' ? patientGender : 'male';
      return getNormalRangeForAge(biomarker, patientAge, gender);
    }
    return { min: biomarker.normal_min, max: biomarker.normal_max };
  };

  const getValueStatus = (value: number | null, biomarker: BiomarkerData) => {
    if (value === null) return null;
    const gender = (patientGender === 'male' || patientGender === 'female') ? patientGender : 'male';
    return getBiomarkerStatus(value, biomarker, patientAge, gender);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
      {loading && <BiomarkerTableSkeleton />}
      {!loading && (
      <>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Биомаркеры
          </h2>
          <p className="text-muted-foreground">Актуальные данные по всем маркерам из анализов</p>
        </div>

        {Object.keys(biomarkers).length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Нет данных</h3>
              <p className="text-muted-foreground text-center">
                Добавьте анализы, чтобы увидеть информацию о биомаркерах
              </p>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(biomarkers)} className="space-y-4">
            {Object.entries(biomarkers).map(([category, categoryBiomarkers]) => (
              <AccordionItem 
                key={category} 
                value={category}
                className="border border-primary/20 rounded-lg bg-card/50 backdrop-blur-sm"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="text-lg font-semibold">{category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {categoryBiomarkers.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <div className="mt-4 border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/50">
                          <TableHead className="font-semibold">Название</TableHead>
                          <TableHead className="font-semibold">Последнее значение</TableHead>
                          <TableHead className="font-semibold">Статус</TableHead>
                          <TableHead className="font-semibold">Тренд</TableHead>
                          <TableHead className="font-semibold">Дата теста</TableHead>
                          <TableHead className="font-semibold">Шкала</TableHead>
                          <TableHead className="font-semibold w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryBiomarkers.map((biomarker) => {
                          const statusInfo = getValueStatus(biomarker.latest_value, biomarker);
                          const { min, max } = getNormalRange(biomarker);

                          return (
                            <TableRow 
                              key={biomarker.id}
                              className={`${
                                statusInfo?.status === 'critical'
                                  ? "bg-status-critical/5 hover:bg-status-critical/10"
                                  : statusInfo?.status === 'risk'
                                  ? "bg-status-risk/5 hover:bg-status-risk/10"
                                  : statusInfo?.status === 'acceptable'
                                  ? "bg-status-acceptable/5 hover:bg-status-acceptable/10"
                                  : statusInfo?.status === 'optimal'
                                  ? "bg-status-optimal/5 hover:bg-status-optimal/10"
                                  : "hover:bg-secondary/50"
                              }`}
                            >
                              <TableCell className="font-medium">
                                <div>
                                  <div className="font-semibold">{biomarker.name}</div>
                                  <div className="text-xs text-muted-foreground">{biomarker.code}</div>
                                </div>
                              </TableCell>
                              
                              <TableCell>
                                {biomarker.latest_value !== null ? (
                                  <span 
                                    className="text-lg font-bold"
                                    style={{
                                      color: statusInfo ? getStatusHslColor(statusInfo.status) : "hsl(var(--primary))"
                                    }}
                                  >
                                    {biomarker.latest_value.toFixed(2)} {biomarker.unit}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground italic">Нет данных</span>
                                )}
                              </TableCell>

                              <TableCell>
                                {statusInfo ? (
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bgClass} ${statusInfo.colorClass} border ${statusInfo.borderClass}`}>
                                    <span>{statusInfo.emoji}</span>
                                    <span>{statusInfo.label}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              
                              <TableCell>
                                {biomarker.trend ? (
                                  <div className="flex items-center gap-2">
                                    {getTrendIcon(biomarker.trend)}
                                    <span className="text-sm">{getTrendLabel(biomarker.trend)}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              
                              <TableCell>
                                {biomarker.latest_date ? (
                                  <span className="text-sm">
                                    {new Date(biomarker.latest_date).toLocaleDateString("ru-RU")}
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              
                              <TableCell className="min-w-[200px]">
                                {min !== null || max !== null ? (
                                  biomarker.latest_value !== null ? (
                                    <div className="space-y-1">
                                      <BiomarkerRangeBar
                                        biomarker={biomarker}
                                        value={biomarker.latest_value}
                                        age={patientAge}
                                        gender={patientGender}
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {min !== null && max !== null
                                          ? `${min}-${max} ${biomarker.unit}`
                                          : min !== null
                                          ? `> ${min} ${biomarker.unit}`
                                          : `< ${max} ${biomarker.unit}`}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      {min !== null && max !== null
                                        ? `${min}-${max} ${biomarker.unit}`
                                        : min !== null
                                        ? `> ${min} ${biomarker.unit}`
                                        : `< ${max} ${biomarker.unit}`}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              
                              <TableCell className="text-center">
                                {biomarker.description ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="inline-flex items-center justify-center rounded-full w-7 h-7 bg-primary/10 hover:bg-primary/20 transition-colors">
                                        <Info className="h-5 w-5 text-primary" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs" side="top" align="center" sideOffset={8}>
                                      <p className="text-sm">{biomarker.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                   </div>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
          )}
        </>
        )}
        </div>
      </TooltipProvider>
  );
}
