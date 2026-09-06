export type BookingStatus =
  | "waiting_call"
  | "no_answer"
  | "not_scheduled"
  | "scheduled"
  | "application_submitted"
  | "collected"
  | "report_pending"
  | "report_ready";

export const bookingStatusLabels: Record<BookingStatus, string> = {
  waiting_call: "Ожидает звонка",
  no_answer: "Не дозвонились",
  not_scheduled: "Не назначен",
  scheduled: "Назначен",
  application_submitted: "Заявка оформлена",
  collected: "Анализ в работе",
  report_pending: "Отчёт в работе",
  report_ready: "Отчёт загружен",
};

export const bookingStatusColors: Record<BookingStatus, string> = {
  waiting_call: "bg-warning-soft text-warning border-warning/30",
  no_answer: "bg-destructive/10 text-destructive border-destructive/30",
  not_scheduled: "bg-muted text-muted-foreground border-border",
  scheduled: "bg-info-soft text-info border-info/30",
  application_submitted: "bg-primary/10 text-primary border-primary/25",
  collected: "bg-success-soft text-success border-success/30",
  report_pending: "bg-accent/15 text-accent-foreground border-accent/30",
  report_ready: "bg-success text-success-foreground border-success",
};

/** Порядок статусов в селектах/меню (без not_scheduled — служебный). */
export const bookingStatusOrder: BookingStatus[] = [
  "waiting_call",
  "no_answer",
  "scheduled",
  "application_submitted",
  "collected",
  "report_pending",
  "report_ready",
];

/** Ключ шаблона (SMS/Email/Telegram) для данного статуса. */
export const bookingStatusTemplateKey: Partial<Record<BookingStatus, string>> = {
  waiting_call: "booking_waiting_call",
  scheduled: "booking_scheduled",
  application_submitted: "booking_application_submitted",
  collected: "booking_collected",
  report_pending: "booking_report_pending",
  report_ready: "booking_report_ready",
};

export function getBookingStatusLabel(status: string): string {
  return bookingStatusLabels[status as BookingStatus] ?? status;
}
