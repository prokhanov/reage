import type { ProkhanovReport } from "../types";
import { calcAge, formatRuDate } from "../parser";
import { useReportEditor } from "../editor/ReportEditorContext";
import logoLight from "@/assets/reage-logo-light.png";

interface Props {
  report: ProkhanovReport;
}

/**
 * Обложка отчёта. В режиме просмотра переменные подставляются реальными
 * значениями пациента, в режиме редактирования показываются как `{{var}}`
 * чипы-подсказки — их можно двигать/форматировать в редакторе.
 *
 * Доступные переменные: patientName, age, date, bioAge, healthIndex,
 * issueNumber.
 */
export function ReportCover({ report }: Props) {
  const ctx = useReportEditor();
  const isEdit = ctx?.mode === "edit";
  const { patient, analysis } = report;
  const age = calcAge(patient.birth_date, analysis.date);
  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const V = (name: string, value: string) =>
    isEdit ? (
      <span data-var={name} title={`Переменная: {{${name}}}`}>{`{{${name}}}`}</span>
    ) : (
      <span data-var={name}>{value}</span>
    );


  return (
    <div className="rl-page rl-cover" data-cover-root="1">
      <div className="rl-cover-top">
        <div>
          <img
            src={logoLight}
            alt="ReAge"
            data-cover-el="logo"
            style={{ width: "34mm", height: "auto", display: "block" }}
          />
          <div style={{ marginTop: "3mm" }} data-cover-el="tagline">
            Конфиденциально
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div data-cover-el="issue">
            Выпуск №{V("issueNumber", shortId(analysis.id))}
          </div>
          <div style={{ marginTop: "2mm" }} data-cover-el="date">
            {V("date", formatRuDate(analysis.date))}
          </div>
        </div>
      </div>

      <div className="rl-cover-center">
        <div className="rl-cover-eyebrow" data-cover-el="eyebrow">
          Полная оценка состояния организма
        </div>
        <h1 className="rl-cover-title" data-cover-el="title-name">
          {V("patientName", fullName)}
        </h1>
        <h1
          className="rl-cover-title"
          data-cover-el="title-subtitle"
          style={{ margin: 0 }}
        >
          <em>ЛИЧНЫЙ ОТЧЁТ О СОСТОЯНИИ ЗДОРОВЬЯ</em>
        </h1>

      </div>

      <div className="rl-cover-meta">
        <div className="rl-cover-meta-item" data-cover-el="meta-report">
          <div className="label">Отчёт</div>
          <div className="value">1/4</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-biomarkers">
          <div className="label">Биомаркеров</div>
          <div className="value">104</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-systems">
          <div className="label">Систем организма</div>
          <div className="value">5</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-doctor">
          <div className="label">Врач</div>
          <div className="value">Наталья Чезганова</div>
        </div>
      </div>
    </div>
  );
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
