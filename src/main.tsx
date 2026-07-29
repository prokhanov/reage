import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
// Импорт ради side-effect: валидирует VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY на старте.
import "./lib/supabaseUrl";
// Стартуем батч-запрос данных лендинга ДО mount React: экономит ~1.5s
// в критической цепочке LCP на мобильных сетях (один HTTP вместо 7).
import { preloadLandingBootstrap } from "./lib/landingBootstrap";
if (typeof window !== "undefined" && window.location.pathname === "/") {
  preloadLandingBootstrap().catch(() => {
    /* fallback внутри queryFn каждого хука */
  });
}
// ВНИМАНИЕ: шрифты (Inter / Fraunces / JetBrains) НЕ грузим в главный бандл.
// Отчёт использует собственный self-hosted стек (см. src/lib/reportLab/reportFonts.ts),
// а лендинг/UI работает через системный стек с fallback'ом — это критично для
// FCP/LCP на мобильных сетях (иначе render-blocking CSS даёт +2–3 сек к первому пикселю).
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
