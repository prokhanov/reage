import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Trash2, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface Recommendation {
  id: string;
  type: string;
  text: string;
  created_at: string;
}


export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecommendations(data || []);
    } catch (error: any) {
      console.error("Error loading recommendations:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить рекомендации",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedRecommendation) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("recommendations")
        .delete()
        .eq("id", selectedRecommendation.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Рекомендация удалена",
      });

      setRecommendations((prev) => prev.filter((r) => r.id !== selectedRecommendation.id));
      setDeleteDialogOpen(false);
      setSelectedRecommendation(null);
    } catch (error: any) {
      console.error("Error deleting recommendation:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить рекомендацию",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Персональные рекомендации
          </h2>
          <p className="text-muted-foreground">
            AI-генерированные советы на основе ваших анализов
          </p>
        </div>

        {recommendations.length === 0 ? (
          <Card className="border-dashed border-2 border-primary/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Brain className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Рекомендации появятся скоро</h3>
              <p className="text-muted-foreground text-center mb-6">
                Добавьте анализы, и AI сгенерирует персональные рекомендации для вас
              </p>
              <Button onClick={() => navigate("/analyses")} className="shadow-neon-primary">
                Добавить анализ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Рекомендация</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recommendations.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>
                      <Badge variant="outline">{rec.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {truncateText(rec.text)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(rec.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(rec)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(rec)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* View Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="outline">{selectedRecommendation?.type}</Badge>
              </DialogTitle>
              <DialogDescription>
                {selectedRecommendation && format(new Date(selectedRecommendation.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedRecommendation?.text}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить рекомендацию?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Рекомендация будет удалена навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
