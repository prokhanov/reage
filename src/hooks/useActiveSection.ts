import { useEffect, useState } from "react";

/**
 * Scroll-spy hook: tracks which section (by ID) is currently in view inside
 * a scrollable container. Returns the active section id.
 *
 * The `container` argument should be a state-backed element (e.g. from a callback
 * ref `setContentEl`) so the effect re-runs once the element is mounted.
 * Plain `useRef` values won't trigger a re-run when the DOM node is assigned.
 */
export function useActiveSection(
  container: HTMLElement | null,
  sectionIds: string[],
  options: { offset?: number; enabled?: boolean } = {}
) {
  const { offset = 120, enabled = true } = options;
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const element = container;
    if (!element || !enabled || sectionIds.length === 0) return;

    const computeActive = () => {
      const containerRect = element.getBoundingClientRect();
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

    element.addEventListener("scroll", computeActive, { passive: true });
    // Initial calculation after layout settles
    const raf = requestAnimationFrame(computeActive);

    return () => {
      element.removeEventListener("scroll", computeActive);
      cancelAnimationFrame(raf);
    };
  }, [container, sectionIds, offset, enabled]);

  return activeId;
}
