import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const COUNTER_ID = 109706546;

export function YandexMetrika() {
  const location = useLocation();
  const prevUrlRef = useRef<string | null>(null);
  const isFirstRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.ym !== "function") return;

    const url = window.location.href;

    if (isFirstRef.current) {
      isFirstRef.current = false;
      prevUrlRef.current = url;
      return;
    }

    window.ym(COUNTER_ID, "hit", url, {
      title: document.title,
      referer: prevUrlRef.current ?? undefined,
    });

    prevUrlRef.current = url;
  }, [location.pathname, location.search]);

  return null;
}
