import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Activity, TrendingUp, Brain, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Добро пожаловать, {profile?.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Хронологический возраст: <span className="text-primary font-medium">{profile?.birth_date ? calculateAge(profile.birth_date) : "—"} лет</span>
          </p>
        </div>

        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/30 bg-secondary/50 backdrop-blur-sm hover:bg-secondary/70 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Биологический возраст</CardTitle>
              <Brain className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">—</div>
              <p className="text-xs text-muted-foreground mt-1">Требуется анализ</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-secondary/50 backdrop-blur-sm hover:bg-secondary/70 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Индекс здоровья</CardTitle>
              <Heart className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">—</div>
              <p className="text-xs text-muted-foreground mt-1">0-100 шкала</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-secondary/50 backdrop-blur-sm hover:bg-secondary/70 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Всего анализов</CardTitle>
              <Activity className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">За всё время</p>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-secondary/50 backdrop-blur-sm hover:bg-secondary/70 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Тренд</CardTitle>
              <TrendingUp className="h-5 w-5 text-status-good" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-status-good">—</div>
              <p className="text-xs text-muted-foreground mt-1">Изменение за месяц</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Large Chart - Biomarkers Over Time */}
          <Card className="lg:col-span-2 border-border/30 bg-secondary/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Динамика биомаркеров</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Activity className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Нет данных для отображения</p>
                  <p className="text-xs mt-2">Добавьте анализы для просмотра трендов</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Circular Progress - Health Score */}
          <Card className="border-border/30 bg-secondary/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Общая оценка</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="hsl(var(--border))"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="hsl(var(--primary))"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray="552.92"
                      strokeDashoffset="552.92"
                      className="transition-all duration-1000"
                      style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-primary">—</span>
                    <span className="text-xs text-muted-foreground mt-1">Нет данных</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/30 bg-secondary/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Недавние анализы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Анализы отсутствуют</p>
                  <button 
                    onClick={() => navigate("/analyses")}
                    className="mt-4 text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                  >
                    Добавить первый анализ →
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/30 bg-secondary/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Ключевые рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Рекомендации появятся после анализа</p>
                <button 
                  onClick={() => navigate("/recommendations")}
                  className="mt-4 text-primary hover:text-primary-hover text-sm font-medium transition-colors"
                >
                  Смотреть все рекомендации →
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
