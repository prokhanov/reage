export type BookingStatus =
  | "waiting_call"
  | "no_answer"
  | "not_scheduled"
  | "scheduled"
  | "collected"
  | "report_pending"
  | "report_ready";

export const bookingStatusLabels: Record<BookingStatus, string> = {
  waiting_call: "Ожидает звонка",
  no_answer: "Не дозвонились",
  not_scheduled: "Не назначен",
  scheduled: "Назначен",
  collected: "Анализ в работе",
  report_pending: "Отчёт в работе",
  report_ready: "Отчёт загружен",
};

export const bookingStatusColors: Record<BookingStatus, string> = {
  waiting_call: "bg-amber-50 text-amber-700 border-amber-200",
  no_answer: "bg-orange-50 text-orange-700 border-orange-200",
  not_scheduled: "bg-slate-50 text-slate-700 border-slate-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  collected: "bg-green-100 text-green-700 border-green-200",
  report_pending: "bg-violet-50 text-violet-700 border-violet-200",
  report_ready: "bg-emerald-600 text-white border-emerald-600",
};

/** Порядок статусов в селектах/меню (без not_scheduled — служебный). */
export const bookingStatusOrder: BookingStatus[] = [
  "waiting_call",
  "no_answer",
  "scheduled",
  "collected",
  "report_pending",
  "report_ready",
];

/** Ключ шаблона (SMS/Email/Telegram) для данного статуса. */
export const bookingStatusTemplateKey: Partial<Record<BookingStatus, string>> = {
  waiting_call: "booking_waiting_call",
  scheduled: "booking_scheduled",
  collected: "booking_collected",
  report_pending: "booking_report_pending",
  report_ready: "booking_report_ready",
};

export function getBookingStatusLabel(status: string): string {
  return bookingStatusLabels[status as BookingStatus] ?? status;
}
