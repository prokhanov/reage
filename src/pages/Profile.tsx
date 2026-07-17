import { useEffect, useState } from "react";
import { ProfileSkeleton } from "@/components/skeletons/ProfileSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  User, Mail, Calendar, Ruler, Heart, Edit2, LogOut, 
  Shield, Activity, AlertCircle, Sparkles, Phone, FileText, CheckCircle2, KeyRound
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { EditMedicalHistoryDialog } from "@/components/profile/EditMedicalHistoryDialog";
import { PassportDataDialog } from "@/components/PassportDataDialog";
import { isPassportDataComplete } from "@/components/PassportFields";
import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { MedicalAnketaCard } from "@/components/profile/MedicalAnketaCard";
import { PhoneChangeField } from "@/components/profile/PhoneChangeField";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useQueryClient } from "@tanstack/react-query";
import { performSafeLogout } from "@/lib/authLogout";
import { resolveDemoModeAccess } from "@/lib/demoModeAccess";

interface Profile {
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  email?: string | null;
  birth_date: string;
  gender: string;
  height: number | null;
  telegram_id?: string;
  phone?: string | null;
  phone_verified_at?: string | null;
  passport_series?: string | null;
  passport_number?: string | null;
  operations?: Record<string, unknown> | null;
  medications?: string[] | null;
  health_note?: string | null;
}

interface MedicalCondition {
  id: string;
  category: string;
  condition: string;
}

