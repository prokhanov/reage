import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pill,
  UtensilsCrossed,
  Activity,
  Moon,
  Stethoscope,
  Sparkles,
  Calendar,
  Loader2,
} from "lucide-react";

type PrescriptionV2 = {
  id: string;
  user_id: string;
  analysis_id: string | null;
  name: string | null;
  form: string | null;
  dosage: string | null;
  how_to_take: string | null;
  duration: string | null;
  prescription: string;
  reason: string | null;
  effect: string | null;
  status: string;
  created_at: string;
};

type FollowUp = {
  specialist?: string;
  goal?: string;
  trigger?: string;
};

type LifestyleV2 = {
  id: string;
  user_id: string;
  analysis_id: string;
  nutrition: string[];
  activity: string[];
  sleep: string[];
  follow_ups: FollowUp[];
  created_at: string;
};

type AnalysisLite = { id: string; date: string };

export default function PrescriptionsV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { viewAsUserId, isViewMode } = useViewAsUser();
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const userId = viewAsUserId || undefined;

  // Загружаем все нутрицевтики v2
  const { data: prescriptions = [], isLoading: presLoading } = useQuery({
    queryKey: ["prescriptions_v2", userId],
    queryFn: async () => {
      let q = supabase
        .from("prescriptions_v2" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as PrescriptionV2[]) || [];
    },
  });

  // Загружаем lifestyle v2
  const { data: lifestyleRows = [], isLoading: lsLoading } = useQuery({
    queryKey: ["lifestyle_v2", userId],
    queryFn: async () => {
      let q = supabase
        .from("lifestyle_recommendations_v2" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as LifestyleV2[]) || [];
    },
  });

  // Список анализов пациента — для кнопки генерации
  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses_for_v2", userId],
    enabled: isViewMode, // показываем только в режиме админа/просмотра пациента
    queryFn: async () => {
      let q = supabase.from("analyses").select("id, date").order("date", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as AnalysisLite[]) || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      setGeneratingFor(analysisId);
      const { data, error } = await supabase.functions.invoke("analyze-biomarkers-v2", {
        body: { analysisId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Ошибка генерации");
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Готово",
        description: `Создано: нутрицевтиков ${data.prescriptions_created}, питание ${data.lifestyle.nutrition}, активность ${data.lifestyle.activity}, сон ${data.lifestyle.sleep}, консультаций ${data.follow_ups}`,
      });
      queryClient.invalidateQueries({ queryKey: ["prescriptions_v2"] });
      queryClient.invalidateQueries({ queryKey: ["lifestyle_v2"] });
      setGeneratingFor(null);
    },
    onError: (err: any) => {
      toast({
        title: "Ошибка",
        description: err?.message || "Не удалось сгенерировать",
        variant: "destructive",
      });
      setGeneratingFor(null);
    },
  });

  const isLoading = presLoading || lsLoading;

  // Сводные числа
  const lifestyle = lifestyleRows[0]; // последняя запись по убыванию created_at
  const totalCount =
    prescriptions.length +
    (lifestyle?.nutrition?.length || 0) +
    (lifestyle?.activity?.length || 0) +
    (lifestyle?.sleep?.length || 0) +
    (lifestyle?.follow_ups?.length || 0);

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Рекомендации-2</h1>
          <p className="text-muted-foreground mt-1">
            Тестовая пересборка раздела рекомендаций. Хранит и отображает все типы рекомендаций
            одинаково: нутрицевтики, питание, активность, сон и консультации.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Всего: {totalCount}
        </Badge>
      </div>

      {/* Кнопки генерации (только в режиме просмотра пациента / админ) */}
      {isViewMode && analyses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Сгенерировать для анализа
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analyses.slice(0, 5).map((a) => (
              <Button
                key={a.id}
                variant="outline"
                size="sm"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate(a.id)}
              >
                {generatingFor === a.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                {format(new Date(a.date), "d MMM yyyy", { locale: ru })}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : totalCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Рекомендации ещё не сгенерированы.
            {isViewMode && " Нажмите кнопку выше, чтобы создать."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Нутрицевтики */}
          <Section
            icon={<Pill className="h-5 w-5" />}
            title="Нутрицевтики"
            count={prescriptions.length}
          >
            {prescriptions.length === 0 ? (
              <EmptyText text="Нет назначений" />
            ) : (
              <div className="grid gap-3">
                {prescriptions.map((p) => (
                  <PrescriptionCard key={p.id} item={p} />
                ))}
              </div>
            )}
          </Section>

          {/* Питание */}
          <Section
            icon={<UtensilsCrossed className="h-5 w-5" />}
            title="Питание"
            count={lifestyle?.nutrition?.length || 0}
          >
            <BulletList items={lifestyle?.nutrition || []} />
          </Section>

          {/* Активность */}
          <Section
            icon={<Activity className="h-5 w-5" />}
            title="Физическая активность"
            count={lifestyle?.activity?.length || 0}
          >
            <BulletList items={lifestyle?.activity || []} />
          </Section>

          {/* Сон */}
          <Section
            icon={<Moon className="h-5 w-5" />}
            title="Сон и восстановление"
            count={lifestyle?.sleep?.length || 0}
          >
            <BulletList items={lifestyle?.sleep || []} />
          </Section>

          {/* Консультации */}
          <Section
            icon={<Stethoscope className="h-5 w-5" />}
            title="Доп. консультации и обследования"
            count={lifestyle?.follow_ups?.length || 0}
          >
            {(lifestyle?.follow_ups || []).length === 0 ? (
              <EmptyText text="Не требуется" />
            ) : (
              <div className="grid gap-2">
                {(lifestyle?.follow_ups || []).map((f, i) => (
                  <div
                    key={i}
                    className="rounded-md border bg-card/50 p-3 text-sm space-y-1"
                  >
                    <div className="font-medium">{f.specialist}</div>
                    {f.goal && <div className="text-muted-foreground">Цель: {f.goal}</div>}
                    {f.trigger && (
                      <div className="text-muted-foreground">Основание: {f.trigger}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          <span>{title}</span>
          <Badge variant="outline" className="ml-auto">
            {count}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return <EmptyText text="Нет рекомендаций" />;
  return (
    <ul className="space-y-2 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-primary mt-1">•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="text-sm text-muted-foreground italic">{text}</div>;
}

function PrescriptionCard({ item }: { item: PrescriptionV2 }) {
  return (
    <div className="rounded-lg border bg-card/50 p-4 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="font-semibold">
          {item.name || item.prescription.substring(0, 80)}
        </div>
        {item.form && (
          <Badge variant="outline" className="text-xs">
            {item.form}
          </Badge>
        )}
      </div>
      {(item.dosage || item.how_to_take || item.duration) && (
        <div className="text-sm text-muted-foreground space-y-0.5">
          {item.dosage && (
            <div>
              <span className="text-foreground/70">Дозировка:</span> {item.dosage}
            </div>
          )}
          {item.how_to_take && (
            <div>
              <span className="text-foreground/70">Приём:</span> {item.how_to_take}
            </div>
          )}
          {item.duration && (
            <div>
              <span className="text-foreground/70">Длительность:</span> {item.duration}
            </div>
          )}
        </div>
      )}
      {item.reason && (
        <div className="text-sm">
          <span className="text-muted-foreground">Причина:</span> {item.reason}
        </div>
      )}
      {item.effect && (
        <div className="text-sm">
          <span className="text-muted-foreground">Эффект:</span> {item.effect}
        </div>
      )}
    </div>
  );
}
