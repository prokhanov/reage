import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AnalysisStep1 } from "./AnalysisStep1";
import { AnalysisStep2 } from "./AnalysisStep2";
import { AnalysisStep3 } from "./AnalysisStep3";
import { EditReportDialog } from "./EditReportDialog";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { isAnalysisReportComplete, waitForAnalysisCompletion } from "@/lib/analysisCompletionCheck";

interface EditAnalysisWizardProps {
  analysisId: string;
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
    mode: "standard" | "deep";
  };
}

export function EditAnalysisWizard({ analysisId, open, onOpenChange, onSuccess }: EditAnalysisWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showEditReport, setShowEditReport] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<"on_review" | "processed">("on_review");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"on_review" | "processed" | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
      generateReport: false,
      mode: "standard",
    },
  });

  useEffect(() => {
    if (open && analysisId) {
      loadAnalysisData();
    }
  }, [open, analysisId]);

  const loadAnalysisData = async () => {
    setLoadingData(true);
    try {
      // Load analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .select("*")
        .eq("id", analysisId)
        .single();

      if (analysisError) throw analysisError;

      // Load values
      const { data: values, error: valuesError } = await supabase
        .from("analysis_values")
        .select("*")
        .eq("analysis_id", analysisId);

      if (valuesError) throw valuesError;

      setAnalysisStatus(analysis.status || "on_review");
      
      setWizardData({
        step1: {
          date: analysis.date,
          labName: analysis.lab_name || "",
        },
        step2: {
          values: values.map((v) => ({
            biomarkerId: v.biomarker_id,
            value: v.value.toString(),
            unitOverride: v.unit_override || undefined,
          })),
        },
        step3: {
          generateReport: false,
          mode: "standard",
        },
      });
    } catch (error: any) {
      console.error("Error loading analysis:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные анализа",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

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

  const handleStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus as "on_review" | "processed");
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("analyses")
        .update({ status: pendingStatus })
        .eq("id", analysisId);

      if (error) throw error;

      setAnalysisStatus(pendingStatus);
      
      toast({
        title: "Успешно!",
        description: pendingStatus === "processed" 
          ? "Отчет загружен в кабинет клиента" 
          : "Статус изменен на 'На проверке'",
      });

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
      setShowConfirmDialog(false);
      setPendingStatus(null);
    }
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Update analysis
      const { error: analysisError } = await supabase
        .from("analyses")
        .update({
          date: wizardData.step1.date,
          lab_name: wizardData.step1.labName || null,
        })
        .eq("id", analysisId);

      if (analysisError) throw analysisError;

      // Delete all existing values for this analysis
      const { error: deleteError } = await supabase
        .from("analysis_values")
        .delete()
        .eq("analysis_id", analysisId);

      if (deleteError) throw deleteError;

      // Insert new values only if there are any
      if (wizardData.step2.values.length > 0) {
        const valuesToInsert = wizardData.step2.values.map((v) => ({
          analysis_id: analysisId,
          biomarker_id: v.biomarkerId,
          value: parseFloat(v.value),
          unit_override: v.unitOverride || null,
        }));

        const { error: insertError } = await supabase
          .from("analysis_values")
          .insert(valuesToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Успешно!",
        description: "Анализ обновлен",
      });

      // Generate report if requested
      if (wizardData.step3.generateReport) {
        setAnalyzing(true);
        try {
          const { data, error: functionError } = await supabase.functions.invoke(
            "analyze-biomarkers",
            {
              body: { analysisId, mode: wizardData.step3.mode },
            }
          );

          if (functionError) {
            const completionWaitMs = wizardData.step3.mode === "deep" ? 10 * 60 * 1000 : 2 * 60 * 1000;
            const completed = (await isAnalysisReportComplete(analysisId))
              || (await waitForAnalysisCompletion(analysisId, completionWaitMs, 5000));

            if (!completed) throw functionError;
          }

          if (data?.accepted) {
            const completed = await waitForAnalysisCompletion(analysisId, 10 * 60 * 1000, 5000);
            if (!completed) {
              throw new Error("Глубокий анализ ещё не завершён. Откройте отчет позже — сохраненные разделы появятся автоматически.");
            }
          }

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
      console.error("Error updating analysis:", error);
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
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <DialogTitle>
                  Редактирование анализа - Шаг {currentStep} из 3
                </DialogTitle>
                <DialogDescription>
                  {currentStep === 1 && "Укажите дату и лабораторию"}
                  {currentStep === 2 && "Добавьте биомаркеры и их значения"}
                  {currentStep === 3 && "Настройте генерацию отчета"}
                </DialogDescription>
              </div>
              {!loadingData && (
                <div className="flex flex-col gap-1">
                  <Select 
                    value={analysisStatus} 
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on_review">На проверке</SelectItem>
                      <SelectItem value="processed">Подтвержден</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground text-right">
                    {analysisStatus === "processed" ? "Виден клиенту" : "Скрыт"}
                  </p>
                </div>
              )}
            </div>
          </DialogHeader>

          {loadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <AnalysisStep1
                  data={wizardData.step1}
                  onChange={(data) => setWizardData({ ...wizardData, step1: data })}
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
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Изменить статус отчета?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatus === "processed" 
                ? "Отчет станет доступен клиенту в личном кабинете. Убедитесь, что все данные проверены." 
                : "Отчет будет скрыт от клиента и помечен как находящийся на проверке."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingStatus}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              disabled={updatingStatus}
            >
              {updatingStatus ? "Изменение..." : "Подтвердить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditReportDialog
        analysisId={analysisId}
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
    </>
  );
}
