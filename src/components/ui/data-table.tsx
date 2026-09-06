import * as React from "react";
import { MoreVertical, Search, X, type LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Единая система таблиц проекта (эталон — Consilium).
 * Любая таблица в ReAge должна собираться из этих блоков:
 * DataTableShell → TableToolbar → Table (ui/table) → TableEmpty / TableSkeletonRows → TablePagination.
 */

/** Внешний контейнер таблицы: тонкая рамка, без скруглений и теней, горизонтальный скролл. */
export function DataTableShell({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("w-full overflow-x-auto border hairline bg-card", className)} {...props}>
      {children}
    </div>
  );
}

/** Панель над таблицей: поиск, фильтры, счётчики, основное действие. */
export function TableToolbar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Правая группа тулбара (действия, счётчики). */
export function TableToolbarActions({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:ml-auto", className)} {...props}>
      {children}
    </div>
  );
}

/** Единое поле поиска для всех списков. */
export function TableSearch({
  value,
  onValueChange,
  placeholder = "Поиск…",
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.7}
      />
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => onValueChange("")}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.7} />
        </button>
      )}
    </div>
  );
}

/** Строка-заглушка «ничего не найдено» внутри таблицы. */
export function TableEmpty({
  colSpan,
  children = "Ничего не найдено",
}: {
  colSpan: number;
  children?: React.ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-6 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

/** Скелетон строк таблицы во время загрузки. */
export function TableSkeletonRows({
  rows = 5,
  columns,
}: {
  rows?: number;
  columns: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full max-w-[160px] rounded-sm" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/** Пустое состояние вне таблицы (когда данных нет совсем). */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 border hairline bg-card px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.4} />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/** Единая постраничная навигация для всех списков. */
export function TablePagination({
  page,
  pageCount,
  onPageChange,
  total,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  total?: number;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-x border-b hairline bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="label-mono">
        Стр. {page} из {pageCount}
        {typeof total === "number" ? ` · ${total}` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
}

/** Меню действий строки — единственная разрешённая реализация row actions. */
export function RowActions({
  children,
  label = "Действия",
  align = "end",
}: {
  children: React.ReactNode;
  label?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground outline-none transition-colors",
          "hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground",
        )}
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.7} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={6} className="min-w-[11rem] p-1">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RowActionItem({
  icon: Icon,
  children,
  onSelect,
  destructive,
  disabled,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={() => {
        // Даём меню закрыться: иначе Radix держит pointer-events на body
        // и клики внутри открытого из пункта диалога не проходят.
        setTimeout(onSelect, 0);
      }}
      className={cn(
        "cursor-pointer gap-2.5 rounded-md px-2.5 py-2 text-[13px]",
        destructive
          ? "text-destructive focus:bg-destructive/10 focus:text-destructive"
          : "focus:bg-foreground/[0.06]",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />}
      {children}
    </DropdownMenuItem>
  );
}
