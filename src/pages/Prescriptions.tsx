import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
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
  effect: string | null;
  control_date: string | null;
  status: "on_review" | "confirmed";
  is_archived: boolean;
  created_at: string;
};

export default function Prescriptions() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPatientAccess, isSuperAdmin } = usePatientModuleAccess();
  const { viewAsUserId, isViewMode } = useViewAsUser();

  const userId = viewAsUserId || undefined;

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", userId, hasPatientAccess],
    queryFn: async () => {
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
            <h3 className="text-lg font-semibold leading-relaxed">
              {prescription.prescription}
            </h3>
            {prescription.effect && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Эффект:</span> {prescription.effect}
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
              
              {prescription.control_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/70" />
                  <span className="text-sm font-medium">
                    {format(new Date(prescription.control_date), "d MMMM yyyy", { locale: ru })}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Создано:</span>
                <span>{format(new Date(prescription.created_at), "d MMM yyyy", { locale: ru })}</span>
              </div>
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Назначения</h1>
            <p className="text-muted-foreground">
              Рекомендации и назначения врача
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
    </DashboardLayout>
  );
}
