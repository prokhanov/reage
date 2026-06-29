import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Scroll-spy hook: tracks which section (by ID) is currently in view inside
 * a scrollable container. Returns the active section id.
 */
export function useActiveSection(
  container: HTMLElement | null,
  sectionIds: string[],
  options: { offset?: number; enabled?: boolean } = {}
) {
  const { offset = 120, enabled = true } = options;
  const [activeId, setActiveId] = useState<string | null>(null);

  // Use the container element directly. When callers pass a state-backed ref
  // (setContentEl) the effect re-runs automatically as soon as the DOM element
  // is mounted, avoiding the stale-null problem of plain useRef.
  const containerElement = useSyncExternalStore(
    (callback) => {
      if (!container) return () => {};
      callback();
      return () => {};
    },
    () => container,
    () => null
  );

  useEffect(() => {
    const element = containerElement;
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
  }, [containerElement, sectionIds, offset, enabled]);

  return activeId;
}
