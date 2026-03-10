import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Calendar,
  Activity,
  CreditCard,
  Syringe,
  FileText,
  Heart,
  Target,
  Sparkles,
  Eye,
  Ruler,
  Weight,
  Edit,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditNextAnalysisDialog } from "@/components/admin/EditNextAnalysisDialog";
import { EditSubscriptionDialog } from "@/components/admin/EditSubscriptionDialog";
import { SubscriptionHistoryDialog } from "@/components/admin/SubscriptionHistoryDialog";
import { PatientInteractionsTab } from "@/components/admin/PatientInteractionsTab";

interface PatientInfoDialogProps {
  patientId: string | null;
  onClose: () => void;
  onOpenView: (patientId: string) => void;
}

export function PatientInfoDialog({ patientId, onClose, onOpenView }: PatientInfoDialogProps) {
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [isEditSubscriptionOpen, setIsEditSubscriptionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Real-time subscription for analysis bookings and subscriptions updates
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel('patient-info-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'analysis_bookings',
          filter: `user_id=eq.${patientId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patient-info", patientId] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'subscriptions',
          filter: `user_id=eq.${patientId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patient-info", patientId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, queryClient]);
  
  const { data: patientData, isLoading } = useQuery({
    queryKey: ["patient-info", patientId],
    queryFn: async () => {
      if (!patientId) return null;

      // Основная информация профиля + последний вес
      const [{ data: profile, error: profileError }, { data: latestWeightRecord }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", patientId).single(),
        supabase.from("weight_history").select("weight").eq("user_id", patientId).order("measured_at", { ascending: false }).limit(1).single()
      ]);

      if (profileError) throw profileError;
      
      const actualWeight = latestWeightRecord?.weight ? Number(latestWeightRecord.weight) : profile?.weight;

      // Подписка с информацией о тарифе
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans (
            display_name,
            name
          ),
          subscription_pricing (
            period_display,
            duration_months
          )
        `)
        .eq("user_id", patientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Бронирование анализа - берем запись с датой следующего анализа или последнюю не not_scheduled
      const { data: bookings } = await supabase
        .from("analysis_bookings")
        .select("*")
        .eq("user_id", patientId)
        .neq("status", "not_scheduled")
        .order("booking_date", { ascending: false })
        .limit(1);
      
      const booking = bookings?.[0] || null;

      // Жалобы и цели
      const { data: complaints } = await supabase
        .from("complaints")
        .select("*")
        .eq("user_id", patientId)
        .maybeSingle();

      // Количество анализов
      const { count: analysisCount } = await supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", patientId);

      // Последний анализ
      const { data: latestAnalysis } = await supabase
        .from("analyses")
        .select("date, status")
        .eq("user_id", patientId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Медицинская история
      const { count: medicalHistoryCount } = await supabase
        .from("medical_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", patientId);

      return {
        profile,
        subscription,
        booking,
        complaints,
        analysisCount: analysisCount || 0,
        latestAnalysis,
        medicalHistoryCount: medicalHistoryCount || 0,
      };
    },
    enabled: !!patientId,
  });

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSubscriptionBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: "Активна", className: "bg-primary text-primary-foreground" },
      pending: { label: "Ожидает оплаты", className: "bg-secondary text-secondary-foreground" },
      expired: { label: "Истекла", className: "bg-destructive text-destructive-foreground" },
      cancelled: { label: "Отменена", className: "border-border" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={status === "active" ? "default" : "outline"} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getBookingBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      not_scheduled: { label: "Не назначен", variant: "secondary" },
      scheduled: { label: "Назначен", variant: "outline" },
      collected: { label: "Получен", variant: "default" },
      uploaded: { label: "Загружен", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.not_scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!patientId) return null;

  return (
    <Dialog open={!!patientId} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Информация о пациенте</DialogTitle>
          <DialogDescription>
            Подробная информация и статусы пациента
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        ) : patientData ? (
          <>
            {/* Основная информация с аватаром - над вкладками */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(patientData.profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-semibold">{patientData.profile.name || "Без имени"}</h3>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{patientData.profile.email || "Email не указан"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Регистрация: {new Date(patientData.profile.created_at).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Вкладки */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">
                  <User className="w-4 h-4 mr-2" />
                  Обзор
                </TabsTrigger>
                <TabsTrigger value="medical">
                  <Heart className="w-4 h-4 mr-2" />
                  Медицинские данные
                </TabsTrigger>
                <TabsTrigger value="interactions">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Взаимодействия
                </TabsTrigger>
              </TabsList>

              {/* Вкладка "Обзор" */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Личные данные */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Личные данные
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Возраст:</span>
                        <span className="font-medium">
                          {patientData.profile.birth_date
                            ? `${calculateAge(patientData.profile.birth_date)} лет`
                            : "Не указан"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Пол:</span>
                        <Badge variant="outline">
                          {patientData.profile.gender === "male" ? "Мужской" : "Женский"}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Ruler className="w-4 h-4" /> Рост:
                        </span>
                        <span className="font-medium">
                          {patientData.profile.height ? `${patientData.profile.height} см` : "Не указан"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Weight className="w-4 h-4" /> Вес:
                        </span>
                        <span className="font-medium">
                          {patientData.profile.weight ? `${patientData.profile.weight} кг` : "Не указан"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Подписка */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          Подписка
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsHistoryOpen(true)}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            История
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditSubscriptionOpen(true)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Изменить
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Статус:</span>
                        {getSubscriptionBadge(patientData.subscription?.status || "pending")}
                      </div>
                      {patientData.subscription && (
                        <>
                          {patientData.subscription.subscription_plans && (
                            <>
                              <Separator />
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Тариф:</span>
                                <span className="font-medium">
                                  {patientData.subscription.subscription_plans.display_name}
                                </span>
                              </div>
                            </>
                          )}
                          {patientData.subscription.subscription_pricing && (
                            <>
                              <Separator />
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Период оплаты:</span>
                                <span className="font-medium">
                                  {patientData.subscription.subscription_pricing.period_display}
                                </span>
                              </div>
                            </>
                          )}
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Сумма:</span>
                            <span className="font-medium">{patientData.subscription.amount} ₽</span>
                          </div>
                          {patientData.subscription.start_date && (
                            <>
                              <Separator />
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Период действия:</span>
                                <span>
                                  {new Date(patientData.subscription.start_date).toLocaleDateString("ru-RU")} —{" "}
                                  {patientData.subscription.end_date
                                    ? new Date(patientData.subscription.end_date).toLocaleDateString("ru-RU")
                                    : "—"}
                                </span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Следующий анализ */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Следующий анализ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Syringe className="w-4 h-4" /> Статус бронирования:
                        </span>
                        {getBookingBadge(patientData.booking?.status || "not_scheduled")}
                      </div>
                      {patientData.booking && patientData.booking.status !== "not_scheduled" && (
                        <>
                          {patientData.booking.booking_date && (
                            <>
                              <Separator />
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Дата записи:</span>
                                <span>
                                  {new Date(patientData.booking.booking_date).toLocaleDateString("ru-RU")}{" "}
                                  {patientData.booking.booking_time}
                                </span>
                              </div>
                            </>
                          )}
                          {patientData.booking.address && (
                            <>
                              <Separator />
                              <div className="flex flex-col gap-1 text-sm">
                                <span className="text-muted-foreground">Адрес:</span>
                                <span className="font-medium">{patientData.booking.address}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Дата следующего анализа:</span>
                        <button
                          onClick={() => setIsEditDateOpen(true)}
                          className="font-medium border-b border-dotted border-current hover:text-primary transition-colors cursor-pointer"
                        >
                          {patientData.booking?.next_analysis_date
                            ? new Date(patientData.booking.next_analysis_date).toLocaleDateString("ru-RU")
                            : "Не назначена"}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Вкладка "Медицинские данные" */}
              <TabsContent value="medical" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Анализы */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Анализы
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Всего анализов:</span>
                        <span className="font-semibold text-lg">{patientData.analysisCount}</span>
                      </div>
                      {patientData.latestAnalysis && (
                        <>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Последний анализ:</span>
                            <span className="font-medium">
                              {new Date(patientData.latestAnalysis.date).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Медицинская информация */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="w-5 h-5" />
                        Медицинская информация
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Записей в истории болезни:</span>
                        <span className="font-medium">{patientData.medicalHistoryCount} записей</span>
                      </div>
                      {patientData.complaints && (
                        <>
                          {patientData.complaints.main_complaints && (
                            <>
                              <Separator />
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <FileText className="w-4 h-4" />
                                  <span className="text-sm">Основные жалобы:</span>
                                </div>
                                <p className="text-sm pl-5">{patientData.complaints.main_complaints}</p>
                              </div>
                            </>
                          )}
                          {patientData.complaints.goals && (
                            <>
                              <Separator />
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Target className="w-4 h-4" />
                                  <span className="text-sm">Цели:</span>
                                </div>
                                <p className="text-sm pl-5">{patientData.complaints.goals}</p>
                              </div>
                            </>
                          )}
                          {patientData.complaints.lifestyle && (
                            <>
                              <Separator />
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Sparkles className="w-4 h-4" />
                                  <span className="text-sm">Образ жизни:</span>
                                </div>
                                <p className="text-sm pl-5">{patientData.complaints.lifestyle}</p>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Вкладка "Взаимодействия" */}
              <TabsContent value="interactions" className="mt-4">
                <PatientInteractionsTab
                  patientId={patientId}
                  patientName={patientData.profile.name || ''}
                />
              </TabsContent>
            </Tabs>

            {/* Кнопки действий */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
              <Button onClick={() => onOpenView(patientId)}>
                <Eye className="w-4 h-4 mr-2" />
                Открыть режим просмотра
              </Button>
            </div>
          </>
        ) : null}

        {/* Диалог редактирования даты следующего анализа */}
        {patientData?.booking && (
          <EditNextAnalysisDialog
            open={isEditDateOpen}
            onOpenChange={setIsEditDateOpen}
            bookingId={patientData.booking.id}
            currentDate={patientData.booking.next_analysis_date}
            userId={patientId}
          />
        )}
        
        {/* Edit Subscription Dialog */}
        {patientId && (
          <>
            <EditSubscriptionDialog
              open={isEditSubscriptionOpen}
              onClose={() => setIsEditSubscriptionOpen(false)}
              subscription={patientData?.subscription || null}
              patientId={patientId}
            />
            <SubscriptionHistoryDialog
              open={isHistoryOpen}
              onClose={() => setIsHistoryOpen(false)}
              userId={patientId}
              patientName={patientData?.profile.name || ""}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
