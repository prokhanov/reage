import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
// Импорт ради side-effect: валидирует VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY на старте.
import "./lib/supabaseUrl";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
