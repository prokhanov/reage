import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ENERGY_CHECKUP, money } from "@/data/checkups";

interface Props {
  cartCount: number;
  /** Чекап текущей страницы уже в корзине */
  inCart?: boolean;
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
  inCart = false,
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
    // Прячем, как только верх футера поднялся выше низа экрана (и дальше не показываем)
    const update = () => setNearEnd(end.getBoundingClientRect().top < window.innerHeight);
    update();
    const io = new IntersectionObserver(update, { threshold: [0, 0.01, 1] });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    io.observe(end);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
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
          {cartCount > 0 && (
            <div className="truncate text-xs text-muted-foreground">
              {inCart ? `${name} в корзине` : `В корзине: ${cartCount}`}
            </div>
          )}
          <div className="text-lg font-bold text-foreground">{money(price)}</div>
        </div>
        <Button
          size="lg"
          onClick={onAddToCart}
          className="ml-auto h-12 flex-1 text-base"
          tabIndex={visible ? 0 : -1}
        >
          Купить — {money(price)}
        </Button>
      </div>
    </div>
  );
}
