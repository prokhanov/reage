import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Heart, Zap, Pill, LogOut, User, BarChart3, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  name: string;
  birth_date: string;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    } catch (error: any) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Вы вышли из системы",
    });
    navigate("/");
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            ReAge
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <User className="mr-2 h-4 w-4" />
              Профиль
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Добро пожаловать, {profile?.name}!</h2>
          <p className="text-muted-foreground">
            Ваш персональный дашборд здоровья и долголетия
          </p>
        </div>

        {/* Health Index Card */}
        <Card className="mb-8 border-2 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Circular Health Index */}
              <div className="relative">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary to-secondary p-1">
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
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Биологический возраст</p>
                    <p className="text-3xl font-bold text-primary">{biologicalAge} лет</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Хронологический возраст</p>
                    <p className="text-3xl font-bold text-foreground">{chronologicalAge} лет</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-status-good font-medium">
                  ✨ Отлично! Ваш биологический возраст ниже хронологического
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow">
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

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg">Воспаление</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-status-warning mb-1">Есть риски</p>
              <p className="text-sm text-muted-foreground">CRP немного повышен, требуется внимание</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
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

          <Card className="hover:shadow-md transition-shadow">
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
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/analyses")}
          >
            <FileText className="h-6 w-6" />
            <span>Мои анализы</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/recommendations")}
          >
            <Pill className="h-6 w-6" />
            <span>Рекомендации</span>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-24 flex flex-col gap-2"
            onClick={() => navigate("/trends")}
          >
            <BarChart3 className="h-6 w-6" />
            <span>Тренды</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
