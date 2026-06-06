import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isRealtimeDisabled } from "@/lib/realtime";
import { Search, Mail, Phone, RefreshCw, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { EmailConfirmationBadge } from "@/components/admin/EmailConfirmationBadge";
import { PhoneConfirmationBadge } from "@/components/admin/PhoneConfirmationBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PatientsListSkeleton } from "@/components/skeletons/PatientsListSkeleton";
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
import { useToast } from "@/hooks/use-toast";
import { PatientViewDialog } from "@/components/admin/PatientViewDialog";
import { PatientInfoDialog } from "@/components/admin/PatientInfoDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [selectedPatientForInfo, setSelectedPatientForInfo] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 20;

  // Setup real-time subscriptions
  useEffect(() => {
    if (isRealtimeDisabled()) return;
    const channel = supabase
      .channel('patients-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analyses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'analysis_bookings' },
        () => {
          console.log('Analysis booking changed, refreshing patient list');
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["patients"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: patients, isLoading, refetch } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      // Get all profiles first
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user roles separately with custom roles
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role, role_id, custom_roles(name, display_name)");

      const rolesMap = (allRoles || []).reduce((acc: any, role: any) => {
        if (!acc[role.user_id]) {
          acc[role.user_id] = {
            baseRole: role.role,
            customRole: role.custom_roles,
            allRoles: [role.role]
          };
        } else {
          acc[role.user_id].allRoles.push(role.role);
          // Приоритизируем привилегированные роли
          if ((role.role !== 'user' && role.role !== 'patient') || (role.custom_roles && role.custom_roles.name !== 'user')) {
            acc[role.user_id].baseRole = role.role;
            acc[role.user_id].customRole = role.custom_roles;
          }
        }
        return acc;
      }, {});

      // Get analysis count for each user
      const profilesWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count: analysisCount } = await supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          const { data: latestAnalysis } = await supabase
            .from("analyses")
            .select("date")
            .eq("user_id", profile.id)
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get subscription status with plan details
          // Приоритет: активная подписка с end_date, иначе — самая свежая запись
          const { data: subscriptions } = await supabase
            .from("subscriptions")
            .select(`
              status,
              end_date,
              created_at,
              subscription_plans (
                display_name
              )
            `)
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false });

          const subscription =
            subscriptions?.find((s) => s.status === "active" && s.end_date) ||
            subscriptions?.find((s) => s.end_date) ||
            subscriptions?.[0] ||
            null;


          // Get analysis booking status: prefer last meaningful (not 'not_scheduled')
          const { data: latestMeaningful } = await supabase
            .from("analysis_bookings")
            .select("status, created_at, updated_at")
            .eq("user_id", profile.id)
            .neq("status", "not_scheduled")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const { data: latestAny } = await supabase
            .from("analysis_bookings")
            .select("status, created_at, updated_at")
            .eq("user_id", profile.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const effectiveBookingStatus = latestMeaningful?.status || latestAny?.status;

          const userRoleData = rolesMap[profile.id] || { 
            baseRole: "user", 
            customRole: null, 
            allRoles: ["user"] 
          };
          
          // Priority: superadmin > admin > doctor > user
        const primaryRole = userRoleData.allRoles.includes("superadmin")
          ? "superadmin"
          : userRoleData.allRoles.includes("admin")
          ? "admin"
          : userRoleData.allRoles.includes("doctor")
          ? "doctor"
          : userRoleData.allRoles.includes("patient")
          ? "patient"
          : "user";

          return {
            ...profile,
            analysisCount: analysisCount || 0,
            latestAnalysisDate: latestAnalysis?.date,
            subscriptionStatus: subscription?.status || 'pending',
            subscriptionEndDate: subscription?.end_date || null,
            subscriptionPlan: subscription?.subscription_plans?.display_name || null,
            bookingStatus: effectiveBookingStatus || 'not_scheduled',

            role: primaryRole,
            allRoles: userRoleData.allRoles,
            customRole: userRoleData.customRole,
          };
        })
      );

      // Фильтруем: показываем только пациентов
      const patientsList = profilesWithStats.filter(p => p.role === "patient");

      return patientsList.map(p => ({
        ...p,
        emailConfirmed: p.email_verified === true,
      }));
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast({
        title: "Пациент удален",
        description: "Пациент и все его данные успешно удалены"
      });
      setDeletePatientId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить пациента",
        variant: "destructive"
      });
    }
  });

  const filteredPatients = patients?.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.gender?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil((filteredPatients?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPatients = filteredPatients?.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      superadmin: { label: "Суперадмин", variant: "destructive" },
      admin: { label: "Админ", variant: "default" },
      doctor: { label: "Врач", variant: "default" },
      user: { label: "Пользователь", variant: "secondary" },
      patient: { label: "Пациент", variant: "secondary" },
    };
    const config = roleConfig[role] || roleConfig.patient;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  const getSubscriptionBadge = (status: string, endDate: string | null) => {
    const formatDate = (d: string) =>
      new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    // Если есть дата окончания — показываем её обычным текстом, цвет по факту истечения
    if (endDate) {
      const expired = new Date(endDate).getTime() < Date.now();
      return (
        <span
          className={
            expired
              ? "text-sm text-red-600 dark:text-red-400"
              : "text-sm text-green-600 dark:text-green-400"
          }
        >
          {formatDate(endDate)}
        </span>
      );
    }

    const labels: Record<string, string> = {
      active: "Активна",
      pending: "Не оплачен",
      expired: "Истекла",
      cancelled: "Отменена",
    };
    return <span className="text-sm text-muted-foreground">{labels[status] || labels.pending}</span>;
  };


  const getBookingBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      not_scheduled: { label: "Не назначен", variant: "secondary" },
      scheduled: { label: "Назначен", variant: "outline" },
      collected: { label: "Получен", variant: "default" },
      uploaded: { label: "Загружен", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.not_scheduled;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <PatientsListSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Пациенты</h1>
        <p className="text-muted-foreground mt-1">
          Список всех зарегистрированных пользователей
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Все пациенты ({filteredPatients?.length || 0})</CardTitle>
                <CardDescription>
                  Нажмите на пациента, чтобы посмотреть его профиль
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или полу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Email / Телефон</TableHead>
                      <TableHead className="text-center">Возраст</TableHead>
                      <TableHead>Пол</TableHead>
                      <TableHead>Подписка</TableHead>
                      <TableHead>Тариф</TableHead>
                      <TableHead>Статус анализа</TableHead>
                      <TableHead className="text-center">Анализов</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatients && paginatedPatients.length > 0 ? (
                      paginatedPatients.map((patient) => (
                        <TableRow
                          key={patient.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedPatientForInfo(patient.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(patient.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{patient.name || "Без имени"}</p>
                                <p className="text-xs text-muted-foreground">
                                  Регистрация:{" "}
                                  {new Date(patient.created_at).toLocaleDateString("ru-RU")}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {patient.email ? (
                                <div className="flex items-center gap-2 min-w-0">
                                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                                  {patient.emailConfirmed ? (
                                    <span className="text-sm text-green-600 dark:text-green-400 truncate">{patient.email}</span>
                                  ) : (
                                    <EmailConfirmationBadge
                                      email={patient.email}
                                      isConfirmed={false}
                                      adminMode
                                      userId={patient.id}
                                      onConfirmed={() => refetch()}
                                      trigger={
                                        <span className="text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer truncate">
                                          {patient.email}
                                        </span>
                                      }
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Mail className="w-4 h-4 shrink-0" />
                                  <span>—</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 min-w-0">
                                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                                {patient.phone ? (
                                  patient.phone_verified_at ? (
                                    <span className="text-sm text-green-600 dark:text-green-400 truncate">+{patient.phone}</span>
                                  ) : (
                                    <PhoneConfirmationBadge
                                      phone={patient.phone}
                                      isVerified={false}
                                      adminMode
                                      userId={patient.id}
                                      onUpdated={() => refetch()}
                                      trigger={
                                        <span className="text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer truncate">
                                          +{patient.phone}
                                        </span>
                                      }
                                    />
                                  )
                                ) : (
                                  <PhoneConfirmationBadge
                                    phone={null}
                                    isVerified={false}
                                    adminMode
                                    userId={patient.id}
                                    onUpdated={() => refetch()}
                                    trigger={
                                      <span className="text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer">
                                        Не указан
                                      </span>
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </TableCell>


                          <TableCell className="text-center">
                            {patient.birth_date ? (
                              calculateAge(patient.birth_date)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.gender ? (
                              <Badge variant="outline">
                                {patient.gender === "male" ? "М" : "Ж"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getSubscriptionBadge(patient.subscriptionStatus, patient.subscriptionEndDate)}
                          </TableCell>
                          <TableCell>
                            {patient.subscriptionPlan ? (
                              <span className="text-sm">{patient.subscriptionPlan}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getBookingBadge(patient.bookingStatus)}</TableCell>
                          <TableCell className="text-center">
                            {patient.analysisCount}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletePatientId(patient.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Пациенты не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = page === 1 || 
                                        page === totalPages || 
                                        Math.abs(page - currentPage) <= 1;
                        
                        if (!showPage) {
                          // Show ellipsis before/after current range
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
          </CardContent>
        </Card>

      <AlertDialog open={!!deletePatientId} onOpenChange={(open) => !open && setDeletePatientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пациента?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Будут удалены все данные пациента:
              профиль, анализы, назначения, история симптомов и все связанные записи.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatientId && deletePatientMutation.mutate(deletePatientId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePatientMutation.isPending}
            >
              {deletePatientMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PatientInfoDialog
        patientId={selectedPatientForInfo}
        onClose={() => setSelectedPatientForInfo(null)}
        onOpenView={(patientId) => {
          setSelectedPatientForInfo(null);
          setSelectedPatientId(patientId);
        }}
      />

      <PatientViewDialog 
        patientId={selectedPatientId} 
        onClose={() => setSelectedPatientId(null)} 
      />
    </div>
  );
}
