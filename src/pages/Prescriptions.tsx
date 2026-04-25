import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Calendar, FileText, Plus, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { usePatientModuleAccess } from "@/hooks/usePatientModuleAccess";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { CreatePrescriptionDialog } from "@/components/admin/CreatePrescriptionDialog";
import { EditPrescriptionDialog } from "@/components/admin/EditPrescriptionDialog";
import { PrescriptionListSkeleton } from "@/components/skeletons/PrescriptionListSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Prescription = {
  id: string;
  prescription: string;
  name: string | null;
  form: string | null;
  dosage: string | null;
  how_to_take: string | null;
  duration: string | null;
  reason: string | null;
  effect: string | null;
  control_date: string | null;
  status: "on_review" | "confirmed";
  is_archived: boolean;
  created_at: string;
};

type LifestyleBlock = {
  nutrition?: string[];
  activity?: string[];
  sleep?: string[];
};

type FollowUp = {
  specialist?: string;
  goal?: string;
  trigger?: string;
};

type AdvisoryBlock = {
  lifestyle: LifestyleBlock;
  followUps: FollowUp[];
  createdAt: string;
};

export default function Prescriptions() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPatientAccess, loading: accessLoading } = usePatientModuleAccess();
  const { viewAsUserId, isViewMode } = useViewAsUser();

  const userId = viewAsUserId || undefined;

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", userId, hasPatientAccess, demoMode, demoData],
    enabled: !demoLoading && !accessLoading,
    queryFn: async () => {
      if (demoMode) {
        if (!demoData) {
          return [];
        }
        return demoData.prescriptions.map((p: any, idx: number) => {
          const analysis = demoData.analyses[p.analysis_index];
          return {
            id: `demo-${idx}`,
            prescription: p.prescription,
            effect: p.effect,
            control_date: p.control_date,
            status: p.status || "confirmed",
            is_archived: p.is_archived || false,
            created_at: analysis?.date || demoData.analyses[0].date
          } as Prescription;
        });
      }

      let query = supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });

      // Если в режиме "View As", показываем назначения выбранного пользователя
      // Если не в режиме "View As", показываем назначения текущего пользователя
      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        // Получаем текущего пользователя
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq("user_id", user.id);
        }
      }

      // Обычные пользователи видят только подтвержденные назначения
      if (!hasPatientAccess) {
        query = query.eq("status", "confirmed");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Prescription[];
    },
  });

  // Загружаем структурированные блоки «Питание/образ жизни» и «Доп. обследования»
  // из отчёта (recommendations.type = 'Назначения').
  // Приоритет привязки:
  //   1) если есть активные нутрицевтики с analysis_id — берём advisory того же analysis_id;
  //   2) иначе — последний по created_at блок «Назначения», в котором есть данные.
  const activeAnalysisId = (() => {
    const withAnalysis = (prescriptions || []).find(
      (p: any) => !p.is_archived && p.analysis_id
    ) as any;
    return withAnalysis?.analysis_id as string | undefined;
  })();

  const { data: advisory } = useQuery<AdvisoryBlock | null>({
    queryKey: ["recommendations-advisory", userId ?? "self", activeAnalysisId ?? null, demoMode],
    enabled: !demoLoading && !isLoading,
    staleTime: 0,
    queryFn: async () => {
      if (demoMode) return null;

      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        targetUserId = user?.id;
      }
      if (!targetUserId) return null;

      // Шаг 1: пробуем найти advisory по analysis_id активного нутрицевтика.
      if (activeAnalysisId) {
        const { data: targeted } = await supabase
          .from("recommendations")
          .select("content_json, created_at, analysis_id, type")
          .eq("user_id", targetUserId)
          .eq("type", "Назначения")
          .eq("analysis_id", activeAnalysisId)
          .order("created_at", { ascending: false })
          .limit(1);

        const row = targeted?.[0] as any;
        if (row) {
          const cj = row.content_json;
          const lifestyle: LifestyleBlock = (cj?.lifestyle ?? {}) as LifestyleBlock;
          const followUps: FollowUp[] = Array.isArray(cj?.follow_ups) ? cj.follow_ups : [];
          return { lifestyle, followUps, createdAt: row.created_at };
        }
      }

      // Шаг 2: fallback — последний блок «Назначения» с данными.
      const { data } = await supabase
        .from("recommendations")
        .select("content_json, created_at, analysis_id, type")
        .eq("user_id", targetUserId)
        .eq("type", "Назначения")
        .order("created_at", { ascending: false })
        .limit(10);

      for (const row of data || []) {
        const cj = (row as any).content_json;
        const lifestyle: LifestyleBlock = (cj?.lifestyle ?? {}) as LifestyleBlock;
        const followUps: FollowUp[] = Array.isArray(cj?.follow_ups) ? cj.follow_ups : [];
        const lifestyleCount =
          (lifestyle.nutrition?.length || 0) +
          (lifestyle.activity?.length || 0) +
          (lifestyle.sleep?.length || 0);
        if (lifestyleCount > 0 || followUps.length > 0) {
          return { lifestyle, followUps, createdAt: (row as any).created_at };
        }
      }
      return null;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prescriptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast({
        title: "Назначение удалено",
        description: "Назначение успешно удалено",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить назначение",
        variant: "destructive",
      });
      console.error("Error deleting prescription:", error);
    },
  });

  const activePrescriptions = prescriptions.filter((p) => !p.is_archived);
  const archivedPrescriptions = prescriptions.filter((p) => p.is_archived);

  const getStatusBadge = (status: "on_review" | "confirmed") => {
    if (status === "confirmed") {
      return <Badge variant="default" className="text-xs">Подтверждено</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">На проверке</Badge>;
  };

  const PrescriptionTable = ({ prescriptions }: { prescriptions: Prescription[] }) => (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div 
          key={prescription.id} 
          className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6 space-y-4 hover:border-primary/30 transition-colors"
        >
          {/* Назначение */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold leading-relaxed text-primary">
              {prescription.name || prescription.prescription}
            </h3>

            {prescription.form && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Форма:</span> {prescription.form}
              </p>
            )}

            {prescription.dosage && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Дозировка:</span> {prescription.dosage}
              </p>
            )}

            {prescription.how_to_take && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Как принимать:</span> {prescription.how_to_take}
              </p>
            )}

            {prescription.duration && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Длительность:</span> {prescription.duration}
              </p>
            )}

            {prescription.reason && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/10 mt-2">
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="font-medium">Причина:</span> {prescription.reason}
                </p>
              </div>
            )}

            {prescription.effect && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                <span className="font-medium text-foreground">На что это влияет:</span> {prescription.effect}
              </p>
            )}
          </div>

          {/* Метаданные и действия */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <div className="flex items-center gap-6 flex-wrap">
              {hasPatientAccess && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Статус:</span>
                  {getStatusBadge(prescription.status)}
                </div>
              )}
              

              {prescription.created_at && !isNaN(new Date(prescription.created_at).getTime()) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Создано:</span>
                  <span>{format(new Date(prescription.created_at), "d MMM yyyy", { locale: ru })}</span>
                </div>
              )}
            </div>

            {hasPatientAccess && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditPrescription(prescription)}
                  className="h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(prescription.id)}
                  className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const AdvisorySections = () => {
    if (!advisory) return null;

    const ls = advisory.lifestyle || {};
    const hasNutrition = (ls.nutrition?.length || 0) > 0;
    const hasActivity = (ls.activity?.length || 0) > 0;
    const hasSleep = (ls.sleep?.length || 0) > 0;
    const hasLifestyle = hasNutrition || hasActivity || hasSleep;
    const hasFollowUps = (advisory.followUps?.length || 0) > 0;
    if (!hasLifestyle && !hasFollowUps) return null;

    return (
      <div className="space-y-8">
        {hasLifestyle && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Питание и коррекция образа жизни
              </h2>
              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
            </div>
            <div className="space-y-4">
              {hasNutrition && (
                <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <span>🥗</span> Питание
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                    {ls.nutrition!.map((item, i) => (
                      <li key={`nut-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasActivity && (
                <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <span>🏃</span> Физическая активность
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                    {ls.activity!.map((item, i) => (
                      <li key={`act-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasSleep && (
                <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-6">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <span>😴</span> Сон и режим
                  </h3>
                  <ul className="space-y-2 list-disc list-inside text-sm text-foreground leading-relaxed">
                    {ls.sleep!.map((item, i) => (
                      <li key={`slp-${i}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {hasFollowUps && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Дополнительные консультации и обследования
              </h2>
              <div className="h-1 w-20 bg-gradient-primary rounded-full" />
            </div>
            <div className="space-y-3">
              {advisory.followUps.map((f, i) => (
                <div
                  key={`fu-${i}`}
                  className="rounded-lg border border-border/50 bg-card/50 backdrop-blur p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-primary mt-0.5">🩺</span>
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-foreground">
                        {f.specialist || "Специалист"}
                      </p>
                      {f.goal && (
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="font-medium">Цель:</span> {f.goal}
                        </p>
                      )}
                      {f.trigger && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-medium">Основание:</span> {f.trigger}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}
        {(isLoading || accessLoading) && <PrescriptionListSkeleton />}
        {!isLoading && !accessLoading && (
          <>
            <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Рекомендации</h1>
            <p className="text-muted-foreground">
              {"\n"}
            </p>
          </div>
          {isViewMode && hasPatientAccess && viewAsUserId && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить назначение
            </Button>
          )}
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active" className="gap-2">
              <FileText className="w-4 h-4" />
              Активные ({activePrescriptions.length})
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <FileText className="w-4 h-4" />
              Архив ({archivedPrescriptions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-6">
            {activePrescriptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 bg-card/30 p-12">
                <div className="flex flex-col items-center justify-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Нет активных назначений
                  </p>
                </div>
              </div>
            ) : (
              <PrescriptionTable prescriptions={activePrescriptions} />
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-4 mt-6">
            {archivedPrescriptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 bg-card/30 p-12">
                <div className="flex flex-col items-center justify-center">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Архив пуст
                  </p>
                </div>
              </div>
            ) : (
              <PrescriptionTable prescriptions={archivedPrescriptions} />
            )}
          </TabsContent>
        </Tabs>

        {/* Питание/образ жизни и Доп. обследования — ПОСЛЕ нутрицевтиков */}
        <AdvisorySections />

        </>
      )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить назначение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Назначение будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewAsUserId && (
        <CreatePrescriptionDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          userId={viewAsUserId}
        />
      )}

      <EditPrescriptionDialog
        open={!!editPrescription}
        onOpenChange={(open) => !open && setEditPrescription(null)}
        prescription={editPrescription}
      />
  </>
  );
}
