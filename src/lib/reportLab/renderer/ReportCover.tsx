import type { ProkhanovReport } from "../types";
import { calcAge, formatRuDate } from "../parser";

interface Props {
  report: ProkhanovReport;
}

export function ReportCover({ report }: Props) {
  const { patient, analysis } = report;
  const age = calcAge(patient.birth_date, analysis.date);
  const fullName = [patient.first_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rl-page rl-cover">
      <div className="rl-cover-top">
        <div>
          <div className="rl-cover-brand">ReAge</div>
          <div style={{ marginTop: "3mm" }}>Личный отчёт о состоянии здоровья</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Выпуск №{shortId(analysis.id)}</div>
          <div style={{ marginTop: "2mm" }}>{formatRuDate(analysis.date)}</div>
        </div>
      </div>

      <div className="rl-cover-center">
        <div className="rl-cover-eyebrow">Индивидуальный анализ</div>
        <h1 className="rl-cover-title">
          {fullName}
          <br />
          <em>биологический профиль</em>
        </h1>
        <p className="rl-cover-subtitle">
          Всеобъемлющий разбор {report.biomarkers.length} биомаркеров по пяти
          ключевым системам организма. Составлен клинической командой ReAge на
          основе лабораторных данных от {formatRuDate(analysis.date)}.
        </p>
      </div>

      <div className="rl-cover-meta">
        <div className="rl-cover-meta-item">
          <div className="label">Пациент</div>
          <div className="value">{fullName}</div>
        </div>
        <div className="rl-cover-meta-item">
          <div className="label">Возраст</div>
          <div className="value">{age ? `${age} лет` : "—"}</div>
        </div>
        <div className="rl-cover-meta-item">
          <div className="label">Био-возраст</div>
          <div className="value">
            {analysis.biological_age !== null
              ? `${analysis.biological_age.toFixed(1)}`
              : "—"}
          </div>
        </div>
        <div className="rl-cover-meta-item">
          <div className="label">Индекс здоровья</div>
          <div className="value">
            {analysis.health_index !== null ? `${analysis.health_index}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}
