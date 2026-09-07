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
      <div className="mx-auto flex h-14 w-full max-w-[72rem] items-center justify-between px-4 md:h-16 md:px-6">
        <Link to="/" aria-label="ReAge — на главную" className="flex items-center">
          <ThemedLogo className="h-[2.7rem] w-auto" eager />
        </Link>

        <button
          type="button"
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm text-foreground transition-colors hover:bg-muted"
          aria-label={cartCount > 0 ? `Корзина, товаров: ${cartCount}` : "Корзина, пусто"}
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
