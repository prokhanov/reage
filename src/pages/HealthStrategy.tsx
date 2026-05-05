import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useViewAsUser } from "@/hooks/useViewAsUser";
import { useUserRole } from "@/hooks/useUserRole";
import { useDemoMode } from "@/hooks/useDemoMode";
import { DemoBanner } from "@/components/DemoBanner";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { calculateAge } from "@/lib/biomarkerNorms";
import { RejuvenationTrajectory } from "@/components/health-strategy/RejuvenationTrajectory";
import { SystemMatrix } from "@/components/health-strategy/SystemMatrix";
import { ActionMap } from "@/components/health-strategy/ActionMap";
import { RoadmapTimeline } from "@/components/health-strategy/RoadmapTimeline";
import { toast } from "@/hooks/use-toast";

interface Snapshot {
  current_bio_age: number;
  chronological_age: number;
  target_bio_age: number;
  health_index: number | null;
  system_goals: any[];
  action_map: any[];
  rationale: string | null;
  analysis_id: string;
  created_at: string;
}

export default function HealthStrategy() {
  const { getUserId, viewAsUserId } = useViewAsUser();
  const { demoMode, demoData, loading: demoLoading, toggleDemoMode } = useDemoMode();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [nextCheckup, setNextCheckup] = useState<string | null>(null);
  const [hasAnalyses, setHasAnalyses] = useState(false);

  useEffect(() => {
    setSnapshot(null);
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewAsUserId, demoMode]);

  const load = async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;

      const [{ data: prof }, { data: cats }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("biomarker_categories").select("name, display_order").order("display_order"),
      ]);
      setProfile(prof);
      const catNames = (cats || []).map((c) => c.name);
      setCategories(catNames);

      const { data: analyses } = await supabase
        .from("analyses")
        .select("*, analysis_values(value, biomarkers(name, code, category, unit, normal_min, normal_max, normal_min_male, normal_max_male, normal_min_female, normal_max_female, optimal_min, optimal_max, optimal_min_male, optimal_max_male, optimal_min_female, optimal_max_female, critical_min, critical_max, critical_min_male, critical_max_male, critical_min_female, critical_max_female, age_ranges, range_mode))")
        .eq("user_id", userId)
        .eq("status", "processed")
        .order("date", { ascending: false })
        .limit(1);

      const latest = analyses?.[0];
      setAnalysis(latest);
      setHasAnalyses(!!latest);

      const { data: nextBooking } = await supabase
        .from("analysis_bookings")
        .select("booking_date, next_analysis_date")
        .eq("user_id", userId)
        .gte("booking_date", new Date().toISOString().slice(0, 10))
        .order("booking_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      setNextCheckup(nextBooking?.booking_date || nextBooking?.next_analysis_date || null);

      const { data: snap } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snap && latest && snap.analysis_id === latest.id) {
        setSnapshot(snap as any);
      } else if (latest) {
        await generate(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generate = async (force: boolean) => {
    try {
      setGenerating(true);
      const userId = await getUserId();
      if (!userId) return;
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("compute-health-strategy", {
        body: { userId, force },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSnapshot(data);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Не удалось рассчитать стратегию", description: e?.message || "Попробуйте позже", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading || demoLoading) {
    return <div className="p-4 md:p-8"><DashboardSkeleton /></div>;
  }

  // Resolve display data (demo mode override)
  const displayProfile = profile;
  const age = displayProfile?.birth_date ? calculateAge(displayProfile.birth_date) : 40;
  const gender: "male" | "female" = displayProfile?.gender === "female" ? "female" : "male";
  const startDate = analysis?.date || new Date().toISOString().slice(0, 10);
  const values = analysis?.analysis_values || [];

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Стратегия здоровья
          </h1>
          <p className="text-sm text-muted-foreground">
            Персональный план управления биологическим возрастом
          </p>
        </div>
        {hasAnalyses && (
          <Button onClick={() => generate(true)} disabled={generating} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Анализируем..." : "Обновить"}
          </Button>
        )}
      </div>

      {!hasAnalyses ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Нет данных анализов</h3>
            <p className="text-muted-foreground">Добавьте первый анализ для формирования стратегии</p>
          </CardContent>
        </Card>
      ) : !snapshot ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Готовим вашу стратегию</h3>
            <p className="text-muted-foreground mb-4">AI анализирует биомаркеры и назначения</p>
            <Button onClick={() => generate(true)} disabled={generating}>
              <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              Рассчитать сейчас
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {snapshot.rationale && (
            <Alert className="bg-primary/5 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">{snapshot.rationale}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <RejuvenationTrajectory
              startDate={startDate}
              chronologicalAge={snapshot.chronological_age}
              currentBioAge={snapshot.current_bio_age}
              targetBioAge={snapshot.target_bio_age}
              healthIndex={snapshot.health_index}
            />
            <SystemMatrix
              values={values}
              age={age}
              gender={gender}
              systemGoals={snapshot.system_goals || []}
              categoryOrder={categories}
            />
            <ActionMap actions={snapshot.action_map || []} systems={categories} />
            <RoadmapTimeline startDate={startDate} nextCheckupDate={nextCheckup} />
          </div>
        </>
      )}
    </div>
  );
}
