import { useEffect, useState, type RefObject } from "react";

/**
 * Scroll-spy hook: tracks which section (by ID) is currently in view inside
 * a scrollable container. Returns the active section id.
 */
export function useActiveSection(
  containerRef: RefObject<HTMLElement | null>,
  sectionIds: string[],
  options: { offset?: number; enabled?: boolean } = {}
) {
  const { offset = 120, enabled = true } = options;
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled || sectionIds.length === 0) return;

    const computeActive = () => {
      const containerRect = container.getBoundingClientRect();
      const threshold = containerRect.top + offset;

      let current: string | null = null;
      for (const id of sectionIds) {
        const el = document.getElementById(`section-${id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          current = id;
        }
      }
      setActiveId(current);
    };

    container.addEventListener("scroll", computeActive, { passive: true });
    // Initial calculation after layout settles
    const raf = requestAnimationFrame(computeActive);

    return () => {
      container.removeEventListener("scroll", computeActive);
      cancelAnimationFrame(raf);
    };
  }, [containerRef, sectionIds, offset, enabled]);

  return activeId;
}
