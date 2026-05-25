import { useLocation } from "react-router-dom";
import { PageMeta } from "./PageMeta";

type Meta = { title: string; description: string; canonical?: string };

// Уникальные мета-теги для каждого маршрута. Title < 60 символов, description 50–160.
const ROUTE_META: Record<string, Meta> = {
  "/": {
    title: "ReAge — персональный сервис управления здоровьем",
    description:
      "AI-платформа ReAge: анализ биомаркеров, биологический возраст и персональные рекомендации по здоровью и долголетию.",
    canonical: "/",
  },
  "/example-report": {
    title: "Пример персонального отчёта | ReAge",
    description:
      "Посмотрите пример персонального отчёта ReAge: биомаркеры, биологический возраст и стратегия здоровья на год.",
    canonical: "/example-report",
  },
  "/auth": {
    title: "Вход в личный кабинет | ReAge",
    description:
      "Войдите в личный кабинет ReAge, чтобы открыть свою контрольную панель здоровья и персональные рекомендации.",
  },
  "/register": {
    title: "Регистрация в ReAge",
    description:
      "Создайте аккаунт ReAge за пару минут и получите персональную программу мониторинга здоровья на год.",
  },
  "/register-staff": {
    title: "Регистрация специалиста | ReAge",
    description:
      "Регистрация для врачей и специалистов сервиса ReAge: доступ к панели работы с пациентами.",
  },
  "/reset-password": {
    title: "Восстановление пароля | ReAge",
    description: "Сбросьте пароль от личного кабинета ReAge и восстановите доступ к своим данным здоровья.",
  },
  "/onboarding": {
    title: "Знакомство с ReAge",
    description:
      "Заполните профиль здоровья, чтобы ReAge построил персональную стратегию мониторинга биомаркеров.",
  },
  "/dashboard": {
    title: "Контрольная панель здоровья | ReAge",
    description:
      "Ваша контрольная панель ReAge: биологический возраст, динамика биомаркеров и приоритеты здоровья.",
  },
  "/profile": {
    title: "Профиль и настройки | ReAge",
    description:
      "Управляйте профилем, антропометрией и настройками подписки в личном кабинете ReAge.",
  },
  "/analyses": {
    title: "Мои анализы | ReAge",
    description:
      "История загруженных анализов и AI-отчётов ReAge: добавляйте новые исследования и отслеживайте динамику.",
  },
  "/biomarkers": {
    title: "Мои биомаркеры | ReAge",
    description:
      "Все биомаркеры по системам здоровья с актуальными значениями, статусами и референсными диапазонами.",
  },
  "/recommendations": {
    title: "Рекомендации по здоровью | ReAge",
    description:
      "Персональные рекомендации ReAge по питанию, добавкам и образу жизни на основе ваших биомаркеров.",
  },
  "/prescriptions": {
    title: "Назначения и протоколы | ReAge",
    description:
      "Структурированные назначения, добавки и протоколы, подобранные на основе ваших анализов в ReAge.",
  },
  "/trends": {
    title: "Тренды биомаркеров | ReAge",
    description:
      "Динамика биомаркеров во времени: тренды, отклонения и зоны риска по результатам ваших анализов.",
  },
  "/my-state": {
    title: "Моё состояние | ReAge",
    description:
      "Сводка текущего состояния здоровья: ключевые показатели, ощущения и динамика за последний период.",
  },
  "/health-assistant": {
    title: "AI-ассистент здоровья | ReAge",
    description:
      "Персональный AI-ассистент ReAge: задайте вопрос о своих анализах, биомаркерах и плане здоровья.",
  },
  "/subscription": {
    title: "Подписка и тарифы | ReAge",
    description:
      "Управление подпиской ReAge: тарифы годового мониторинга здоровья и доступные опции.",
  },
  "/health-strategy": {
    title: "Стратегия здоровья на год | ReAge",
    description:
      "Персональная годовая стратегия здоровья ReAge: цели, шаги и контрольные точки мониторинга.",
  },
};

// Префиксы маршрутов, у которых динамическая часть (id и т.п.) — общая мета для всей группы.
const PREFIX_META: Array<{ prefix: string; meta: Meta }> = [
  {
    prefix: "/analyses/",
    meta: {
      title: "Отчёт по анализу | ReAge",
      description:
        "Подробный AI-отчёт по результату анализа: биомаркеры, интерпретация и персональные рекомендации.",
    },
  },
  {
    prefix: "/admin/patients/",
    meta: {
      title: "Карточка пациента | ReAge Admin",
      description: "Карточка пациента в административной панели ReAge: анализы, биомаркеры и история взаимодействий.",
    },
  },
  {
    prefix: "/admin/",
    meta: {
      title: "Административная панель | ReAge",
      description: "Управление пациентами, данными и настройками сервиса ReAge.",
    },
  },
];

const FALLBACK: Meta = {
  title: "ReAge — управление здоровьем и долголетием",
  description:
    "Персональная AI-платформа ReAge: анализ биомаркеров, биологический возраст и стратегия здоровья на год.",
};

export function RouteMeta() {
  const { pathname } = useLocation();
  const exact = ROUTE_META[pathname];
  const prefix = !exact ? PREFIX_META.find(({ prefix }) => pathname.startsWith(prefix))?.meta : undefined;
  const meta = exact ?? prefix ?? FALLBACK;
  return <PageMeta title={meta.title} description={meta.description} canonical={meta.canonical} />;
}
