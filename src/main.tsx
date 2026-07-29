import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
// Импорт ради side-effect: валидирует VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY на старте.
import "./lib/supabaseUrl";
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
