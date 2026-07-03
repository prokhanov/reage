import type { ProkhanovReport } from "../types";
import { calcAge, formatRuDate } from "../parser";
import logoLight from "@/assets/reage-logo-light.png";

interface Props {
  report: ProkhanovReport;
}

/**
 * Обложка отчёта. Значения из данных пациента размечены как
 * `<span data-var="...">value</span>`, чтобы редактор обложки мог:
 *  - подсвечивать их как переменные,
 *  - показывать хинт с именем переменной,
 *  - вставлять новые переменные в текст через палитру.
 *
 * Синтаксис в тексте: {{patientName}}, {{age}}, {{date}}, {{bioAge}},
 * {{healthIndex}}, {{issueNumber}}.
 */
export function ReportCover({ report }: Props) {
  const { patient, analysis } = report;
  const age = calcAge(patient.birth_date, analysis.date);
  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const V = (name: string, value: string) => (
    <span data-var={name} title={`Переменная: {{${name}}}`}>{value}</span>
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
            Личный отчёт о состоянии здоровья
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
          Индивидуальный анализ
        </div>
        <h1 className="rl-cover-title" data-cover-el="title">
          {V("patientName", fullName)}
          <br />
          <em>биологический профиль</em>
        </h1>
      </div>

      <div className="rl-cover-meta">
        <div className="rl-cover-meta-item" data-cover-el="meta-name">
          <div className="label">Пациент</div>
          <div className="value">{V("patientName", fullName)}</div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-age">
          <div className="label">Возраст</div>
          <div className="value">
            {V("age", age ? `${age} лет` : "—")}
          </div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-bioage">
          <div className="label">Био-возраст</div>
          <div className="value">
            {V(
              "bioAge",
              analysis.biological_age !== null
                ? `${analysis.biological_age.toFixed(1)}`
                : "—",
            )}
          </div>
        </div>
        <div className="rl-cover-meta-item" data-cover-el="meta-hi">
          <div className="label">Индекс здоровья</div>
          <div className="value">
            {V(
              "healthIndex",
              analysis.health_index !== null ? `${analysis.health_index}` : "—",
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
