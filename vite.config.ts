import { defineConfig, loadEnv, type IndexHtmlTransformContext } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import Beasties from "beasties";

const DEFAULT_BACKEND_URL = "https://api.reage.life";


function normalizeBackendUrl(rawUrl?: string) {
  const clean = (rawUrl && rawUrl.length > 0 ? rawUrl : DEFAULT_BACKEND_URL).replace(/\/+$/, "");

  try {
    const host = new URL(clean).hostname;
    return /\.supabase\.co$/i.test(host) ? DEFAULT_BACKEND_URL : clean;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendUrl = normalizeBackendUrl(env.VITE_SUPABASE_URL);

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(backendUrl),
    },
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      injectMainCssPreload(),
      // Must run in dev too — imports across the app use imagetools query params
      // (`?format=avif&quality=68&url`); without the plugin those requests return
      // raw PNG bytes and the browser rejects them as invalid JS modules.
      imagetools(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query", "framer-motion"],
    },
    esbuild: mode === "production"
      ? { drop: ["console", "debugger"] }
      : undefined,
    build: {
      // Safari 17.5 / iOS 17.5 не поддерживают Iterator Helpers (глобальный Iterator).
      // Держим target на уровне, который esbuild гарантированно down-компилирует
      // до совместимого синтаксиса для Safari 17 / Chrome 110+.
      target: ["es2022", "safari16", "chrome110", "firefox115", "edge110"],
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-motion": ["framer-motion"],
            "vendor-charts": ["recharts"],
            "vendor-query": ["@tanstack/react-query"],
          },
        },
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query", "framer-motion"],
      esbuildOptions: {
        target: ["es2022", "safari16", "chrome110", "firefox115", "edge110"],
      },
    },
  };
});
