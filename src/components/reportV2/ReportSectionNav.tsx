import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ReportNavSection {
  id: string;
  label: string;
}

interface Props {
  sections: ReportNavSection[];
  /**
   * Ref на общий контейнер, внутри которого лежит `.rl-paged-shell-framed`
   * (в режиме потока — просто корень со всеми `.rl-page`).
   */
  containerRef: React.RefObject<HTMLElement>;
  variant: "sidebar" | "dropdown";
}

/**
 * Находит DOM-контейнер, который реально скроллится (rl-paged-shell-framed —
 * при постраничном режиме; ближайший scrollable-предок — при потоковом).
 */
function findScrollContainer(root: HTMLElement): HTMLElement {
  const framed = root.querySelector<HTMLElement>(".rl-paged-shell-framed");
  if (framed) return framed;
  let el: HTMLElement | null = root;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) {
      return el;
    }
    el = el.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

function findTarget(root: HTMLElement, id: string): HTMLElement | null {
  // Ищем внутри paged-output. Paged.js копирует `data-section-id` в результат,
  // но безопаснее искать любой матч.
  return root.querySelector<HTMLElement>(`[data-section-id="${id}"]`);
}

function scrollToSection(root: HTMLElement, id: string) {
  const target = findTarget(root, id);
  if (!target) return;
  const container = findScrollContainer(root);
  const page =
    (target.closest(".pagedjs_page") as HTMLElement | null) ?? target;
  const cRect = container.getBoundingClientRect();
  const tRect = page.getBoundingClientRect();
  container.scrollTo({
    top: container.scrollTop + tRect.top - cRect.top - 16,
    behavior: "smooth",
  });
}

/**
 * Активная секция — та, чей page ближе всего к верхнему краю скролл-контейнера
 * и уже пересёк его.
 */
function useActiveSection(
  sections: ReportNavSection[],
  containerRef: React.RefObject<HTMLElement>,
): string | null {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    let scrollEl: HTMLElement | null = null;
    const compute = () => {
      if (!scrollEl) scrollEl = findScrollContainer(root);
      if (!scrollEl) return;
      const cTop = scrollEl.getBoundingClientRect().top;
      let best: { id: string; dy: number } | null = null;
      for (const s of sections) {
        const t = findTarget(root, s.id);
        if (!t) continue;
        const page = (t.closest(".pagedjs_page") as HTMLElement | null) ?? t;
        const dy = page.getBoundingClientRect().top - cTop;
        // Секция считается активной, если её верх выше линии 40% контейнера.
        if (dy - 0.4 * scrollEl.clientHeight <= 0) {
          if (!best || dy > best.dy) best = { id: s.id, dy };
        }
      }
      if (best) setActive(best.id);
      else if (sections[0]) setActive(sections[0].id);
    };
    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        compute();
      });
    };
    // ждём paged.js
    const t1 = window.setTimeout(compute, 400);
    const t2 = window.setTimeout(compute, 1500);
    const attach = () => {
      scrollEl = findScrollContainer(root);
      scrollEl?.addEventListener("scroll", onScroll, { passive: true });
    };
    attach();
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      scrollEl?.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [sections, containerRef]);
  return active;
}

export function ReportSectionNav({ sections, containerRef, variant }: Props) {
  const activeId = useActiveSection(sections, containerRef);
  const list = useMemo(() => sections, [sections]);

  const handleGo = (id: string) => {
    const root = containerRef.current;
    if (!root) return;
    scrollToSection(root, id);
  };

  if (variant === "dropdown") {
    return (
      <Select value={activeId ?? undefined} onValueChange={handleGo}>
        <SelectTrigger
          className="h-9 w-[260px] max-w-[75vw] text-xs [&>span]:block [&>span]:truncate [&>span]:min-w-0"
          aria-label="Разделы отчёта"
        >
          <SelectValue placeholder="Раздел отчёта" />
        </SelectTrigger>
        <SelectContent className="max-h-[60vh]">
          {list.map((s) => (
            <SelectItem key={s.id} value={s.id} className="text-xs">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <aside
      className="hidden lg:flex w-56 shrink-0 flex-col rounded-lg border bg-muted/30 max-h-[85vh] overflow-hidden"
      aria-label="Разделы отчёта"
    >
      <div className="border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Содержание
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {list.map((s) => {
          const isActive = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleGo(s.id)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <span className="line-clamp-2">{s.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
