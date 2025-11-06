import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, Mail, Calendar, Ruler, Heart, Edit2, LogOut, 
  Shield, Activity, ArrowLeft, Eye, LayoutDashboard, FileText, 
  Lightbulb, TrendingUp, Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { EditMedicalHistoryDialog } from "@/components/profile/EditMedicalHistoryDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BodyHeatmap } from "@/components/BodyHeatmap";

interface Profile {
  name: string;
  birth_date: string;
  gender: string;
  height: number | null;
  telegram_id?: string;
}

interface MedicalCondition {
  id: string;
  category: string;
  condition: string;
}

export default function Profile() {
  const { userId: viewingUserId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [medicalHistory, setMedicalHistory] = useState<MedicalCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editMedicalOpen, setEditMedicalOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isViewingAsUser, setIsViewingAsUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Dashboard data
  const [analysesCount, setAnalysesCount] = useState(0);
  const [latestBioAge, setLatestBioAge] = useState<number | null>(null);
  const [latestHealthIndex, setLatestHealthIndex] = useState<number | null>(null);
  const [agingRate, setAgingRate] = useState<number | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [bodyHeatmapData, setBodyHeatmapData] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    checkPermissionsAndLoad();
  }, [viewingUserId]);

  useEffect(() => {
    if (isViewingAsUser && profile) {
      loadDashboardData();
      loadAnalyses();
      loadRecommendations();
    }
  }, [isViewingAsUser, profile]);

  const checkPermissionsAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      setCurrentUserId(user.id);

      // Check if superadmin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .single();

      const isSuperAdminUser = !!roleData;
      setIsSuperAdmin(isSuperAdminUser);

      // If viewing another user's profile, check permissions
      if (viewingUserId && viewingUserId !== user.id) {
        if (!isSuperAdminUser) {
          toast({
            title: "Доступ запрещен",
            description: "У вас нет прав для просмотра этого профиля",
            variant: "destructive"
          });
          navigate("/profile");
          return;
        }
        setIsViewingAsUser(true);
      }

      loadProfile();
      loadMedicalHistory();
    } catch (error: any) {
      console.error("Error checking permissions:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const targetUserId = viewingUserId || user.id;

      // Get email from auth.users if viewing another user
      if (viewingUserId && viewingUserId !== user.id) {
        // For viewed user, we'll show a placeholder since we can't access auth.users directly
        setEmail("***@***.***");
      } else {
        setEmail(user.email || "");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetUserId)
        .single();

      if (error) throw error;
      setProfile(data);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const targetUserId = viewingUserId || user.id;

      const { data, error } = await supabase
        .from("medical_history")
        .select("*")
        .eq("user_id", targetUserId);

      if (error) throw error;
      setMedicalHistory(data || []);
    } catch (error) {
      console.error("Error loading medical history:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Вы вышли из системы",
    });
    navigate("/");
  };

  const getAge = () => {
    if (!profile?.birth_date) return null;
    const birthDate = new Date(profile.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const loadDashboardData = async () => {
    try {
      const targetUserId = viewingUserId || currentUserId;
      if (!targetUserId) return;

      const { data: analysesData } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false });

      if (analysesData && analysesData.length > 0) {
        const latestAnalysis = analysesData[0];
        setAnalysesCount(analysesData.length);
        setLatestBioAge(latestAnalysis.biological_age);
        setLatestHealthIndex(latestAnalysis.health_index);

        if (latestAnalysis.biological_age && profile?.birth_date) {
          const chronologicalAge = getAge();
          if (chronologicalAge) {
            const rate = latestAnalysis.biological_age / chronologicalAge;
            setAgingRate(rate);
          }
        }

        const { data: biomarkerValues } = await supabase
          .from("analysis_values")
          .select(`
            value,
            biomarkers (name, category, normal_min, normal_max)
          `)
          .eq("analysis_id", latestAnalysis.id);

        const formattedData = biomarkerValues?.map((item: any) => ({
          category: item.biomarkers.category,
          name: item.biomarkers.name,
          value: item.value,
          normal_min: item.biomarkers.normal_min,
          normal_max: item.biomarkers.normal_max
        })) || [];

        setBodyHeatmapData(Array.from(new Map(formattedData.map((i: any) => [i.name, i])).values()));
      }

      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - 6);

      const { data: trendValues } = await supabase
        .from("analysis_values")
        .select(`
          value,
          biomarkers (category),
          analyses!inner (date, user_id)
        `)
        .eq("analyses.user_id", targetUserId)
        .gte("analyses.date", monthsAgo.toISOString().split("T")[0])
        .order("analyses(date)", { ascending: true });

      if (trendValues && trendValues.length > 0) {
        const dateMap: Record<string, Record<string, { sum: number; count: number }>> = {};
        
        trendValues.forEach((item: any) => {
          const date = new Date(item.analyses.date).toLocaleDateString("ru-RU", { 
            day: "numeric", 
            month: "short" 
          });
          const category = item.biomarkers?.category || "Прочее";
          
          if (!dateMap[date]) dateMap[date] = {};
          if (!dateMap[date][category]) dateMap[date][category] = { sum: 0, count: 0 };
          
          dateMap[date][category].sum += item.value;
          dateMap[date][category].count += 1;
        });

        const categoryStats: Record<string, number> = {};
        Object.values(dateMap).forEach(dateData => {
          Object.entries(dateData).forEach(([cat, stats]) => {
            categoryStats[cat] = (categoryStats[cat] || 0) + stats.count;
          });
        });
        
        const allCategories = Object.entries(categoryStats)
          .sort((a, b) => b[1] - a[1])
          .map(([cat]) => cat)
          .slice(0, 3);

        const categoryAverages: Record<string, number[]> = {};
        allCategories.forEach(cat => {
          categoryAverages[cat] = [];
        });

        Object.entries(dateMap).forEach(([date, categories]) => {
          allCategories.forEach(cat => {
            if (categories[cat]) {
              const avg = categories[cat].sum / categories[cat].count;
              categoryAverages[cat].push(avg);
            } else {
              categoryAverages[cat].push(NaN);
            }
          });
        });

        const formatted = Object.keys(dateMap).map((date, idx) => {
          const point: any = { date };
          allCategories.forEach(cat => {
            const values = categoryAverages[cat];
            const firstValue = values.find(v => !isNaN(v));
            const currentValue = values[idx];
            
            if (firstValue && !isNaN(currentValue)) {
              point[cat] = Math.round((currentValue / firstValue) * 100);
            }
          });
          return point;
        });

        setTrendData(formatted);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const loadAnalyses = async () => {
    try {
      const targetUserId = viewingUserId || currentUserId;
      if (!targetUserId) return;

      const { data } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false });

      setAnalyses(data || []);
    } catch (error) {
      console.error("Error loading analyses:", error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const targetUserId = viewingUserId || currentUserId;
      if (!targetUserId) return;

      const { data } = await supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      setRecommendations(data || []);
    } catch (error) {
      console.error("Error loading recommendations:", error);
    }
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
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const genderEmoji = profile?.gender === "female" ? "👩" : "👨";
  const age = getAge();

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Admin viewing indicator */}
        {isViewingAsUser && (
          <Alert className="mb-6 border-primary bg-primary/10">
            <Eye className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Вы просматриваете профиль как суперадмин. Это то, что видит пользователь.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/patients")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                К списку пациентов
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {isViewingAsUser ? profile?.name : "Профиль"}
          </h1>
          <p className="text-muted-foreground">
            {isViewingAsUser ? "Полная информация о пациенте" : "Управляйте своими персональными данными"}
          </p>
        </div>

        <Tabs defaultValue={isViewingAsUser ? "dashboard" : "profile"} className="space-y-6">
          <TabsList>
            {isViewingAsUser && (
              <TabsTrigger value="dashboard">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Дашборд
              </TabsTrigger>
            )}
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Профиль
            </TabsTrigger>
            {isViewingAsUser && (
              <>
                <TabsTrigger value="analyses">
                  <FileText className="w-4 h-4 mr-2" />
                  Анализы ({analysesCount})
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Рекомендации
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {isViewingAsUser && (
            <TabsContent value="dashboard" className="space-y-6">
              <Card className="border-border bg-card backdrop-blur-sm">
                <CardContent className="pt-8 pb-8">
                  <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-64 h-64 transform -rotate-90">
                        <circle cx="128" cy="128" r="112" stroke="hsl(var(--border))" strokeWidth="16" fill="none" opacity="0.2" />
                        <circle
                          cx="128" cy="128" r="112"
                          stroke={ageDifference && ageDifference > 0 ? "hsl(var(--status-good))" : ageDifference && ageDifference < 0 ? "hsl(var(--status-danger))" : "hsl(var(--primary))"}
                          strokeWidth="16" fill="none" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 112}`}
                          strokeDashoffset={`${2 * Math.PI * 112 * (1 - circleProgress / 100)}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="text-6xl font-bold">{latestBioAge ? latestBioAge.toFixed(1) : "—"}</div>
                        <div className="text-sm text-muted-foreground mt-2">лет</div>
                        <div className="text-xs text-muted-foreground mt-1">Биологический возраст</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Биологический возраст</h3>
                        {latestBioAge && chronologicalAge && ageDifference !== null ? (
                          ageDifference > 0 ? (
                            <p className="text-lg text-status-good">На {Math.abs(ageDifference).toFixed(1)} года моложе 🎉</p>
                          ) : ageDifference < 0 ? (
                            <p className="text-lg text-status-danger">На {Math.abs(ageDifference).toFixed(1)} года старше</p>
                          ) : (
                            <p className="text-lg text-muted-foreground">Соответствует паспортному</p>
                          )
                        ) : (
                          <p className="text-lg text-muted-foreground">Нет данных</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {bodyHeatmapData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Карта показателей</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BodyHeatmap data={bodyHeatmapData} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Личная информация</h2>
                  <p className="text-sm text-muted-foreground">
                    Основные данные о {isViewingAsUser ? "пациенте" : "вас"}
                  </p>
                </div>
              </div>
              {!isViewingAsUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditProfileOpen(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Редактировать
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <label className="text-sm text-muted-foreground">Имя</label>
                </div>
                <p className="text-lg font-medium">{profile?.name}</p>
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
                  <span className="mr-2">{genderEmoji}</span>
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
          </Card>

          {/* Medical History Card */}
          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">История болезней</h2>
                  <p className="text-sm text-muted-foreground">
                    {medicalHistory.length > 0 
                      ? `${medicalHistory.length} ${medicalHistory.length === 1 ? 'заболевание' : 'заболеваний'}`
                      : "Нет записей"
                    }
                  </p>
                </div>
              </div>
              {!isViewingAsUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMedicalOpen(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Редактировать
                </Button>
              )}
            </div>

            {medicalHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>История болезней не заполнена</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedMedical).map(([category, conditions]) => (
                  <div key={category} className="p-4 rounded-lg bg-background/50 border border-border/50">
                    <h3 className="font-medium mb-3 text-sm text-muted-foreground">
                      {category}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {conditions.map((condition, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

            {!isViewingAsUser && (
              <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Безопасность</h2>
                    <p className="text-sm text-muted-foreground">Управление аккаунтом</p>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleLogout} className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти из системы
                </Button>
              </Card>
            )}
          </TabsContent>

          {isViewingAsUser && (
            <TabsContent value="analyses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>История анализов</CardTitle>
                  <CardDescription>Все анализы пациента</CardDescription>
                </CardHeader>
                <CardContent>
                  {analyses.length > 0 ? (
                    <div className="space-y-3">
                      {analyses.map((analysis) => (
                        <div
                          key={analysis.id}
                          className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/analyses/${analysis.id}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                Анализ от {new Date(analysis.date).toLocaleDateString("ru-RU")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {analysis.lab_name || "Лаборатория не указана"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {analysis.health_index !== null && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Индекс здоровья</p>
                                <p className="font-semibold text-lg">{analysis.health_index}%</p>
                              </div>
                            )}
                            {analysis.biological_age !== null && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Биологический возраст</p>
                                <p className="font-semibold text-lg">{analysis.biological_age} лет</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Анализов пока нет</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isViewingAsUser && (
            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Рекомендации</CardTitle>
                  <CardDescription>Персональные рекомендации на основе анализов</CardDescription>
                </CardHeader>
                <CardContent>
                  {recommendations.length > 0 ? (
                    <div className="space-y-4">
                      {recommendations.map((rec) => (
                        <div key={rec.id} className="p-4 rounded-lg border space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              {new Date(rec.created_at).toLocaleDateString("ru-RU")}
                            </Badge>
                          </div>
                          <p className="text-sm">{rec.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Рекомендаций пока нет</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {!isViewingAsUser && (
          <>
            <EditProfileDialog
              open={editProfileOpen}
              onOpenChange={setEditProfileOpen}
              profile={profile}
              onSuccess={() => {
                loadProfile();
                setEditProfileOpen(false);
              }}
            />

            <EditMedicalHistoryDialog
              open={editMedicalOpen}
              onOpenChange={setEditMedicalOpen}
              medicalHistory={medicalHistory}
              onSuccess={() => {
                loadMedicalHistory();
                setEditMedicalOpen(false);
              }}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
