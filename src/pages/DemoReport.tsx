/**
 * /demo-report
 *
 * Полностраничная демо-версия персонального отчёта Елены Ивановой.
 * В отличие от /example-report (Dialog поверх лендинга), это самостоятельная
 * страница — открывается на отдельном URL и не привязана к лендингу.
 *
 * Страница закрыта от индексации (noindex,nofollow).
 *
 * ВАЖНО: при добавлении/переименовании роута обнови whitelist в
 * deploy/nginx/default.conf, иначе прямое открытие URL вернёт 404.
 */

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { List, ArrowLeft } from "lucide-react";

import { useActiveSection } from "@/hooks/useActiveSection";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/MarkdownContent";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { renderInterleavedWeb } from "@/lib/anchorRenderer";
import { parseReportSnapshot, type ReportSnapshot } from "@/lib/reportSnapshot";
import { renderSnapshotWeb } from "@/lib/snapshotRenderer";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";
import { AdvisorySections } from "@/components/prescriptions/AdvisorySections";
import type { PdfBiomarkerData } from "@/lib/pdfExportHelpers";
import { cn } from "@/lib/utils";

import exampleReportData from "@/data/exampleReport.json";

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

interface DemoRecommendation {
  id: string;
  type: string;
  text: string;
  content_json?: any;
  created_at: string;
  analysis_id?: string | null;
}

interface DemoAnalysisValue {
  id: string;
  value: number;
  unit_override: string | null;
  biomarker: any;
}

interface DemoPrescription {
  id: string;
  prescription: string;
  name?: string | null;
  form?: string | null;
  dosage?: string | null;
  how_to_take?: string | null;
  duration?: string | null;
  reason: string | null;
  effect: string;
  control_date: string;
  status: "on_review" | "confirmed";
  category?: string | null;
}

interface DemoSnapshot {
  analysis: { id: string; date: string; status: string } | null;
  profile: {
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: string;
  } | null;
  recommendations: DemoRecommendation[];
  analysis_values: DemoAnalysisValue[];
  prescriptions: DemoPrescription[];
}

const data = exampleReportData as unknown as DemoSnapshot;

const groupByType = (recs: DemoRecommendation[]) =>
  recs.reduce<Record<string, DemoRecommendation[]>>((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec);
    return acc;
  }, {});

