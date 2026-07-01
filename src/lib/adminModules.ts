// Единый источник правды по разделам админки.
// Значения совпадают с enum public.admin_module в БД.
export type AdminModule =
  | "ai_settings"
  | "data_management"
  | "patients"
  | "user_management"
  | "analysis_bookings"
  | "my_assignments"
  | "promo_codes"
  | "subscription_plans"
  | "payment_gateway"
  | "email_settings"
  | "sms_settings"
  | "telegram_settings"
  | "lab_locations"
  | "report_visuals"
  | "scale_preview";

export interface AdminModuleDef {
  value: AdminModule;
  label: string;
  path: string;
}

export const ADMIN_MODULES: AdminModuleDef[] = [
  { value: "patients", label: "Пациенты", path: "/admin/patients" },
  { value: "my_assignments", label: "Назначены мне", path: "/admin/my-assignments" },
  { value: "analysis_bookings", label: "Записи на анализы", path: "/admin/analysis-bookings" },
  { value: "user_management", label: "Управление пользователями", path: "/admin/user-management" },
  { value: "data_management", label: "Управление данными", path: "/admin/data-management" },
  { value: "ai_settings", label: "Настройки AI", path: "/admin/ai-settings" },
  { value: "subscription_plans", label: "Тарифы и подписки", path: "/admin/subscription-plans" },
  { value: "payment_gateway", label: "Платёжный шлюз", path: "/admin/payment-gateway" },
  { value: "promo_codes", label: "Промокоды", path: "/admin/promo-codes" },
  { value: "email_settings", label: "Email — рассылки", path: "/admin/email-settings" },
  { value: "sms_settings", label: "SMS — рассылки", path: "/admin/sms-settings" },
  { value: "telegram_settings", label: "Telegram — уведомления", path: "/admin/telegram-settings" },
  { value: "lab_locations", label: "Лаборатории на карте", path: "/admin/labs" },
  { value: "report_visuals", label: "Визуал отчётов", path: "/admin/report-visuals" },
  { value: "scale_preview", label: "Превью шкалы", path: "/admin/scale-preview" },
];

export const ADMIN_MODULE_LABELS: Record<AdminModule, string> = ADMIN_MODULES.reduce(
  (acc, m) => {
    acc[m.value] = m.label;
    return acc;
  },
  {} as Record<AdminModule, string>,
);
