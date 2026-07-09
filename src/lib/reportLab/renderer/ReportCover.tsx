import type { CSSProperties } from "react";
import type { CoverOverrides, LabReport } from "../types";
import { formatRuDate } from "../parser";
import { useReportEditor } from "../editor/ReportEditorContext";
import logoLight from "@/assets/reage-logo-light.png";

interface Props {
  report: LabReport;
}

/**
 * Обложка отчёта. В режиме просмотра переменные подставляются реальными
 * значениями пациента, в режиме редактирования показываются как `{{var}}`
 * чипы-подсказки — их можно двигать/форматировать в редакторе.
 *
 * Доступные переменные: patientName, age, date, bioAge, healthIndex.
 *
 * Дефолтный шаблон (лого, «Конфиденциально», ФИО, «Отчёт о состоянии здоровья»,
 * 4 плитки, врач) захардкожен здесь. Пользовательские правки хранятся в
 * `report.coverOverrides` (JSON в `analyses.cover_overrides`) и накладываются
 * поверх дефолта — если overrides нет, старые отчёты рендерятся как раньше.
 */
export function ReportCover({ report }: Props) {
  const ctx = useReportEditor();
  const isEdit = ctx?.mode === "edit";
  const { patient, analysis } = report;
  // В edit-режиме показываем текущие drafts (из ctx), в view — snapshot из БД.
  const overrides: CoverOverrides | null =
    (isEdit ? ctx?.coverOverrides : null) ?? report.coverOverrides ?? null;
  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const V = (name: string, value: string) =>
    isEdit ? (
      <span data-var={name} title={`Переменная: {{${name}}}`}>{`{{${name}}}`}</span>
    ) : (
      <span data-var={name}>{value}</span>
    );

  // ─── Overrides ─────────────────────────────────────────────────────────
  const rootStyle: CSSProperties = {};
  const bg = overrides?.background;
  if (bg) {
    if (bg.mode === "solid" && bg.solid) {
      rootStyle.background = bg.solid;
    } else if (bg.mode === "gradient" && bg.c1 && bg.c2 && bg.c3) {
      rootStyle.background = `linear-gradient(${bg.angle ?? 160}deg, ${bg.c1} 0%, ${bg.c2} 55%, ${bg.c3} 100%)`;
    }
  }

  const elStyle = (key: string): CSSProperties => {
    const el = overrides?.elements?.[key];
    if (!el) return {};
    const s: CSSProperties = {};
    if (el.transform) s.transform = el.transform;
    if (el.fontSize) s.fontSize = el.fontSize;
    if (el.color) s.color = el.color;
    if (el.textAlign) s.textAlign = el.textAlign as CSSProperties["textAlign"];
    if (el.fontWeight) s.fontWeight = el.fontWeight as CSSProperties["fontWeight"];
    if (el.fontStyle) s.fontStyle = el.fontStyle as CSSProperties["fontStyle"];
    return s;
  };

  /** Обёртка: если у элемента есть html-override — рендерим его вместо children. */
  const elHtml = (key: string): { __html: string } | null => {
    const html = overrides?.elements?.[key]?.html;
    return html ? { __html: html } : null;
  };

  const renderEl = (
    key: string,
    className: string | undefined,
    extraStyle: CSSProperties,
    tag: "div" | "h1",
    defaultChildren: React.ReactNode,
  ) => {
    const style = { ...extraStyle, ...elStyle(key) };
    const html = elHtml(key);
    const commonProps = {
      className,
      "data-cover-el": key,
      style,
    } as const;
    if (html) {
      return tag === "h1" ? (
        <h1 {...commonProps} dangerouslySetInnerHTML={html} />
      ) : (
        <div {...commonProps} dangerouslySetInnerHTML={html} />
      );
    }
    return tag === "h1" ? (
      <h1 {...commonProps}>{defaultChildren}</h1>
    ) : (
      <div {...commonProps}>{defaultChildren}</div>
    );
  };

  return (
    <div className="rl-page rl-cover" data-cover-root="1" style={rootStyle}>
      <div className="rl-cover-top">
        <div>
          <img
            src={logoLight}
            alt="ReAge"
            data-cover-el="logo"
            style={{ width: "34mm", height: "auto", display: "block", ...elStyle("logo") }}
          />
          {renderEl("tagline", undefined, { marginTop: "3mm" }, "div", "Конфиденциально")}
        </div>
        <div style={{ textAlign: "right" }}>
          {renderEl(
            "date",
            undefined,
            { marginTop: "2mm" },
            "div",
            V("date", formatRuDate(analysis.date)),
          )}
        </div>
      </div>

      <div className="rl-cover-center">
        {renderEl(
          "eyebrow",
          "rl-cover-eyebrow",
          {},
          "div",
          "Полная оценка состояния организма",
        )}
        {renderEl("title-name", "rl-cover-title", {}, "h1", V("patientName", fullName))}
        {renderEl(
          "title-subtitle",
          "rl-cover-title",
          { margin: 0 },
          "h1",
          <em>Отчёт о состоянии здоровья</em>,
        )}
      </div>

      <div className="rl-cover-meta">
        {renderEl(
          "meta-report",
          "rl-cover-meta-item",
          {},
          "div",
          <>
            <div className="label">Отчёт</div>
            <div className="value">1/4</div>
          </>,
        )}
        {renderEl(
          "meta-biomarkers",
          "rl-cover-meta-item",
          {},
          "div",
          <>
            <div className="label">Биомаркеров</div>
            <div className="value">{report.biomarkers?.length ?? 0}</div>
          </>,
        )}

        {renderEl(
          "meta-systems",
          "rl-cover-meta-item",
          {},
          "div",
          <>
            <div className="label">Систем организма</div>
            <div className="value">5</div>
          </>,
        )}
        {renderEl(
          "meta-doctor",
          "rl-cover-meta-item",
          {},
          "div",
          <>
            <div className="label">Врач</div>
            <div className="value">Наталья Чезганова</div>
          </>,
        )}
      </div>
    </div>
  );
}
