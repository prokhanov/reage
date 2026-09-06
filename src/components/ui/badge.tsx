import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border font-medium leading-none transition-colors focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        neutral: "border-border bg-surface text-muted-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        accent: "border-accent/40 bg-accent/10 text-accent",
        success: "border-status-optimal/40 bg-status-optimal/10 text-status-optimal",
        warning: "border-status-acceptable/40 bg-status-acceptable/10 text-status-acceptable",
        risk: "border-status-risk/40 bg-status-risk/10 text-status-risk",
        destructive: "border-destructive/40 bg-destructive/10 text-destructive",
        outline: "border-border-strong bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot ? <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
