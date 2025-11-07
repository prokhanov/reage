import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useSuperAdminCheck } from "@/hooks/useSuperAdminCheck";
import { useViewAsUser } from "@/hooks/useViewAsUser";
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
  control_date: string | null;
  status: "on_review" | "confirmed";
  is_archived: boolean;
  created_at: string;
};

export default function Prescriptions() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useSuperAdminCheck();
  const { viewAsUserId } = useViewAsUser();

  const userId = viewAsUserId || undefined;

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["prescriptions", userId],
    queryFn: async () => {
      let query = supabase
        .from("prescriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
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
      return <Badge variant="default">Подтверждено</Badge>;
    }
    return <Badge variant="secondary">На проверке</Badge>;
  };

  const PrescriptionCard = ({ prescription }: { prescription: Prescription }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg">{prescription.prescription}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Создано: {format(new Date(prescription.created_at), "d MMMM yyyy", { locale: ru })}
              </span>
            </div>
          </div>
          {isSuperAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteId(prescription.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {getStatusBadge(prescription.status)}
          </div>
          {prescription.control_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-primary" />
              <span>
                Контрольная дата:{" "}
                {format(new Date(prescription.control_date), "d MMMM yyyy", { locale: ru })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
            <h1 className="text-3xl font-bold">Назначения</h1>
            <p className="text-muted-foreground mt-2">
              Рекомендации и назначения врача
            </p>
          </div>
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
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Нет активных назначений
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activePrescriptions.map((prescription) => (
                  <PrescriptionCard key={prescription.id} prescription={prescription} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="archive" className="space-y-4 mt-6">
            {archivedPrescriptions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Архив пуст
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {archivedPrescriptions.map((prescription) => (
                  <PrescriptionCard key={prescription.id} prescription={prescription} />
                ))}
              </div>
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
    </DashboardLayout>
  );
}
