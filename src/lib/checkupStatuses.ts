/** Статусы разовых чекапов — ровно 4 шага. */
export type CheckupStatus = "paid" | "application_submitted" | "collected" | "report_ready";

export const CHECKUP_STATUSES: { value: CheckupStatus; label: string }[] = [
  { value: "paid", label: "Оплачен" },
  { value: "application_submitted", label: "Заявка в лаборатории" },
  { value: "collected", label: "Анализы сданы" },
  { value: "report_ready", label: "Результаты готовы" },
];

export const checkupStatusLabels = Object.fromEntries(
  CHECKUP_STATUSES.map((item) => [item.value, item.label]),
) as Record<CheckupStatus, string>;

/** Старые статусы (до упрощения) → новые значения. */
export const legacyCheckupStatus: Record<string, CheckupStatus> = {
  waiting_call: "paid",
  no_answer: "paid",
  not_scheduled: "paid",
  scheduled: "paid",
  report_pending: "collected",
};

export function normalizeCheckupStatus(status: string): CheckupStatus {
  if (status in checkupStatusLabels) return status as CheckupStatus;
  return legacyCheckupStatus[status] ?? "paid";
}
