import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminBreadcrumb {
  label: string;
  to?: string;
}

interface AdminPageProps {
  children: React.ReactNode;
  className?: string;
  /** Широкие data-heavy страницы (таблицы с большим числом колонок). */
  wide?: boolean;
}

/** Единый контейнер страницы админки: ширина, отступы, вертикальный ритм. */
export function AdminPage({ children, className, wide }: AdminPageProps) {
  return (
    <div
      className={cn(
        "container mx-auto w-full min-w-0 px-4 py-6 md:py-8 space-y-6",
        wide ? "max-w-[1600px]" : "max-w-7xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface AdminPageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Кнопки действий справа (на мобиле переносятся под заголовок). */
  actions?: React.ReactNode;
  breadcrumbs?: AdminBreadcrumb[];
  className?: string;
}

/** Единая шапка страницы админки: хлебные крошки, заголовок, описание, действия. */
export function AdminPageHeader({ title, description, actions, breadcrumbs, className }: AdminPageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Навигация" className="flex flex-wrap items-center gap-1 label-mono text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl md:text-3xl tracking-tight break-words">{title}</h1>
          {description && <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
