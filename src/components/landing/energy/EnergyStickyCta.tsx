import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ENERGY_CHECKUP, money } from "@/data/checkups";

interface Props {
  cartCount: number;
  onAddToCart: () => void;
  /** id элемента-«якоря» (основная кнопка в hero) */
  anchorId: string;
  /** id элемента, рядом с которым панель прячется (футер) */
  hideNearId?: string;
  price?: number;
  name?: string;
}

/**
 * Мобильная нижняя панель покупки. Появляется, когда основная кнопка hero
 * ушла из вьюпорта, и прячется у футера. На десктопе не рендерится.
 */
export function EnergyStickyCta({
  cartCount,
  onAddToCart,
  anchorId,
  hideNearId,
  price = ENERGY_CHECKUP.price,
  name = ENERGY_CHECKUP.name,
}: Props) {
  const [pastHero, setPastHero] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    const io = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    io.observe(anchor);
    return () => io.disconnect();
  }, [anchorId]);

  useEffect(() => {
    if (!hideNearId) return;
    const end = document.getElementById(hideNearId);
    if (!end) return;
    const io = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(end);
    return () => io.disconnect();
  }, [hideNearId]);

  const visible = pastHero && !nearEnd;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t hairline bg-background/95 backdrop-blur transition-transform duration-200 lg:hidden ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0">
          {cartCount > 0 && <div className="truncate text-xs text-muted-foreground">1 товар</div>}
          <div className="font-mono-tech text-lg text-foreground">{money(price)}</div>
        </div>
        <Button
          size="lg"
          onClick={onAddToCart}
          className="ml-auto h-12 flex-1 text-base"
          tabIndex={visible ? 0 : -1}
        >
          {cartCount > 0 ? "Оформить" : "В корзину"}
        </Button>
      </div>
    </div>
  );
}
