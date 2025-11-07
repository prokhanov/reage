import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, Mail, Calendar, Ruler, Heart, Edit2, LogOut, 
  Shield, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { EditProfileDialog } from "@/components/profile/EditProfileDialog";
import { EditMedicalHistoryDialog } from "@/components/profile/EditMedicalHistoryDialog";
import { useViewAsUser } from "@/hooks/useViewAsUser";

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
  const { getUserId, isViewMode } = useViewAsUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [medicalHistory, setMedicalHistory] = useState<MedicalCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editMedicalOpen, setEditMedicalOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
    loadMedicalHistory();
  }, []);

  const loadProfile = async () => {
    try {
      const uid = await getUserId();
      if (!uid) throw new Error("Не авторизован");
      setUserId(uid);

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setEmail(userData.user.email || "");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile(data);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Вы вышли из системы",
    });
    navigate("/");
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Профиль</h1>
          <p className="text-muted-foreground">
            Управляйте своими персональными данными
          </p>
        </div>

        <div className="space-y-6">
          {/* Personal Info Card */}
          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Личная информация</h2>
                  <p className="text-sm text-muted-foreground">
                    Основные данные о вас
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditProfileOpen(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMedicalOpen(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
              </Button>
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

          {/* Security Card */}
          <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Безопасность</h2>
                <p className="text-sm text-muted-foreground">
                  Управление аккаунтом
                </p>
              </div>
            </div>

            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти из системы
            </Button>
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
          userId={userId}
          onSuccess={() => {
            loadMedicalHistory();
            setEditMedicalOpen(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
