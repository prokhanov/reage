import type { BadgeProps } from "@/components/ui/badge";

/**
 * Единая система статусов админки.
 * Любой статус (booking, подписка, платёж, письмо, промокод, пользователь)
 * приводится к одному из тонов дизайн-системы. Новых цветов не вводим —
 * используются только варианты Badge.
 */
export type StatusTone = NonNullable<BadgeProps["variant"]>;

const TONE_BY_STATUS: Record<string, StatusTone> = {
  // Позитивные / завершённые
  active: "success",
  approved: "success",
  confirmed: "success",
  completed: "success",
  collected: "success",
  delivered: "success",
  sent: "success",
  paid: "success",
  succeeded: "success",
  success: "success",
  published: "success",
  report_ready: "success",
  verified: "success",
  online: "success",
  enabled: "success",

  // В работе / нейтрально-информационные
  scheduled: "accent",
  in_progress: "accent",
  processing: "accent",
  application_submitted: "accent",
  report_pending: "accent",
  queued: "accent",
  running: "accent",

  // Ожидание
  pending: "warning",
  waiting_call: "warning",
  waiting: "warning",
  draft: "warning",
  unconfirmed: "warning",
  trial: "warning",
  expiring: "warning",

  // Проблемные
  no_answer: "destructive",
  failed: "destructive",
  error: "destructive",
  rejected: "destructive",
  cancelled: "destructive",
  canceled: "destructive",
  blocked: "destructive",
  bounced: "destructive",
  complained: "destructive",
  dlq: "destructive",
  expired: "destructive",
  overdue: "destructive",

  suppressed: "warning",

  // Нейтральные / выключенные
  inactive: "neutral",
  not_scheduled: "neutral",
  disabled: "neutral",
  archived: "neutral",
  unsubscribed: "neutral",
  skipped: "neutral",
  none: "neutral",
  offline: "neutral",
};

export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return "neutral";
  return TONE_BY_STATUS[status] ?? "neutral";
}

/** Единые русские подписи статусов (подписки, письма, интеракции, токены). */
const STATUS_LABELS: Record<string, string> = {
  active: "Активна",
  inactive: "Неактивна",
  pending: "Ожидает",
  expired: "Истекла",
  cancelled: "Отменена",
  canceled: "Отменена",
  completed: "Завершено",
  scheduled: "Запланировано",
  in_progress: "В процессе",
  draft: "Черновик",
  published: "Опубликован",
  blocked: "Заблокирован",
  sent: "Отправлено",
  failed: "Ошибка",
  error: "Ошибка",
  bounced: "Не доставлено",
  complained: "Жалоба",
  dlq: "Ошибка доставки",
  unsubscribed: "Отписан",
  skipped: "Пропущено",
  queued: "В очереди",
  not_scheduled: "Не назначен",
  uploaded: "Загружен",
  used: "Использован",
  suppressed: "Заблокирован",
  paid: "Оплачен",
  processing: "В обработке",
  revoked: "Отозван",
};

export function getStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status;
}

/** Роли пользователей — единая система подписей и тонов. */
const ROLE_TONE: Record<string, StatusTone> = {
  superadmin: "destructive",
  admin: "accent",
  doctor: "accent",
  manager: "accent",
  user: "neutral",
  patient: "neutral",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Суперадмин",
  admin: "Админ",
  doctor: "Врач",
  manager: "Менеджер",
  user: "Пользователь",
  patient: "Пациент",
};

export function getRoleTone(role: string | null | undefined): StatusTone {
  if (!role) return "neutral";
  return ROLE_TONE[role] ?? "neutral";
}

export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] ?? role;
}

