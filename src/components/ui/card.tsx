import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Единая карточка продукта. Разные визуальные роли задаются через variant,
 * а не через локальные border/rounded/shadow классы на странице.
 */
const cardVariants = cva("text-card-foreground", {
  variants: {
    variant: {
      /** Базовая карточка контента. */
      default: "rounded-xl border hairline bg-card shadow-card",
      /** Плоская панель (таблицы, списки, вложенные блоки) — стиль Consilium. */
      flat: "rounded-xl border hairline bg-card",
      /** Второстепенный блок на фоне поверхности. */
      muted: "rounded-xl border hairline bg-surface",
      /** Кликабельная карточка. */
      interactive:
        "rounded-xl border hairline bg-card shadow-card transition-colors hover:bg-foreground/[0.02] cursor-pointer",
      /** Акцентный/справочный блок (callout, рекомендация, подсказка). */
      accent: "rounded-xl border border-primary/25 bg-primary/[0.04]",
    },
  },
  defaultVariants: { variant: "default" },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
