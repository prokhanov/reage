/**
 * /example-report
 *
 * Публичная страница-пример отчёта. Открывается поверх лендинга как полноэкранный
 * Dialog (95vw × 90vh). Имеет собственный URL, при закрытии возвращает на "/".
 *
 * Источник данных — статичный снимок (src/data/exampleReport.json), сделанный из
 * реального обработанного отчёта пациентки с заменой имени на «Елена».
 * Никаких сетевых запросов / Supabase — отчёт не зависит от состояния БД.
 *
 * UI 1:1 повторяет ViewDialog в src/pages/Recommendations.tsx:
 * слева — мини-сайдбар с навигацией по секциям, справа — контент со скроллом.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/MarkdownContent";
import { cleanMarkdownArtifacts } from "@/lib/markdown";
import { getBiomarkerStatus } from "@/lib/biomarkerNorms";
import { renderInterleavedWeb } from "@/lib/anchorRenderer";
import { parseReportSnapshot, type ReportSnapshot } from "@/lib/reportSnapshot";
import { renderSnapshotWeb } from "@/lib/snapshotRenderer";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";
import { AdvisorySections } from "@/components/prescriptions/AdvisorySections";
import type { PdfBiomarkerData } from "@/lib/pdfExportHelpers";

import exampleReportData from "@/data/exampleReport.json";

// ────────────────────────────────────────────────────────────────────────────────
// Helpers (slug + section grouping — копия из Recommendations.tsx, чтобы не
// тащить туда новую логику и не ломать существующий экран).
// ────────────────────────────────────────────────────────────────────────────────

const toSlug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

interface ExampleRecommendation {
  id: string;
  type: string;
  text: string;
  content_json?: any;
  created_at: string;
  analysis_id?: string | null;
}

interface ExampleAnalysisValue {
  id: string;
  value: number;
  unit_override: string | null;
  biomarker: any;
}

interface ExamplePrescription {
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

interface ExampleSnapshot {
  analysis: { id: string; date: string; status: string } | null;
  profile: {
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: string;
  } | null;
  recommendations: ExampleRecommendation[];
  analysis_values: ExampleAnalysisValue[];
  prescriptions: ExamplePrescription[];
}

const data = exampleReportData as unknown as ExampleSnapshot;

const groupByType = (recs: ExampleRecommendation[]) =>
  recs.reduce<Record<string, ExampleRecommendation[]>>((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec);
    return acc;
  }, {});

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────

export default function ExampleReport() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // SEO
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Пример персонального отчёта ReAge | Елена";
    let meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content") ?? null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "Полный пример персонального отчёта ReAge: биомаркеры, разбор по системам и индивидуальные назначения.",
    );
    return () => {
      document.title = prevTitle;
      if (prevDesc != null) meta?.setAttribute("content", prevDesc);
    };
  }, []);

  // Закрытие — возврат на лендинг.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Небольшая задержка, чтобы Radix успел сыграть анимацию выхода.
      setTimeout(() => navigate("/"), 150);
    }
  };

  // Возраст / пол пациентки берём из снимка.
  const { age, gender } = useMemo(() => {
    const g: "male" | "female" = data.profile?.gender === "female" ? "female" : "male";
    let a = 40;
    if (data.profile?.birth_date) {
      const birth = new Date(data.profile.birth_date);
      a = Math.floor(
        (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );
    }
    return { age: a, gender: g };
  }, []);

  // Готовим webBiomarkers — структура та же, что и в Recommendations.tsx.
  const webBiomarkers = useMemo<PdfBiomarkerData[]>(() => {
    return (data.analysis_values || []).map((v) => {
      const b = v.biomarker;
      const statusInfo = getBiomarkerStatus(v.value, b, age, gender);
      const optMin =
        gender === "female" ? b.optimal_min_female ?? b.optimal_min : b.optimal_min_male ?? b.optimal_min;
      const optMax =
        gender === "female" ? b.optimal_max_female ?? b.optimal_max : b.optimal_max_male ?? b.optimal_max;
      const normMin =
        gender === "female" ? b.normal_min_female ?? b.normal_min : b.normal_min_male ?? b.normal_min;
      const normMax =
        gender === "female" ? b.normal_max_female ?? b.normal_max : b.normal_max_male ?? b.normal_max;
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
  const prescriptionsRec = grouped["Назначения"]?.[0];

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
      type !== "Назначения",
  );

  const snapshotResult = summary?.content_json
    ? parseReportSnapshot(summary.content_json)
    : null;
  const snapshot: ReportSnapshot | null =
    snapshotResult && snapshotResult.ok ? snapshotResult.snapshot : null;

  const sections = [
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
      ? [{ id: "prescriptions", label: "Назначения" }]
      : []),
  ];

  const scrollToSection = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = document.getElementById(`section-${sectionId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reportDate = data.analysis?.date
    ? new Date(data.analysis.date)
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[90vh] w-[95vw] max-w-7xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Пример персонального отчёта</DialogTitle>
          <DialogDescription>
            Демонстрационный отчёт пациентки Елены — полная копия интерфейса
            личного кабинета.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full min-h-0">
          {/* Mini Sidebar */}
          <div className="w-64 border-r border-border bg-muted/30 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden">
            <div className="p-6 border-b border-border flex-shrink-0">
              <h3 className="font-semibold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Содержание
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {reportDate && !isNaN(reportDate.getTime())
                  ? format(reportDate, "d MMMM yyyy", { locale: ru })
                  : "Пример отчёта"}
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={(e) => scrollToSection(section.id, e)}
                    className="w-full text-left px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 group hover:bg-accent text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-sm font-medium flex-1 line-clamp-2">
                      {section.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
            <div className="px-8 py-6 border-b border-border bg-gradient-to-r from-background to-muted/20 flex-shrink-0 flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Пример персонального отчёта
                </DialogTitle>
                <DialogDescription className="mt-2">
                  Демонстрация: Елена •{" "}
                  {(data.recommendations || []).length}{" "}
                  {(data.recommendations || []).length === 1
                    ? "раздел"
                    : "разделов"}
                </DialogDescription>
              </div>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto px-8 py-6"
              ref={contentRef}
            >
              <div id="report-content" className="space-y-12 max-w-4xl">
                {patientData && (
                  <div id="section-patient-data" className="scroll-mt-6">
                    <div className="prose prose-sm max-w-none">
                      <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/10 shadow-sm">
                        <MarkdownContent
                          content={cleanMarkdownArtifacts(patientData.text)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {snapshot ? (
                  <div
                    id="snapshot-root"
                    className="prose prose-sm max-w-none"
                  >
                    {renderSnapshotWeb(snapshot, webBiomarkers, age, gender)}
                  </div>
                ) : (
                  <>
                    {summary && (
                      <div id="section-summary" className="scroll-mt-6">
                        <div className="prose prose-sm max-w-none">
                          <div className="p-6 bg-gradient-to-br from-accent/5 to-primary/5 rounded-xl border border-accent/10 shadow-sm">
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
                          <div className="mb-6">
                            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                              {type}
                            </h2>
                            <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                          </div>
                          {recs.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
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
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                        Назначения
                      </h2>
                      <div className="h-1 w-20 bg-gradient-primary rounded-full" />
                    </div>

                    {(data.prescriptions || []).length > 0 && (
                      <section className="space-y-4 mb-8">
                        <h3 className="text-xl font-semibold text-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