export default function Profile() {
  const { getUserId, isViewMode } = useViewAsUser();
  const { demoMode, toggleDemoMode } = useDemoMode();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [medicalHistory, setMedicalHistory] = useState<MedicalCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editMedicalOpen, setEditMedicalOpen] = useState(false);
  const [editPassportOpen, setEditPassportOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [nextAnalysisDate, setNextAnalysisDate] = useState<string | null>(null);
  const [hasAnalyses, setHasAnalyses] = useState(false);
  // Является ли ПРОСМАТРИВАЕМЫЙ пользователь пациентом.
  // Пациентские блоки (мед. анкета, паспорт, демо-режим) показываем только пациентам.
  const [isPatientProfile, setIsPatientProfile] = useState(false);
  const [canShowDemoModeCard, setCanShowDemoModeCard] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadProfile();
    loadMedicalHistory();
    loadNextAnalysisDate();
    checkHasAnalyses();
    checkIsPatient();
  }, []);

  const checkIsPatient = async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role, role_id')
        .eq('user_id', uid);

      const roles = (data || []).map((row) => row.role);
      const roleIds = (data || []).map((row) => row.role_id).filter(Boolean) as string[];

      const [personalPerms, rolePerms] = await Promise.all([
        supabase
          .from('admin_permissions')
          .select('module')
          .eq('user_id', uid)
          .eq('enabled', true)
          .limit(1),
        roleIds.length > 0
          ? supabase
              .from('role_permissions')
              .select('module')
              .in('role_id', roleIds)
              .eq('enabled', true)
              .limit(1)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const hasAdminAccess = (personalPerms.data?.length || 0) > 0 || (rolePerms.data?.length || 0) > 0;
      setIsPatientProfile(roles.includes('patient'));
      setCanShowDemoModeCard(resolveDemoModeAccess(roles, isViewMode, hasAdminAccess).allowed);
    } catch (error) {
      console.error('Error checking patient role:', error);
    }
  };

  const checkHasAnalyses = async () => {
    try {
      const uid = await getUserId();
      if (!uid) return;

      const { count } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid);

      setHasAnalyses(count ? count > 0 : false);
    } catch (error) {
      console.error('Error checking analyses:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const uid = await getUserId();
      if (!uid) throw new Error("Не авторизован");
      setUserId(uid);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data as unknown as Profile);
        const profileEmail = (data as any).email as string | null | undefined;
        if (profileEmail) {
          setEmail(profileEmail);
        } else if (!isViewMode) {
          // Fallback только для собственного профиля (не view-as)
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) setEmail(userData.user.email || "");
        } else {
          setEmail("");
        }
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить профиль",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMedicalHistory = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("medical_history")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      setMedicalHistory(data || []);
    } catch (error) {
      console.error("Error loading medical history:", error);
    }
  };

  const loadNextAnalysisDate = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const { data, error } = await supabase
        .from("analysis_bookings")
        .select("next_analysis_date, status")
        .eq("user_id", userId)
        .eq("status", "collected")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data?.next_analysis_date) {
        setNextAnalysisDate(data.next_analysis_date);
      }
    } catch (error) {
      console.error("Error loading next analysis date:", error);
    }
  };

  const handleLogout = async () => {
    toast({ title: "Вы вышли из системы" });
    await performSafeLogout(queryClient);
  };

  const getAge = () => {
    if (!profile?.birth_date) return null;
    const [y, m, d] = profile.birth_date.split("-").map(Number);
    const birthDate = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const groupedMedical = medicalHistory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item.condition);
    return acc;
  }, {} as Record<string, string[]>);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <ProfileSkeleton />
      </div>
    );
  }

  const age = getAge();

  const nameParts = (profile?.name || "").trim().split(/\s+/).filter(Boolean);
  const firstName = profile?.first_name || nameParts[0] || "";
  const lastName = profile?.last_name || nameParts.slice(1).join(" ") || "";
  const middleName = profile?.middle_name || "";




  return (
    <div className="container mx-auto px-4 pt-4 pb-8 sm:py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Профиль</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Управляйте своими персональными данными
        </p>
      </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Personal Info Card */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold leading-tight">Личная информация</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Основные данные о вас
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Редактировать"
                onClick={() => setEditProfileOpen(true)}
                className="sm:hidden flex-shrink-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditProfileOpen(true)}
                className="hidden sm:inline-flex"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
            </div>


            {/* Mobile: compact list */}
            <div className="sm:hidden divide-y divide-border/40 rounded-lg border border-border/40 bg-background/40">
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Имя</span>
                <span className="font-medium text-right truncate">{firstName || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Фамилия</span>
                <span className="font-medium text-right truncate">{lastName || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Отчество</span>
                <span className="font-medium text-right truncate">{middleName || "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Email</span>
                <span className="font-medium text-right truncate">{email}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Пол и возраст</span>
                <span className="font-medium text-right truncate">
                  {profile?.gender === "female" ? "Женщина" : "Мужчина"}
                  {age && <span className="text-muted-foreground"> · {age} лет</span>}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Дата рождения</span>
                <span className="font-medium text-right truncate">
                  {profile?.birth_date && format(new Date(profile.birth_date), "d MMMM yyyy", { locale: ru })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-muted-foreground flex-shrink-0">Рост</span>
                <span className="font-medium text-right truncate">
                  {profile?.height ? `${profile.height} см` : "Не указан"}
                </span>
              </div>
            </div>

            {/* Desktop: card grid */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First name */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Имя</label>
                </div>
                <p className="text-lg font-medium">{firstName || "—"}</p>
              </div>

              {/* Last name */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Фамилия</label>
                </div>
                <p className="text-lg font-medium">{lastName || "—"}</p>
              </div>

              {/* Email */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Email</label>
                </div>
                <p className="text-lg font-medium break-all">{email}</p>
              </div>

              {/* Gender & Age */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Пол и возраст</label>
                </div>
                <p className="text-lg font-medium">
                  {profile?.gender === "female" ? "Женщина" : "Мужчина"}
                  {age && <span className="text-muted-foreground ml-2">• {age} лет</span>}
                </p>
              </div>

              {/* Birth Date */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Дата рождения</label>
                </div>
                <p className="text-lg font-medium">
                  {profile?.birth_date && format(new Date(profile.birth_date), "d MMMM yyyy", { locale: ru })}
                </p>
              </div>

              {/* Height */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Рост</label>
                </div>
                <p className="text-lg font-medium">
                  {profile?.height ? `${profile.height} см` : "Не указан"}
                </p>
              </div>
            </div>


            {/* Phone (inline with verification flow) */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <PhoneChangeField
                currentPhone={profile?.phone || null}
                isVerified={!!profile?.phone_verified_at}
                onUpdated={() => loadProfile()}
              />
            </div>
          </Card>

          {/* Пациентские блоки: паспорт, следующий анализ, мед. анкета, демо-режим.
              Для сотрудников/врачей/админов не отображаются. */}
          {isPatientProfile && <>
          {/* Passport Card */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold leading-tight">Паспортные данные</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                    Нужны для оформления забора анализов
                  </p>
                </div>
              </div>
              {profile?.passport_series && profile?.passport_number && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Редактировать"
                    onClick={() => setEditPassportOpen(true)}
                    className="sm:hidden flex-shrink-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditPassportOpen(true)}
                    className="hidden sm:inline-flex"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>
                </>
              )}
            </div>

            {profile?.passport_series && profile?.passport_number ? (
              <>
                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-border/40 rounded-lg border border-border/40 bg-background/40">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Серия</span>
                    <span className="font-medium tracking-wider">{profile.passport_series}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Номер</span>
                    <span className="font-medium tracking-wider">{profile.passport_number}</span>
                  </div>
                </div>
                <p className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground mt-3">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                  Используются при записи на анализ
                </p>
                {/* Desktop grid */}
                <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                    <label className="text-sm text-muted-foreground block mb-2">Серия</label>
                    <p className="text-lg font-medium tracking-wider">{profile.passport_series}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                    <label className="text-sm text-muted-foreground block mb-2">Номер</label>
                    <p className="text-lg font-medium tracking-wider">{profile.passport_number}</p>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Данные сохранены и используются при записи на анализ
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border/70 bg-background/30 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Паспортные данные не заполнены. Без них невозможно оформить выезд медсестры или визит в клинику.
                </p>
                <Button onClick={() => setEditPassportOpen(true)} className="w-full sm:w-auto">
                  Заполнить
                </Button>
              </div>
            )}
          </Card>


          {/* Next Analysis Date Card */}
          {nextAnalysisDate && (
            <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold leading-tight">Следующий анализ</h2>
                  <p className="text-sm sm:text-lg font-medium text-muted-foreground mt-0.5 sm:mt-1">
                    {format(new Date(nextAnalysisDate), "PPP", { locale: ru })}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Medical Anketa Card */}
          <MedicalAnketaCard
            medicalHistory={medicalHistory}
            operations={profile?.operations ?? null}
            medications={profile?.medications ?? null}
            healthNote={profile?.health_note ?? null}
            gender={profile?.gender ?? null}
            reproductiveStatus={(profile as any)?.reproductive_status ?? null}
            onEdit={() => setEditMedicalOpen(true)}
          />



          {/* Demo Mode Card */}
          {canShowDemoModeCard && <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold leading-tight">Демо-режим</h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Показывать примерные данные вместо реальных
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 rounded-lg bg-background/50 border border-border/50">
                <Label htmlFor="demo-mode" className="cursor-pointer min-w-0">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    Показывать примерные данные. Отключится автоматически после первого анализа.
                  </div>
                </Label>
                <Switch
                  id="demo-mode"
                  checked={demoMode}
                  onCheckedChange={toggleDemoMode}
                  disabled={hasAnalyses && !demoMode}
                />
              </div>

              {hasAnalyses && demoMode && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    У вас уже есть реальные анализы. Отключите демо-режим, чтобы увидеть их вместо примерных данных.
                  </AlertDescription>
                </Alert>
              )}

              {hasAnalyses && !demoMode && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    Демо-режим недоступен, так как у вас уже есть реальные анализы.
                  </AlertDescription>
                </Alert>
              )}

              {!hasAnalyses && !demoMode && (
                <Alert className="bg-primary/5 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs sm:text-sm">
                    Включите демо-режим, чтобы увидеть, как будет выглядеть приложение с вашими данными.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </Card>}
          </>}

          {/* Security Card */}
          <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold leading-tight">Безопасность</h2>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Управление аккаунтом
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {!isViewMode && (
                <Button
                  variant="outline"
                  onClick={() => setChangePasswordOpen(true)}
                  className="w-full justify-start"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Сменить пароль
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти из системы
              </Button>
            </div>
          </Card>

        </div>

        {/* Edit Dialogs */}
        <EditProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          profile={profile}
          userId={userId}
          onSuccess={() => {
            loadProfile();
            setEditProfileOpen(false);
          }}
        />

        <EditMedicalHistoryDialog
          open={editMedicalOpen}
          onOpenChange={setEditMedicalOpen}
          medicalHistory={medicalHistory}
          operations={profile?.operations ?? null}
          medications={profile?.medications ?? null}
          healthNote={profile?.health_note ?? null}
          gender={profile?.gender ?? null}
          reproductiveStatus={(profile as any)?.reproductive_status ?? null}
          userId={userId}

          onSuccess={() => {
            loadMedicalHistory();
            loadProfile();
            setEditMedicalOpen(false);
          }}
        />

        <PassportDataDialog
          open={editPassportOpen}
          onOpenChange={setEditPassportOpen}
          onSaved={() => loadProfile()}
        />

        <ChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
          email={email}
          userName={profile?.name ?? null}
        />

      </div>
  );
}
