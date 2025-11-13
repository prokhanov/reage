import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const interactionTypes = [
  { value: 'online_consultation', label: 'Онлайн-консультация' },
  { value: 'phone_call', label: 'Телефонный звонок' },
  { value: 'email', label: 'Email' },
  { value: 'in_person_meeting', label: 'Личная встреча' },
  { value: 'message', label: 'Сообщение' },
  { value: 'note', label: 'Заметка' },
  { value: 'task', label: 'Задача' },
  { value: 'appointment', label: 'Встреча' }
];

const interactionStatuses = [
  { value: 'completed', label: 'Завершено' },
  { value: 'scheduled', label: 'Запланировано' },
  { value: 'cancelled', label: 'Отменено' },
  { value: 'pending', label: 'В ожидании' },
  { value: 'in_progress', label: 'В процессе' }
];

interface EditInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction: any;
  patientId: string;
  patientName: string;
}

export function EditInteractionDialog({ 
  open, 
  onOpenChange, 
  interaction,
  patientId,
  patientName 
}: EditInteractionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [interactionDate, setInteractionDate] = useState<Date>(new Date(interaction.interaction_date));
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    interaction.scheduled_date ? new Date(interaction.scheduled_date) : undefined
  );
  const [isImportant, setIsImportant] = useState(interaction.is_important);
  
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      interaction_type: interaction.interaction_type,
      status: interaction.status,
      title: interaction.title,
      description: interaction.description || '',
      outcome: interaction.outcome || '',
      duration_minutes: interaction.duration_minutes?.toString() || '',
      tags: interaction.tags?.join(', ') || '',
      related_analysis_id: interaction.related_analysis_id || '',
      related_prescription_id: interaction.related_prescription_id || ''
    }
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (interaction) {
      setValue('interaction_type', interaction.interaction_type);
      setValue('status', interaction.status);
      setValue('title', interaction.title);
      setValue('description', interaction.description || '');
      setValue('outcome', interaction.outcome || '');
      setValue('duration_minutes', interaction.duration_minutes?.toString() || '');
      setValue('tags', interaction.tags?.join(', ') || '');
      setValue('related_analysis_id', interaction.related_analysis_id || '');
      setValue('related_prescription_id', interaction.related_prescription_id || '');
      setInteractionDate(new Date(interaction.interaction_date));
      setScheduledDate(interaction.scheduled_date ? new Date(interaction.scheduled_date) : undefined);
      setIsImportant(interaction.is_important);
    }
  }, [interaction, setValue]);

  const { data: analyses } = useQuery({
    queryKey: ['patient-analyses', patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('analyses')
        .select('id, date')
        .eq('user_id', patientId)
        .order('date', { ascending: false });
      return data || [];
    }
  });

  const { data: prescriptions } = useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('prescriptions')
        .select('id, prescription')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      const tags = values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

      const { error } = await (supabase as any)
        .from('patient_interactions')
        .update({
          interaction_type: values.interaction_type,
          status: values.status,
          title: values.title,
          description: values.description || null,
          outcome: values.outcome || null,
          interaction_date: interactionDate.toISOString(),
          scheduled_date: scheduledDate?.toISOString() || null,
          duration_minutes: values.duration_minutes ? parseInt(values.duration_minutes) : null,
          related_analysis_id: values.related_analysis_id || null,
          related_prescription_id: values.related_prescription_id || null,
          tags,
          is_important: isImportant
        })
        .eq('id', interaction.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-interactions', patientId] });
      toast({ title: "Взаимодействие обновлено" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Ошибка обновления", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать взаимодействие: {patientName}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип взаимодействия*</Label>
              <Select 
                value={watch('interaction_type')}
                onValueChange={(value) => setValue('interaction_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interactionTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Статус*</Label>
              <Select 
                value={watch('status')}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interactionStatuses.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Название*</Label>
            <Input {...register('title', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea {...register('description')} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Дата взаимодействия*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(interactionDate, "dd.MM.yyyy HH:mm", { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={interactionDate}
                    onSelect={(date) => date && setInteractionDate(date)}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedStatus === 'scheduled' && (
              <div className="space-y-2">
                <Label>Запланировано на</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "dd.MM.yyyy", { locale: ru }) : "Выберите дату"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      locale={ru}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label>Длительность (минуты)</Label>
              <Input type="number" {...register('duration_minutes')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Результат</Label>
            <Textarea {...register('outcome')} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Связанный анализ</Label>
              <Select 
                value={watch('related_analysis_id')}
                onValueChange={(value) => setValue('related_analysis_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбрано" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбрано</SelectItem>
                  {analyses?.map(analysis => (
                    <SelectItem key={analysis.id} value={analysis.id}>
                      Анализ от {format(new Date(analysis.date), "dd.MM.yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Связанный рецепт</Label>
              <Select 
                value={watch('related_prescription_id')}
                onValueChange={(value) => setValue('related_prescription_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбрано" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбрано</SelectItem>
                  {prescriptions?.map(prescription => (
                    <SelectItem key={prescription.id} value={prescription.id}>
                      {prescription.prescription.substring(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Теги (через запятую)</Label>
            <Input {...register('tags')} />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="important" 
              checked={isImportant}
              onCheckedChange={(checked) => setIsImportant(checked as boolean)}
            />
            <Label htmlFor="important" className="cursor-pointer">
              Отметить как важное
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
