import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CreateInteractionDialog } from "./CreateInteractionDialog";
import { EditInteractionDialog } from "./EditInteractionDialog";
import { 
  Plus, Video, Phone, Mail, Users, MessageCircle, 
  FileText, CheckSquare, Calendar, Edit, Trash2, Star 
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { ru } from "date-fns/locale";
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

const interactionTypeLabels: Record<string, string> = {
  online_consultation: 'Онлайн-консультация',
  phone_call: 'Телефонный звонок',
  email: 'Email',
  in_person_meeting: 'Личная встреча',
  message: 'Сообщение',
  note: 'Заметка',
  task: 'Задача',
  appointment: 'Встреча'
};

const interactionStatusLabels: Record<string, string> = {
  completed: 'Завершено',
  scheduled: 'Запланировано',
  cancelled: 'Отменено',
  pending: 'В ожидании',
  in_progress: 'В процессе'
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800 border-green-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200'
};

const getInteractionIcon = (type: string) => {
  const iconClass = "w-5 h-5";
  switch (type) {
    case 'online_consultation': return <Video className={iconClass} />;
    case 'phone_call': return <Phone className={iconClass} />;
    case 'email': return <Mail className={iconClass} />;
    case 'in_person_meeting': return <Users className={iconClass} />;
    case 'message': return <MessageCircle className={iconClass} />;
    case 'note': return <FileText className={iconClass} />;
    case 'task': return <CheckSquare className={iconClass} />;
    case 'appointment': return <Calendar className={iconClass} />;
    default: return <FileText className={iconClass} />;
  }
};

const getDateGroup = (date: Date) => {
  if (isToday(date)) return "Сегодня";
  if (isYesterday(date)) return "Вчера";
  if (isThisWeek(date)) return "Эта неделя";
  if (isThisMonth(date)) return "Этот месяц";
  return format(date, "LLLL yyyy", { locale: ru });
};

interface PatientInteractionsTabProps {
  patientId: string;
  patientName: string;
}

export function PatientInteractionsTab({ patientId, patientName }: PatientInteractionsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: interactions, isLoading } = useQuery({
    queryKey: ['patient-interactions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_interactions')
        .select(`
          *,
          creator:created_by(id, profiles(name, first_name)),
          assignee:assigned_to(id, profiles(name, first_name)),
          analysis:related_analysis_id(id, date),
          prescription:related_prescription_id(id, prescription)
        `)
        .eq('user_id', patientId)
        .order('interaction_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('patient_interactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-interactions', patientId] });
      toast({ title: "Взаимодействие удалено" });
      setDeletingId(null);
    },
    onError: (error) => {
      toast({ 
        title: "Ошибка удаления", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const groupedInteractions = interactions?.reduce((acc, interaction) => {
    const date = new Date(interaction.interaction_date);
    const group = getDateGroup(date);
    if (!acc[group]) acc[group] = [];
    acc[group].push(interaction);
    return acc;
  }, {} as Record<string, typeof interactions>);

  const totalInteractions = interactions?.length || 0;
  const scheduledCount = interactions?.filter(i => i.status === 'scheduled').length || 0;
  const lastConsultationDate = interactions?.find(i => i.interaction_type === 'online_consultation')?.interaction_date;

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalInteractions}</div>
            <div className="text-sm text-muted-foreground">Всего взаимодействий</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{scheduledCount}</div>
            <div className="text-sm text-muted-foreground">Запланировано</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {lastConsultationDate ? format(new Date(lastConsultationDate), "dd.MM.yyyy") : "—"}
            </div>
            <div className="text-sm text-muted-foreground">Последняя консультация</div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">История взаимодействий</h3>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {/* Interactions Timeline */}
      <ScrollArea className="h-[500px] pr-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
        ) : !interactions?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Нет записей о взаимодействиях
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedInteractions || {}).map(([group, items]) => (
              <div key={group}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">{group}</h4>
                <div className="space-y-3">
                  {items.map((interaction: any) => (
                    <Card key={interaction.id} className={interaction.is_important ? "border-primary" : ""}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-secondary">
                              {getInteractionIcon(interaction.interaction_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{interaction.title}</h4>
                                {interaction.is_important && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span>{interactionTypeLabels[interaction.interaction_type]}</span>
                                <span>•</span>
                                <span>{format(new Date(interaction.interaction_date), "dd MMM yyyy, HH:mm", { locale: ru })}</span>
                                {interaction.duration_minutes && (
                                  <>
                                    <span>•</span>
                                    <span>{interaction.duration_minutes} мин</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColors[interaction.status]}>
                              {interactionStatusLabels[interaction.status]}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingInteraction(interaction)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingId(interaction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {(interaction.description || interaction.outcome || interaction.tags?.length) && (
                        <CardContent className="space-y-2">
                          {interaction.description && (
                            <p className="text-sm text-muted-foreground">{interaction.description}</p>
                          )}
                          {interaction.outcome && (
                            <div className="text-sm">
                              <span className="font-medium">Результат: </span>
                              {interaction.outcome}
                            </div>
                          )}
                          {interaction.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {interaction.tags.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground pt-2">
                            Создал: {interaction.creator?.profiles?.first_name} {interaction.creator?.profiles?.name}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <CreateInteractionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        patientId={patientId}
        patientName={patientName}
      />

      {editingInteraction && (
        <EditInteractionDialog
          open={!!editingInteraction}
          onOpenChange={(open) => !open && setEditingInteraction(null)}
          interaction={editingInteraction}
          patientId={patientId}
          patientName={patientName}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить взаимодействие?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Запись будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