export default function DemoReport() {
  const [tocSheetOpen, setTocSheetOpen] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);

  const { age, gender, patientName } = useMemo(() => {
    const g: "male" | "female" =
      data.profile?.gender === "female" ? "female" : "male";
    let a = 40;
    if (data.profile?.birth_date) {
      const birth = new Date(data.profile.birth_date);
      a = Math.floor(
        (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
    }
    const name = [data.profile?.first_name, data.profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Елена Иванова";
    return { age: a, gender: g, patientName: name };
  }, []);

  const webBiomarkers = useMemo<PdfBiomarkerData[]>(() => {
    return (data.analysis_values || []).map((v) => {
      const b = v.biomarker;
      const statusInfo = getBiomarkerStatus(v.value, b, age, gender);
      const optMin =
        gender === "female"
          ? b.optimal_min_female ?? b.optimal_min
          : b.optimal_min_male ?? b.optimal_min;
      const optMax =
        gender === "female"
          ? b.optimal_max_female ?? b.optimal_max
          : b.optimal_max_male ?? b.optimal_max;
      const normMin =
        gender === "female"
          ? b.normal_min_female ?? b.normal_min
          : b.normal_min_male ?? b.normal_min;
      const normMax =
        gender === "female"
          ? b.normal_max_female ?? b.normal_max
          : b.normal_max_male ?? b.normal_max;
      const rangeDisplay =
        optMin != null && optMax != null
          ? `${optMin}–${optMax}`
          : normMin != null && normMax != null
            ? `${normMin}–${normMax}`
            : "";
      return {
        id: b.id,
        name: b.name,
        code: b.code,
        value: v.value,
        unit: v.unit_override || b.unit,
        category: b.category,
        biomarker: b,
        status: statusInfo.status,
        statusLabel: statusInfo.label,
        rangeDisplay,
      } as PdfBiomarkerData;
    });
  }, [age, gender]);

  const grouped = useMemo(() => groupByType(data.recommendations || []), []);
  const patientData = grouped["Данные пациента"]?.[0];
  const summary = grouped["Общее резюме"]?.[0];
  const prescriptionsRec = grouped["Рекомендации"]?.[0];

  const lifestyleData = prescriptionsRec?.content_json?.lifestyle as
    | { nutrition?: string[]; activity?: string[]; sleep?: string[] }
    | undefined;
  const followUpsData = prescriptionsRec?.content_json?.follow_ups as
    | Array<{ specialist?: string; goal?: string; trigger?: string }>
    | undefined;

  const hasLifestyle =
    !!lifestyleData &&
    (lifestyleData.nutrition?.length || 0) +
      (lifestyleData.activity?.length || 0) +
      (lifestyleData.sleep?.length || 0) >
      0;
  const hasFollowUps = !!followUpsData && followUpsData.length > 0;
  const hasPrescriptionsBlock =
    (data.prescriptions || []).length > 0 || hasLifestyle || hasFollowUps;

  const categories = Object.entries(grouped).filter(
    ([type]) =>
      type !== "Общее резюме" &&
      type !== "Данные пациента" &&
      type !== "Рекомендации",
  );

  const snapshotResult = summary?.content_json
    ? parseReportSnapshot(summary.content_json)
    : null;
  const snapshot: ReportSnapshot | null =
    snapshotResult && snapshotResult.ok ? snapshotResult.snapshot : null;

  const sections = useMemo(
    () => [
      ...(patientData ? [{ id: "patient-data", label: "Данные пациента" }] : []),
      ...(snapshot
        ? snapshot.blocks
            .map((b, i) =>
              b.type === "section"
                ? { id: `snapshot-section-${i}`, label: b.title }
                : null,
            )
            .filter((s): s is { id: string; label: string } => s !== null)
        : [
            ...(summary ? [{ id: "summary", label: "Общее резюме" }] : []),
            ...categories.map(([type]) => ({ id: toSlug(type), label: type })),
          ]),
      ...(hasPrescriptionsBlock
        ? [{ id: "prescriptions", label: "Рекомендации" }]
        : []),
    ],
    [patientData, snapshot, summary, categories, hasPrescriptionsBlock],
  );

  const activeSection = useActiveSection(
    contentEl,
    sections.map((s) => s.id),
    { offset: 140 },
  );

  const scrollToSection = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = document.getElementById(`section-${sectionId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reportDate = data.analysis?.date ? new Date(data.analysis.date) : null;
  const dateLabel =
    reportDate && !isNaN(reportDate.getTime())
      ? format(reportDate, "d MMMM yyyy", { locale: ru })
      : "Демо-отчёт";

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Демо-отчёт ReAge — {patientName}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="description"
          content="Демонстрационный персональный отчёт ReAge пациентки Елены Ивановой."
        />
      </Helmet>

      <div className="fixed inset-0 flex h-[100dvh] w-full min-w-0 min-h-0 flex-col md:flex-row bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-64 border-r border-border bg-muted/30 backdrop-blur-sm flex-col min-h-0 overflow-hidden">
          <div className="p-6 border-b border-border flex-shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-3 w-3" />
              На главную
            </Link>
            <h3 className="font-semibold text-lg bg-gradient-primary bg-clip-text text-transparent">
              Содержание
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{dateLabel}</p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
            <nav className="space-y-1">
              {sections.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={(e) => scrollToSection(section.id, e)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center",
                      isActive
                        ? "bg-accent text-foreground font-medium"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="text-sm font-medium flex-1 line-clamp-2">
                      {section.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <header className="relative px-4 sm:px-8 py-3 sm:py-6 border-b border-border bg-gradient-to-r from-background to-muted/20 flex-shrink-0 flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Mobile TOC trigger */}
              <Sheet open={tocSheetOpen} onOpenChange={setTocSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden h-9 w-9 rounded-xl flex-shrink-0"
                    aria-label="Содержание"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
                  <SheetHeader className="p-5 border-b border-border">
                    <SheetTitle className="bg-gradient-primary bg-clip-text text-transparent text-left">
                      Содержание
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground text-left">
                      {dateLabel}
                    </p>
                  </SheetHeader>
                  <div
                    className="overflow-y-auto px-3 py-4"
                    style={{ maxHeight: "calc(100dvh - 110px)" }}
                  >
                    <nav className="space-y-1">
                      {sections.map((section) => {
                        const isActive = activeSection === section.id;
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={(e) => {
                              scrollToSection(section.id, e);
                              setTocSheetOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center",
                              isActive
                                ? "bg-accent text-foreground font-medium"
                                : "hover:bg-accent text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <span className="text-sm font-medium flex-1 line-clamp-2">
                              {section.label}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                  <span className="md:hidden">{dateLabel}</span>
                  <span className="hidden md:inline">
                    Демо-отчёт — {patientName}
                  </span>
                </h1>
                <p className="mt-1 sm:mt-2 hidden sm:block text-sm text-muted-foreground">
                  Демонстрационный персональный отчёт •{" "}
                  {(data.recommendations || []).length}{" "}
                  {(data.recommendations || []).length === 1
                    ? "раздел"
                    : "разделов"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/">На главную</Link>
              </Button>
            </div>
          </header>

          <div
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-4 sm:py-6"
            ref={setContentEl}
          >
            <div
              id="report-content"
              className="space-y-5 sm:space-y-12 max-w-full md:max-w-4xl break-words [&_*]:max-w-full [&_table]:block [&_table]:overflow-x-auto [&_pre]:overflow-x-auto"
            >
              {patientData && (
                <div id="section-patient-data" className="scroll-mt-6">
                  <div className="prose prose-sm max-w-none">
                    <div className="sm:p-6 sm:bg-gradient-to-br sm:from-primary/5 sm:to-accent/5 sm:rounded-xl sm:border sm:border-primary/10 sm:shadow-sm">
                      <MarkdownContent
                        content={cleanMarkdownArtifacts(patientData.text)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {snapshot ? (
                <div id="snapshot-root" className="prose prose-sm max-w-none">
                  {renderSnapshotWeb(snapshot, webBiomarkers, age, gender)}
                </div>
              ) : (
                <>
                  {summary && (
                    <div id="section-summary" className="scroll-mt-6">
                      <div className="prose prose-sm max-w-none">
                        <div className="sm:p-6 sm:bg-gradient-to-br sm:from-accent/5 sm:to-primary/5 sm:rounded-xl sm:border sm:border-accent/10 sm:shadow-sm">
                          <MarkdownContent
                            content={cleanMarkdownArtifacts(summary.text)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {categories.map(([type, recs]) => (
                    <div
                      key={type}
                      id={`section-${toSlug(type)}`}
                      className="scroll-mt-6"
                    >
                      <div className="space-y-4">
                        <div className="mb-4 sm:mb-6">
                          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                            {type}
                          </h2>
                          <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                        </div>
                        {recs.map((rec) => (
                          <div
                            key={rec.id}
                            className="sm:p-6 sm:bg-card/50 sm:backdrop-blur-sm sm:rounded-xl sm:border sm:border-border sm:shadow-sm sm:hover:shadow-md sm:transition-shadow"
                          >
                            {renderInterleavedWeb(
                              rec.text,
                              webBiomarkers.filter((b) => b.category === type),
                              age,
                              gender,
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {hasPrescriptionsBlock && (
                <div id="section-prescriptions" className="scroll-mt-6">
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                      Рекомендации
                    </h2>
                    <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                  </div>

                  {(data.prescriptions || []).length > 0 && (
                    <section className="space-y-4 mb-6 sm:mb-8">
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                        Нутрицевтики ({data.prescriptions.length})
                      </h3>
                      <div className="space-y-4">
                        {data.prescriptions.map((p, idx) => (
                          <PrescriptionCard
                            key={p.id}
                            prescription={p as any}
                            index={idx}
                            showStatus={false}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  <AdvisorySections
                    lifestyle={lifestyleData}
                    followUps={followUpsData}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
