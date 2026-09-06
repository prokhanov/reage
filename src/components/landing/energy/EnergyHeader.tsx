import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

import { ThemedLogo } from "@/components/ThemedLogo";

interface Props {
  cartCount: number;
}

/** Максимально лёгкая шапка лендинга: логотип + корзина. Без навигации. */
export function EnergyHeader({ cartCount }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b hairline bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center justify-between px-4 md:px-6">
        <Link to="/" aria-label="ReAge — на главную" className="flex items-center">
          <ThemedLogo className="h-7 w-auto" eager />
        </Link>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          aria-label="Корзина"
        >
          <span className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {cartCount}
              </span>
            )}
          </span>
          <span className="hidden sm:inline">Корзина</span>
        </button>
      </div>
    </header>
  );
}
