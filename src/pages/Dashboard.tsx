import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Zap, Pill, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Profile {
  name: string;
  birth_date: string;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Не авторизован");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const chronologicalAge = profile ? calculateAge(profile.birth_date) : 0;
  const biologicalAge = 32; // Mock data
  const healthIndex = 78; // Mock data

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Добро пожаловать, {profile?.name}!
          </h2>
          <p className="text-muted-foreground">
            Ваш персональный дашборд здоровья и долголетия
          </p>
        </div>

        {/* Health Index Card */}
        <Card className="mb-8 border-2 border-primary/30 shadow-neon-primary bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Circular Health Index */}
              <div className="relative">
                <div className="w-48 h-48 rounded-full bg-gradient-hero p-1 shadow-neon-primary animate-pulse">
                  <div className="w-full h-full rounded-full bg-card flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                      {healthIndex}
                    </span>
                    <span className="text-sm text-muted-foreground">Индекс здоровья</span>
                  </div>
                </div>
              </div>

              {/* Age Info */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold mb-4">Ваш возраст</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 hover:shadow-neon-primary transition-all">
                    <p className="text-sm text-muted-foreground mb-1">Биологический возраст</p>
                    <p className="text-3xl font-bold text-primary">{biologicalAge} лет</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30 hover:shadow-neon-secondary transition-all">
                    <p className="text-sm text-muted-foreground mb-1">Хронологический возраст</p>
                    <p className="text-3xl font-bold text-secondary">{chronologicalAge} лет</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-status-good font-medium flex items-center justify-center md:justify-start gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-status-good animate-pulse" />
                  Отлично! Ваш биологический возраст ниже хронологического
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-neon-primary hover:border-primary/50 transition-all border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Метаболизм</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-good mb-1">Хорошо</p>
              <p className="text-sm text-muted-foreground">
                Уровень глюкозы в норме, инсулин стабилен
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-neon-accent hover:border-accent/50 transition-all border-accent/20 bg-gradient-to-br from-card to-accent/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Воспаление</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-warning mb-1">Есть риски</p>
              <p className="text-sm text-muted-foreground">CRP немного повышен, требуется внимание</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-neon-secondary hover:border-secondary/50 transition-all border-secondary/20 bg-gradient-to-br from-card to-secondary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-secondary" />
                <CardTitle className="text-lg">Гормоны</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-good mb-1">Хорошо</p>
              <p className="text-sm text-muted-foreground">Гормональный баланс в норме</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-neon-primary hover:border-primary/50 transition-all border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Витамины</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-warning mb-1">Требуется внимание</p>
              <p className="text-sm text-muted-foreground">Витамин D ниже оптимального уровня</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2 border-primary/30 hover:border-primary hover:shadow-neon-primary hover:bg-primary/10 transition-all"
            onClick={() => navigate("/analyses")}
          >
            <FileText className="h-6 w-6" />
            <span>Мои анализы</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2 border-accent/30 hover:border-accent hover:shadow-neon-accent hover:bg-accent/10 transition-all"
            onClick={() => navigate("/recommendations")}
          >
            <Pill className="h-6 w-6" />
            <span>Рекомендации</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2 border-secondary/30 hover:border-secondary hover:shadow-neon-secondary hover:bg-secondary/10 transition-all"
            onClick={() => navigate("/trends")}
          >
            <BarChart3 className="h-6 w-6" />
            <span>Тренды</span>
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
