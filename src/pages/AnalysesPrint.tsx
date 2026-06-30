import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { BiomarkerScale } from "@/components/BiomarkerScale";
import { BiomarkerStatusBadge } from "@/components/BiomarkerStatusBadge";
import {
  calculateAge,
  formatNormalRange,
  getBiomarkerStatus,
  getNormalRangeForAge,
  type AgeRanges,
} from "@/lib/biomarkerNorms";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  gender: string | null;
}

interface Analysis {
  id: string;
  date: string;
  lab_name: string | null;
  health_index: number | null;
  biological_age: number | null;
}

interface Biomarker {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  category: string | null;
  normal_min: number | null;
  normal_max: number | null;
  normal_min_male: number | null;
  normal_max_male: number | null;
  normal_min_female: number | null;
  normal_max_female: number | null;
  age_ranges?: AgeRanges | null;
}

interface AnalysisValue {
  id: string;
  analysis_id: string;
  value: number;
  biomarkers: Biomarker;
}

export default function AnalysesPrint() {
  const [params] = useSearchParams();
  const uidParam = params.get("uid");
  const auto = params.get("auto") !== "0"; // авто-открытие диалога печати

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [valuesByAnalysis, setValuesByAnalysis] = useState<Record<string, AnalysisValue[]>>({});

  useEffect(() => {
    (async () => {
      try {
        let userId = uidParam;
        if (!userId) {
          const { data: auth } = await supabase.auth.getUser();
          userId = auth.user?.id || null;
        }
        if (!userId) throw new Error("Не авторизован");

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, birth_date, gender")
          .eq("id", userId)
          .maybeSingle();
        if (profErr) throw profErr;
        setProfile(prof as Profile);

        const { data: analysesData, error: aErr } = await supabase
          .from("analyses")
          .select("id, date, lab_name, health_index, biological_age")
          .eq("user_id", userId);
        if (aErr) throw aErr;

        const sorted = (analysesData || []).sort(
          (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ) as Analysis[];
        setAnalyses(sorted);

        const ids = sorted.map((a) => a.id);
        if (ids.length > 0) {
          const { data: vals, error: vErr } = await supabase
            .from("analysis_values")
            .select("id, analysis_id, value, biomarkers(*)")
            .in("analysis_id", ids);
          if (vErr) throw vErr;
          const grouped: Record<string, AnalysisValue[]> = {};
          (vals || []).forEach((v: any) => {
            if (!v.biomarkers) return;
            (grouped[v.analysis_id] ||= []).push(v as AnalysisValue);
          });
          setValuesByAnalysis(grouped);
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, [uidParam]);

  const patientAge = useMemo(
    () => (profile?.birth_date ? calculateAge(profile.birth_date) : null),
    [profile?.birth_date]
  );
  const patientGender = profile?.gender || null;

  // Авто-печать после загрузки
  useEffect(() => {
    if (!loading && !error && auto && analyses.length > 0) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, error, auto, analyses.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Загружаем анализы…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.history.back()}>Назад</Button>
      </div>
    );
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="print-root min-h-screen bg-background text-foreground">
      {/* Панель действий — скрыта при печати */}
      <div className="no-print sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Назад
          </Button>
          <div className="text-sm text-muted-foreground hidden sm:block">
            Используйте «Сохранить как PDF» в диалоге печати браузера
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> Печать / PDF
          </Button>
        </div>
      </div>

      {/* Контент для печати */}
      <div className="print-page max-w-[210mm] mx-auto px-8 py-8 print:p-0">
        {/* Шапка */}
        <header className="mb-8 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">История анализов</h1>
              <div className="text-sm text-muted-foreground">
                {profile?.full_name || "—"}
                {profile?.birth_date && (
                  <> · ДР: {new Date(profile.birth_date).toLocaleDateString("ru-RU")}</>
                )}
                {patientAge !== null && <> · {patientAge} лет</>}
                {patientGender && (
                  <> · {patientGender === "female" ? "женский" : "мужской"}</>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>ReAge</div>
              <div>Выгружено: {new Date().toLocaleDateString("ru-RU")}</div>
              <div>Анализов: {analyses.length}</div>
            </div>
          </div>
        </header>

        {analyses.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">Анализы не найдены.</div>
        )}

        {analyses.map((analysis) => {
          const values = valuesByAnalysis[analysis.id] || [];
          // группировка по категории
          const byCategory: Record<string, AnalysisValue[]> = {};
          values.forEach((v) => {
            const cat = v.biomarkers.category || "Прочее";
            (byCategory[cat] ||= []).push(v);
          });
          const categories = Object.keys(byCategory).sort();

          return (
            <section
              key={analysis.id}
              className="analysis-block mb-8 pb-6 border-b border-border last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-4 mb-4">
                <h2 className="text-lg font-semibold text-primary">
                  Анализ от {formatDate(analysis.date)}
                </h2>
                <div className="text-xs text-muted-foreground text-right">
                  {analysis.lab_name && <div>Лаборатория: {analysis.lab_name}</div>}
                  {analysis.health_index !== null && (
                    <div>Индекс здоровья: <span className="font-medium text-foreground">{analysis.health_index}</span></div>
                  )}
                  {analysis.biological_age !== null && (
                    <div>
                      Био. возраст:{" "}
                      <span className="font-medium text-foreground">
                        {(Math.floor(analysis.biological_age * 10) / 10).toFixed(1)} лет
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {values.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">Биомаркеров нет.</div>
              ) : (
                categories.map((cat) => (
                  <div key={cat} className="category-block mb-5">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {cat}
                    </h3>
                    <div className="space-y-2">
                      {byCategory[cat]
                        .sort((a, b) => a.biomarkers.name.localeCompare(b.biomarkers.name, "ru"))
                        .map((v) => {
                          const statusInfo = getBiomarkerStatus(
                            v.value,
                            v.biomarkers,
                            patientAge,
                            (patientGender as "male" | "female" | null) || null
                          );
                          const normal = getNormalRangeForAge(
                            v.biomarkers,
                            patientAge ?? 40,
                            patientGender === "female" ? "female" : "male"
                          );
                          return (
                            <div
                              key={v.id}
                              className="biomarker-row grid grid-cols-12 gap-3 items-center py-2 px-3 rounded-md border border-border/60 bg-card/40"
                            >
                              <div className="col-span-4">
                                <div className="font-medium text-sm leading-tight">
                                  {v.biomarkers.name}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {v.biomarkers.code}
                                </div>
                              </div>
                              <div className="col-span-2 text-right">
                                <div className="font-mono font-semibold text-sm tabular-nums">
                                  {v.value}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {v.biomarkers.unit || ""}
                                </div>
                              </div>
                              <div className="col-span-2 text-xs text-muted-foreground">
                                Норма:{" "}
                                <span className="font-mono text-foreground">
                                  {formatNormalRange(normal.min, normal.max)}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <BiomarkerStatusBadge statusInfo={statusInfo} />
                              </div>
                              <div className="col-span-2">
                                <BiomarkerScale
                                  biomarker={v.biomarkers}
                                  value={v.value}
                                  age={patientAge}
                                  gender={patientGender}
                                  compact
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))
              )}
            </section>
          );
        })}

        <footer className="text-[10px] text-muted-foreground text-center pt-4 border-t border-border">
          Документ сформирован автоматически сервисом ReAge.
          Не является медицинским заключением.
        </footer>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 12mm; }
          html, body { background: white !important; }
          .no-print { display: none !important; }
          .print-root { background: white !important; color: black !important; }
          .print-page { max-width: none !important; padding: 0 !important; }
          .analysis-block { page-break-inside: auto; break-inside: auto; }
          .category-block { page-break-inside: avoid; break-inside: avoid; }
          .biomarker-row { page-break-inside: avoid; break-inside: avoid; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
