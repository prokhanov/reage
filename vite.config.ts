import { defineConfig, loadEnv, type IndexHtmlTransformContext } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import type { OutputBundle } from "rollup";

/**
 * Injects a <link rel="preload" as="style"> for the hashed main CSS bundle
 * so the browser starts downloading it before parsing the full HTML.
 */
function injectMainCssPreload() {
  return {
    name: "inject-main-css-preload",
    transformIndexHtml(html: string, ctx: IndexHtmlTransformContext) {
      if (!ctx?.bundle) return html;

      const bundle = ctx.bundle as OutputBundle;
      const cssFiles = Object.entries(bundle)
        .filter(([fileName, asset]) => {
          if (!fileName.endsWith(".css") || !fileName.startsWith("assets/index-")) return false;
          return asset.type === "asset" || asset.type === "chunk";
        })
        .map(([fileName]) => fileName);

      if (!cssFiles.length) return html;

      const preloadLinks = cssFiles
        .map((file) => `    <link rel="preload" as="style" crossorigin href="/${file}" />`)
        .join("\n");

      return html.replace(
        /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/,
        `${preloadLinks}\n    <link rel="preconnect" href="https://fonts.googleapis.com" />`
      );
    },
  };
}

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
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query", "framer-motion"],
    },
    esbuild: mode === "production"
      ? { drop: ["console", "debugger"] }
      : undefined,
    build: {
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
  };
});
