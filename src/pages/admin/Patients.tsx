import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Calendar, Activity, Mail, CreditCard, Syringe, Trash2 } from "lucide-react";
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

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletePatientId, setDeletePatientId] = useState<string | null>(null);
  const [selectedPatientForInfo, setSelectedPatientForInfo] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: patients, isLoading } = useQuery({
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

          // Get subscription status
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("status")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get analysis booking status
          const { data: booking } = await supabase
            .from("analysis_bookings")
            .select("status")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

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
            bookingStatus: booking?.status || 'not_scheduled',
            role: primaryRole,
            allRoles: userRoleData.allRoles,
            customRole: userRoleData.customRole,
          };
        })
      );

      // Фильтруем: показываем только пациентов
      return profilesWithStats.filter(p => {
        return p.role === "patient";
      });
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

  const getSubscriptionBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Активна", variant: "default" },
      pending: { label: "Ожидает оплаты", variant: "secondary" },
      expired: { label: "Истекла", variant: "destructive" },
      cancelled: { label: "Отменена", variant: "outline" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className="text-xs">
        <CreditCard className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
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
        <Syringe className="w-3 h-3 mr-1" />
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
                      <TableHead>Email</TableHead>
                      <TableHead>Возраст</TableHead>
                      <TableHead>Пол</TableHead>
                      <TableHead>Подписка</TableHead>
                      <TableHead>Статус анализа</TableHead>
                      <TableHead>Анализов</TableHead>
                      <TableHead className="w-[100px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients && filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
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
                            {patient.email ? (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{patient.email}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.birth_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                {calculateAge(patient.birth_date)} лет
                              </div>
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
                          <TableCell>{getSubscriptionBadge(patient.subscriptionStatus)}</TableCell>
                          <TableCell>{getBookingBadge(patient.bookingStatus)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              {patient.analysisCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatientForInfo(patient.id);
                                }}
                              >
                                <User className="w-4 h-4 mr-2" />
                                Открыть
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletePatientId(patient.id);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Пациенты не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
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
