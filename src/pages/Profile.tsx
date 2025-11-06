import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Profile {
  name: string;
  birth_date: string;
  gender: string;
  telegram_id?: string;
}

export default function Profile() {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const genderLabel = {
    male: "Мужской",
    female: "Женский",
    other: "Другой",
  }[profile?.gender || "male"];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-neon-accent border-accent/30 bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-3xl bg-gradient-primary bg-clip-text text-transparent">
              Профиль
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <label className="text-sm text-muted-foreground">Имя</label>
              <p className="text-lg font-medium">{profile?.name}</p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <label className="text-sm text-muted-foreground">Дата рождения</label>
              <p className="text-lg font-medium">
                {profile?.birth_date && new Date(profile.birth_date).toLocaleDateString("ru-RU")}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <label className="text-sm text-muted-foreground">Пол</label>
              <p className="text-lg font-medium">{genderLabel}</p>
            </div>

            {profile?.telegram_id && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <label className="text-sm text-muted-foreground">Telegram ID</label>
                <p className="text-lg font-medium">{profile.telegram_id}</p>
              </div>
            )}

            <div className="pt-6 border-t border-border">
              <Button 
                variant="destructive" 
                onClick={handleLogout} 
                className="w-full shadow-md hover:shadow-lg"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Выйти из системы
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
