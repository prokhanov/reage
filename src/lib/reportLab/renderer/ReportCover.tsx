import type { ProkhanovReport } from "../types";
import { calcAge, formatRuDate } from "../parser";
import { useReportEditor } from "../editor/ReportEditorContext";
import logoLight from "@/assets/reage-logo-light.png";

interface Props {
  report: ProkhanovReport;
}

function formatRuMonthYear(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("ru-RU", { month: "long" });
  return `${month[0].toUpperCase()}${month.slice(1)} ${d.getFullYear()}`;
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
            style={{ width: "28mm", height: "auto", display: "block" }}
          />
        </div>
        <div style={{ textAlign: "right" }}>
          <div data-cover-el="confidential" style={{ fontWeight: 500, color: "var(--gold-soft)" }}>
            КОНФИДЕНЦИАЛЬНО
          </div>
          <div style={{ marginTop: "2mm" }} data-cover-el="issue">
            Выпуск №{V("issueNumber", shortId(analysis.id))}
          </div>
        </div>
      </div>

      <div className="rl-cover-center">
        <div className="rl-cover-kicker" data-cover-el="kicker">
          {V("date", formatRuMonthYear(analysis.date))}
        </div>
        <h1 className="rl-cover-headline" data-cover-el="headline">
          ЛИЧНЫЙ ОТЧЁТ<br />О СОСТОЯНИИ ЗДОРОВЬЯ
        </h1>
        <h1 className="rl-cover-title" data-cover-el="title-name">
          {V("patientName", fullName)}
        </h1>
        <p className="rl-cover-subtitle" data-cover-el="subtitle">
          Полная оценка состояния организма и рекомендации по улучшению здоровья.
        </p>
      </div>

      <div className="rl-cover-meta">
        <div className="rl-cover-meta-item" data-cover-el="meta-biomarkers">
          <div className="value">104</div>
          <div className="label">биомаркера</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-bioage">
          <div className="value">
            {V(
              "bioAge",
              analysis.biological_age !== null
                ? `${analysis.biological_age.toFixed(1)}`
                : "—",
            )}
          </div>
          <div className="label">Биологический возраст</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-hi">
          <div className="value">
            {V(
              "healthIndex",
              analysis.health_index !== null ? `${analysis.health_index}` : "—",
            )}
          </div>
          <div className="label">Индекс здоровья</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-plan">
          <div className="value">План</div>
          <div className="label">действий</div>
        </div>
      </div>
    </div>
  );
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
