import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Единый каркас страницы для всего продукта (кабинет пациента и админка).
 * Любая страница = <PageContainer><PageHeader/><Section/>…</PageContainer>.
 * Никаких локальных обёрток с собственными max-w/px/py.
 */

type PageWidth = "narrow" | "default" | "wide";

const WIDTH: Record<PageWidth, string> = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

export function PageContainer({
  width = "default",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { width?: PageWidth }) {
  return (
    <div
      className={cn(
        "container mx-auto w-full min-w-0 px-4 py-6 md:py-8 space-y-6 md:space-y-8",
        WIDTH[width],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Единая шапка страницы: надзаголовок, заголовок, описание, действия. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {eyebrow && <p className="label-mono">{eyebrow}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl md:text-3xl tracking-tight break-words">{title}</h1>
          {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Логический блок страницы. */
export function Section({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("space-y-4", className)} {...props}>
      {children}
    </section>
  );
}

/** Заголовок блока внутри страницы. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 space-y-1">
        <h2 className="text-lg md:text-xl tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
