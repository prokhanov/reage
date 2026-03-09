import { useState, useContext } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ViewAsPatientContext } from "@/contexts/ViewAsPatientContext";
import { AnalysisStep1 } from "./AnalysisStep1";
import { AnalysisStep2 } from "./AnalysisStep2";
import { AnalysisStep3 } from "./AnalysisStep3";
import { EditReportDialog } from "./EditReportDialog";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface CreateAnalysisWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface WizardData {
  step1: {
    date: string;
    labName: string;
  };
  step2: {
    values: Array<{
      biomarkerId: string;
      value: string;
      unitOverride?: string;
    }>;
  };
  step3: {
    generateReport: boolean;
  };
}

export function CreateAnalysisWizard({ open, onOpenChange, onSuccess }: CreateAnalysisWizardProps) {
  const { viewAsUserId } = useContext(ViewAsPatientContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState({ current: 0, total: 7, currentCategory: "", stage: "" });
  const [createdAnalysisId, setCreatedAnalysisId] = useState<string | null>(null);
  const [showEditReport, setShowEditReport] = useState(false);
  const { toast } = useToast();

  const [wizardData, setWizardData] = useState<WizardData>({
    step1: {
      date: format(new Date(), "yyyy-MM-dd"),
      labName: "",
    },
    step2: {
      values: [],
    },
    step3: {
      generateReport: true,
    },
  });

  const handleNext = () => {
    if (currentStep === 2 && wizardData.step2.values.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы один биомаркер",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const retryFetch = async <T,>(fn: () => Promise<{ data: T; error: any }>, retries = 3): Promise<{ data: T; error: any }> => {
    for (let i = 0; i < retries; i++) {
      const result = await fn();
      if (result.error && result.error.message?.includes("Load failed") && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return result;
    }
    return fn();
  };

  const handleSave = async () => {
    if (!viewAsUserId) {
      toast({
        title: "Ошибка",
        description: "Не указан пациент",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create analysis with retry
      const { data: analysis, error: analysisError } = await retryFetch<any>(async () => {
        const res = await supabase
          .from("analyses")
          .insert({
            user_id: viewAsUserId,
            date: wizardData.step1.date,
            lab_name: wizardData.step1.labName || null,
            status: "on_review" as const,
          })
          .select()
          .single();
        return res;
      });

      if (analysisError) throw analysisError;

      // Create analysis values
      const valuesToInsert = wizardData.step2.values.map((v) => ({
        analysis_id: analysis.id,
        biomarker_id: v.biomarkerId,
        value: parseFloat(v.value),
        unit_override: v.unitOverride || null,
      }));

      const { error: valuesError } = await supabase
        .from("analysis_values")
        .insert(valuesToInsert);

      if (valuesError) throw valuesError;

      setCreatedAnalysisId(analysis.id);

      toast({
        title: "Успешно!",
        description: "Анализ создан",
      });

      // Generate report if requested
      if (wizardData.step3.generateReport) {
        await handleGenerateReport(analysis.id);
      } else {
        onOpenChange(false);
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating analysis:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (analysisId: string) => {
    // Determine categories from biomarker values
    try {
      const biomarkerIds = wizardData.step2.values.map(v => v.biomarkerId);
      const { data: biomarkers } = await supabase
        .from("biomarkers")
        .select("category")
        .in("id", biomarkerIds);

      const categories = [...new Set(biomarkers?.map(b => b.category) || [])];
      const totalSteps = categories.length + 3; // categories + "Данные пациента" + "Общее резюме" + "Назначения"

      setAnalysisProgress({ current: 0, total: totalSteps, currentCategory: "", stage: "Подготовка данных..." });
      setAnalyzing(true);
      onOpenChange(false); // Close wizard dialog so progress overlay shows

      // Start polling
      let pollingStopped = false;
      const stageNames: Record<string, string> = {
        "Данные пациента": "Сохранение данных пациента...",
        "Общее резюме": "Формирование общего резюме...",
      };
      categories.forEach(c => { stageNames[c] = `Анализ: ${c}...`; });

      const pollInterval = setInterval(async () => {
        if (pollingStopped) return;
        try {
          const { data: recs } = await supabase
            .from("recommendations")
            .select("type")
            .eq("analysis_id", analysisId);

          const savedCount = recs?.length || 0;
          const lastSaved = recs?.[recs.length - 1]?.type || "";
          const stageName = stageNames[lastSaved] || lastSaved;

          setAnalysisProgress({
            current: savedCount,
            total: totalSteps,
            currentCategory: lastSaved,
            stage: savedCount < totalSteps ? stageName : "Генерация назначений...",
          });
        } catch {}
      }, 2500);

      try {
        const { data, error } = await supabase.functions.invoke("analyze-biomarkers", {
          body: { analysisId },
        });

        pollingStopped = true;
        clearInterval(pollInterval);

        if (error) {
          if (error.message?.includes("402") || error.message?.includes("Payment required")) {
            toast({
              title: "Недостаточно средств",
              description: "Пополните баланс в Settings → Workspace → Usage",
              variant: "destructive",
            });
          } else if (error.message?.includes("429") || error.message?.includes("Rate limit")) {
            toast({
              title: "Превышен лимит запросов",
              description: "Подождите несколько минут и попробуйте снова",
              variant: "destructive",
            });
          } else {
            throw error;
          }
          return;
        }

        setAnalysisProgress({ current: totalSteps, total: totalSteps, currentCategory: "", stage: "Готово!" });

        const successCount = Object.values(data.categories_processed).filter((s: any) => s.success).length;

        toast({
          title: "Отчет сгенерирован",
          description: `Успешно: ${successCount} из ${categories.length} категорий`,
        });

        // Open edit report dialog
        setShowEditReport(true);
      } catch (error: any) {
        pollingStopped = true;
        clearInterval(pollInterval);
        console.error("Error generating report:", error);
        toast({
          title: "Ошибка генерации отчета",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setAnalyzing(false);
      }
    } catch (error: any) {
      console.error("Error preparing report generation:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      setAnalyzing(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardData({
      step1: {
        date: format(new Date(), "yyyy-MM-dd"),
        labName: "",
      },
      step2: {
        values: [],
      },
      step3: {
        generateReport: true,
      },
    });
    setCreatedAnalysisId(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetWizard();
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Новый анализ - Шаг {currentStep} из 3
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1 && "Укажите дату и лабораторию"}
              {currentStep === 2 && "Добавьте биомаркеры и их значения"}
              {currentStep === 3 && "Настройте генерацию отчета"}
            </DialogDescription>
          </DialogHeader>

          {currentStep === 1 && (
            <AnalysisStep1
              data={wizardData.step1}
              onChange={(data) => setWizardData({ ...wizardData, step1: data })}
              onMockGenerate={(values) => {
                setWizardData((prev) => ({
                  ...prev,
                  step2: { values },
                }));
                setCurrentStep(2);
              }}
            />
          )}

          {currentStep === 2 && (
            <AnalysisStep2
              data={wizardData.step2}
              onChange={(data) => setWizardData({ ...wizardData, step2: data })}
            />
          )}

          {currentStep === 3 && (
            <AnalysisStep3
              data={wizardData.step3}
              onChange={(data) => setWizardData({ ...wizardData, step3: data })}
            />
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || loading || analyzing}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Далее
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={loading || analyzing}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Dialog - same as AnalysisDetail */}
      {analyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Анализируем показатели...
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{analysisProgress.stage || "Подготовка..."}</span>
                  <span className="font-medium">{analysisProgress.current}/{analysisProgress.total}</span>
                </div>
                <Progress value={analysisProgress.total > 0 ? (analysisProgress.current / analysisProgress.total) * 100 : 0} />
              </div>
              <p className="text-xs text-muted-foreground">
                Это может занять 2-3 минуты. Создаем детальный отчет с персональными советами...
              </p>
            </div>
          </Card>
        </div>
      )}

      {createdAnalysisId && (
        <EditReportDialog
          analysisId={createdAnalysisId}
          analysisStatus="on_review"
          open={showEditReport}
          onOpenChange={(open) => {
            setShowEditReport(open);
            if (!open) {
              resetWizard();
            }
          }}
          onStatusChange={onSuccess}
        />
      )}
    </>
  );
}
