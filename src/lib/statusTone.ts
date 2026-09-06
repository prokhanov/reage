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
