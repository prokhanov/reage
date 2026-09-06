import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
// Импорт ради side-effect: валидирует VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY на старте.
import "./lib/supabaseUrl";
import { captureUtm } from "./lib/utm";
if (typeof window !== "undefined") captureUtm();
// Стартуем батч-запрос данных лендинга ПОСЛЕ первого paint, на idle:
// эти данные нужны только блокам ниже первого экрана (Pricing, WhereToTest,
// BiomarkerComparison), и запуск до mount React отнимал полосу у Hero/JS в
// LCP-окне на мобильных сетях.
import { preloadLandingBootstrap } from "./lib/landingBootstrap";
if (
  typeof window !== "undefined" &&
  (window.location.pathname === "/" || window.location.pathname === "/landing-v2")
) {
  const kick = () => {
    preloadLandingBootstrap().catch(() => {
      /* fallback внутри queryFn каждого хука */
    });
  };
  const schedule = () => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) ric(kick, { timeout: 2500 });
    else setTimeout(kick, 1500);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
}

// Отчёт использует собственный self-hosted стек (см. src/lib/reportLab/reportFonts.ts).
// Интерфейс загружает общий шрифтовой стек Consilium из document head.
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
