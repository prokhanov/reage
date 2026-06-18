import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AdminPageShellProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  loadingSkeleton?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function AdminPageShell({
  title,
  description,
  actions,
  loading = false,
  loadingSkeleton,
  className,
  children,
}: AdminPageShellProps) {
  return (
    <div className={cn("container mx-auto px-4 py-8 max-w-7xl space-y-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <div className="text-muted-foreground text-sm sm:text-base">{description}</div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {loading
        ? (loadingSkeleton ?? <DefaultAdminSkeleton />)
        : children}
    </div>
  );
}

function DefaultAdminSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default AdminPageShell;
