import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Calendar, Activity } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      // Get all profiles first
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user roles separately
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = (allRoles || []).reduce((acc: any, role: any) => {
        if (!acc[role.user_id]) {
          acc[role.user_id] = [];
        }
        acc[role.user_id].push(role.role);
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

          const userRoles = rolesMap[profile.id] || ["user"];
          // Priority: superadmin > admin > user
          const primaryRole = userRoles.includes("superadmin")
            ? "superadmin"
            : userRoles.includes("admin")
            ? "admin"
            : "user";

          return {
            ...profile,
            analysisCount: analysisCount || 0,
            latestAnalysisDate: latestAnalysis?.date,
            role: primaryRole,
            allRoles: userRoles,
          };
        })
      );

      return profilesWithStats;
    },
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
      user: { label: "Пациент", variant: "secondary" },
    };
    const config = roleConfig[role] || roleConfig.user;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
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

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пациент</TableHead>
                      <TableHead>Возраст</TableHead>
                      <TableHead>Пол</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Анализов</TableHead>
                      <TableHead>Последний анализ</TableHead>
                      <TableHead className="w-[100px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients && filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => (
                        <TableRow
                          key={patient.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/patients/${patient.id}`)}
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
                          <TableCell>{getRoleBadge(patient.role)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-muted-foreground" />
                              {patient.analysisCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            {patient.latestAnalysisDate ? (
                              new Date(patient.latestAnalysisDate).toLocaleDateString("ru-RU")
                            ) : (
                              <span className="text-muted-foreground">Нет анализов</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/patients/${patient.id}`);
                              }}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Открыть
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Пациенты не найдены
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
