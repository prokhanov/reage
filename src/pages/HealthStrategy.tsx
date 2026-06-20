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
import { RoadmapTimeline } from "@/components/health-strategy/RoadmapTimeline";
import { SystemStatusBars } from "@/components/health-strategy/SystemStatusBars";
import { ActionMap } from "@/components/health-strategy/ActionMap";
import { SystemRatingsCard } from "@/components/dashboard/SystemRatingsCard";
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
  cohort_percentile?: number | null;
  cohort_label?: string | null;
}

export default function HealthStrategy() {
  const { getUserId, viewAsUserId, isViewMode } = useViewAsUser();
  const { data: roleData } = useUserRole();
  const isSuperAdmin = !!roleData?.isSuperAdmin;
  const { demoMode, loading: demoLoading, toggleDemoMode } = useDemoMode();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<Snapshot | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [previousAnalysis, setPreviousAnalysis] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [nextCheckup, setNextCheckup] = useState<string | null>(null);
  const [hasAnalyses, setHasAnalyses] = useState(false);
  const [riskZone, setRiskZone] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);

  const canForceRefresh = isSuperAdmin || isViewMode;

  useEffect(() => {
    setSnapshot(null);
    setPreviousSnapshot(null);
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
        .limit(2);

      const { data: allAnalysesData } = await supabase
        .from("analyses")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "processed")
        .order("date", { ascending: false });

      setAllAnalyses(allAnalysesData || []);

      const latest = analyses?.[0];
      const prev = analyses?.[1];
      setAnalysis(latest);
      setPreviousAnalysis(prev || null);
      setHasAnalyses(!!latest);

      const [{ data: nextBooking }, { data: rz }, { data: pres }] = await Promise.all([
        supabase
          .from("analysis_bookings")
          .select("booking_date, next_analysis_date")
          .eq("user_id", userId)
          .gte("booking_date", new Date().toISOString().slice(0, 10))
          .order("booking_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("risk_zone_analyses")
          .select("aging_blockers, smart_priorities, analysis_date")
          .eq("user_id", userId)
          .order("analysis_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("prescriptions")
          .select("id, name, category, reason, effect, status")
          .eq("user_id", userId)
          .eq("is_archived", false),
      ]);

      setNextCheckup(nextBooking?.booking_date || nextBooking?.next_analysis_date || null);
      setRiskZone(rz || null);
      setPrescriptions(pres || []);

      const { data: snaps } = await supabase
        .from("health_strategy_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      const matched = (snaps || []).find((s: any) => latest && s.analysis_id === latest.id);
      const previous = (snaps || []).find((s: any) => prev && s.analysis_id === prev.id);

      if (matched) {
        setSnapshot(matched as any);
        setPreviousSnapshot((previous as any) || null);
      } else if (latest) {
        await generate(false);
        setPreviousSnapshot((previous as any) || null);
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

  const displayProfile = profile;
  const age = displayProfile?.birth_date ? calculateAge(displayProfile.birth_date) : 40;
  const startDate = analysis?.date || new Date().toISOString().slice(0, 10);
  const values = analysis?.analysis_values || [];
  const previousValues = previousAnalysis?.analysis_values || [];

  const currentScores = (analysis?.biomarkers_metadata?.ai_analysis?.category_scores || {}) as Record<string, number>;
  const previousScores = (previousAnalysis?.biomarkers_metadata?.ai_analysis?.category_scores || {}) as Record<string, number>;

  const rawBlockers = riskZone?.aging_blockers as any;
  const blockers: any[] = Array.isArray(rawBlockers)
    ? rawBlockers
    : Array.isArray(rawBlockers?.blockers)
      ? rawBlockers.blockers
      : [];

  return (
    <div className="relative min-h-screen dark:bg-[#0B0C10] bg-[#F8FAFC]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-[500px] h-[500px] rounded-full dark:bg-violet-500/10 bg-indigo-300/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full dark:bg-fuchsia-500/10 bg-blue-300/20 blur-[120px]" />
      </div>

      <div className="p-4 md:p-8 space-y-5 md:space-y-6">
        {demoMode && <DemoBanner onToggleDemoMode={() => toggleDemoMode(false)} />}

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-1.5 min-w-0">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r dark:from-white dark:via-violet-200 dark:to-blue-200 from-indigo-900 via-violet-700 to-blue-700 bg-clip-text text-transparent">
              Стратегия здоровья
            </h1>
            <p className="text-sm md:text-base dark:text-white/60 text-slate-500">
              Персональный план управления биологическим возрастом
            </p>
          </div>
          {hasAnalyses && canForceRefresh && (
            <Button onClick={() => generate(true)} disabled={generating} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Анализируем..." : "Пересчитать"}
            </Button>
          )}
        </div>

        {!hasAnalyses ? (
          <Card className="border-dashed bg-card/40 backdrop-blur-xl">
            <CardContent className="py-16 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет данных анализов</h3>
              <p className="text-muted-foreground">Добавьте первый анализ для формирования стратегии</p>
            </CardContent>
          </Card>
        ) : !snapshot ? (
          <Card className="border-dashed bg-card/40 backdrop-blur-xl">
            <CardContent className="py-16 text-center">
              <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold mb-2">Готовим вашу стратегию</h3>
              <p className="text-muted-foreground">Анализируем биомаркеры и назначения…</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* 1. Траектория омоложения */}
              <RejuvenationTrajectory
                startDate={startDate}
                chronologicalAge={snapshot.chronological_age}
                currentBioAge={snapshot.current_bio_age}
                targetBioAge={snapshot.target_bio_age}
                healthIndex={snapshot.health_index}
                previousBioAge={previousSnapshot?.current_bio_age ?? null}
                previousDate={previousAnalysis?.date ?? null}
              />

              {/* 2. Контрольные точки */}
              <RoadmapTimeline startDate={startDate} nextCheckupDate={nextCheckup} />
            </div>

            {/* 3. Рейтинг систем организма */}
            <SystemRatingsCard
              categoryScores={currentScores}
              analyses={allAnalyses}
            />

            {/* 4. Активная карта действий — на всю ширину */}
            <ActionMap
              actions={(snapshot.action_map as any[]) || []}
              systems={categories}
            />
          </div>
        )}

        {snapshot?.rationale && (
          <p className="text-xs text-muted-foreground/70 italic max-w-3xl">
            <Sparkles className="inline h-3 w-3 mr-1 text-primary" />
            {snapshot.rationale}
          </p>
        )}
      </div>
    </div>
  );
}
