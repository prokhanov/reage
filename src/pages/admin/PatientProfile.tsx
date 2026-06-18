import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isRealtimeDisabled } from "@/lib/realtime";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  User,
  Calendar,
  Heart,
  Activity,
  Ruler,
  Weight,
  FileText,
  TrendingUp,
  AlertCircle,
  Edit,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePrescriptionDialog } from "@/components/admin/CreatePrescriptionDialog";
import { EditNextAnalysisDialog } from "@/components/admin/EditNextAnalysisDialog";
import { PatientBookingsCard } from "@/components/admin/PatientBookingsCard";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export default function PatientProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showNextAnalysisDialog, setShowNextAnalysisDialog] = useState(false);

  // Setup real-time subscriptions for this specific patient
  useEffect(() => {
    if (!userId) return;
    if (isRealtimeDisabled()) return;

    const channel = supabase
      .channel(`patient-${userId}-changes`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["patient-profile", userId] })
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'medical_history',
          filter: `user_id=eq.${userId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["patient-medical-history", userId] })
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'analyses',
          filter: `user_id=eq.${userId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["patient-analyses", userId] })
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'complaints',
          filter: `user_id=eq.${userId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["patient-complaints", userId] })
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'analysis_bookings',
          filter: `user_id=eq.${userId}`
        },
        () => queryClient.invalidateQueries({ queryKey: ["patient-latest-booking", userId] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["patient-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: latestWeight } = useQuery({
    queryKey: ["patient-latest-weight", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("weight_history")
        .select("weight")
        .eq("user_id", userId!)
        .order("measured_at", { ascending: false })
        .limit(1)
        .single();
      return data?.weight ? Number(data.weight) : null;
    },
    enabled: !!userId,
  });

  const { data: medicalHistory } = useQuery({
    queryKey: ["patient-medical-history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_history")
        .select("*")
        .eq("user_id", userId)
        .order("category", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: analyses } = useQuery({
    queryKey: ["patient-analyses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: complaints } = useQuery({
    queryKey: ["patient-complaints", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: latestBooking, refetch: refetchBooking } = useQuery({
    queryKey: ["patient-latest-booking", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

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

  const calculateBMI = (weight: number | null, height: number | null) => {
    if (!weight || !height || height <= 0) return null;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
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

  const groupedMedicalHistory = medicalHistory?.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item.condition);
    return acc;
  }, {});

  if (loadingProfile) {
    return <AdminCenterLoader size="lg" />;
  }

  if (!profile) {
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Профиль не найден</p>
          <Button onClick={() => navigate("/admin/patients")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться к списку
          </Button>
        </div>
    );
  }

  const age = profile.birth_date ? calculateAge(profile.birth_date) : null;
  const displayWeight = latestWeight ?? (profile.weight ? Number(profile.weight) : null);
  const bmi = calculateBMI(
    displayWeight,
    profile.height ? Number(profile.height) : null
  );

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/patients")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Профиль пациента</h1>
              <p className="text-muted-foreground">Просмотр данных пациента</p>
            </div>
          </div>
          <Button onClick={() => setShowPrescriptionDialog(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Добавить назначение
          </Button>
        </div>

        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{profile.name || "Без имени"}</h2>
                  <Badge variant="outline">{profile.gender === "male" ? "Мужчина" : "Женщина"}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Возраст</p>
                      <p className="font-medium">{age ? `${age} лет` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Рост</p>
                      <p className="font-medium">{profile.height ? `${profile.height} см` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Weight className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Вес</p>
                      <p className="font-medium">{displayWeight ? `${displayWeight} кг` : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">BMI</p>
                      <p className="font-medium">{bmi || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Паспорт</p>
                      <p className="font-medium whitespace-nowrap">
                        {(profile as any)?.passport_series && (profile as any)?.passport_number
                          ? `${(profile as any).passport_series} ${(profile as any).passport_number}`
                          : "Не заполнен"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings management */}
        {userId && (
          <PatientBookingsCard
            userId={userId}
            patient={{ name: profile.name, email: profile.email, phone: profile.phone }}
          />
        )}

        <Tabs defaultValue="medical-history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="medical-history">
              <Heart className="w-4 h-4 mr-2" />
              Анамнез
            </TabsTrigger>
            <TabsTrigger value="analyses">
              <FileText className="w-4 h-4 mr-2" />
              Анализы ({analyses?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="complaints">
              <AlertCircle className="w-4 h-4 mr-2" />
              Жалобы ({complaints?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medical-history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Медицинская история</CardTitle>
                <CardDescription>Перенесенные заболевания и состояния</CardDescription>
              </CardHeader>
              <CardContent>
                {groupedMedicalHistory && Object.keys(groupedMedicalHistory).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedMedicalHistory).map(([category, conditions]: [string, any]) => (
                      <div key={category}>
                        <h3 className="font-semibold mb-3 text-sm">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {conditions.map((condition: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="justify-start">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Медицинская история не указана
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>История анализов</CardTitle>
                <CardDescription>Все анализы пациента</CardDescription>
              </CardHeader>
              <CardContent>
                {analyses && analyses.length > 0 ? (
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

          <TabsContent value="complaints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Жалобы и симптомы</CardTitle>
                <CardDescription>Текущие жалобы пациента</CardDescription>
              </CardHeader>
              <CardContent>
                {complaints && complaints.length > 0 ? (
                  <div className="space-y-4">
                    {complaints.map((complaint) => (
                      <div key={complaint.id} className="p-4 rounded-lg border space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {new Date(complaint.created_at).toLocaleDateString("ru-RU")}
                          </Badge>
                        </div>
                        {complaint.main_complaints && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Основные жалобы:</p>
                            <p className="mt-1">{complaint.main_complaints}</p>
                          </div>
                        )}
                        {complaint.goals && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Цели:</p>
                            <p className="mt-1">{complaint.goals}</p>
                          </div>
                        )}
                        {complaint.lifestyle && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Образ жизни:</p>
                            <p className="mt-1">{complaint.lifestyle}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Жалоб нет</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {userId && (
        <>
          <CreatePrescriptionDialog
            open={showPrescriptionDialog}
            onOpenChange={setShowPrescriptionDialog}
            userId={userId}
          />
          {latestBooking && (
            <EditNextAnalysisDialog
              open={showNextAnalysisDialog}
              onOpenChange={setShowNextAnalysisDialog}
              bookingId={latestBooking.id}
              currentDate={latestBooking.next_analysis_date}
              userId={userId}
            />
          )}
        </>
      )}
    </>
  );
}
