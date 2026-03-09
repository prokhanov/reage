import { useState, useContext } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
      // Create analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .insert({
          user_id: viewAsUserId,
          date: wizardData.step1.date,
          lab_name: wizardData.step1.labName || null,
          status: "on_review",
        })
        .select()
        .single();

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
        setAnalyzing(true);
        try {
          const { error: functionError } = await supabase.functions.invoke(
            "analyze-biomarkers",
            {
              body: { analysisId: analysis.id },
            }
          );

          if (functionError) throw functionError;

          toast({
            title: "Отчет сгенерирован",
            description: "Проверьте и отредактируйте отчет",
          });

          // Open edit report dialog
          onOpenChange(false);
          setShowEditReport(true);
        } catch (error: any) {
          console.error("Error generating report:", error);
          toast({
            title: "Ошибка генерации отчета",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setAnalyzing(false);
        }
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
                {loading || analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {analyzing ? "Генерация отчета..." : "Сохранение..."}
                  </>
                ) : (
                  "Сохранить"
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
