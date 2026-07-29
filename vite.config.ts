import { defineConfig, loadEnv, type IndexHtmlTransformContext } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
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

/**
 * Inlines critical CSS and converts the remaining stylesheet into an
 * asynchronous preload+swap so the browser never blocks first paint on CSS.
 * Reads stylesheet contents from the Vite bundle to avoid relying on the
 * dist files being written before HTML post-processing.
 */
function beastiesPlugin() {
  return {
    name: "beasties",
    apply: "build" as const,
    transformIndexHtml: {
      order: "post" as const,
      async handler(html: string, ctx: IndexHtmlTransformContext) {
        if (!ctx?.bundle) return html;

        const beasties = new Beasties({
          path: "dist",
          publicPath: "/",
          inlineThreshold: 14_000,
          preload: "swap",
          noscriptFallback: true,
          fonts: false,
          preloadFonts: false,
          logLevel: "warn",
          reduceInlineStyles: true,
        });

        // Override file reading so beasties reads CSS from the in-memory Vite
        // bundle rather than from disk. This avoids race conditions where the
        // stylesheet has not been written yet during HTML post-processing.
        const originalReadFile = beasties.readFile.bind(beasties);
        beasties.readFile = async (filename: string) => {
          const bundle = ctx.bundle;
          if (!bundle) return originalReadFile(filename);
          const base = path.basename(filename);
          const bundleKey = Object.keys(bundle).find(
            (key) =>
              key.endsWith(".css") &&
              (key === base || key.endsWith(`/${base}`) || key.endsWith(`/assets/${base}`))
          );
          if (bundleKey) {
            const asset = bundle[bundleKey];
            if (asset && (asset.type === "asset" || "source" in asset)) {
              return String(asset.source);
            }
          }
          return originalReadFile(filename);
        };

        return await beasties.process(html);

      },
    },
  };
}


/**
 * Injects <link rel="preconnect"> for the backend origin so the browser opens
 * a TLS connection to api.reage.life during HTML parse. We deliberately do
 * NOT preload the landing-bootstrap URL as `fetch` — the runtime request
 * carries an `apikey`/`Authorization` header pair, which would not match a
 * headerless preload and the browser would issue a second request anyway.
 * Preconnect gives the DNS+TLS win with no matching pitfalls.
 */
function landingBootstrapPreconnectPlugin(backendUrl: string) {
  return {
    name: "landing-bootstrap-preconnect",
    transformIndexHtml(html: string) {
      const origin = new URL(backendUrl).origin;
      const tag =
        `\n    <link rel="preconnect" href="${origin}" crossorigin="anonymous" />` +
        `\n    <link rel="dns-prefetch" href="${origin}" />`;
      return html.replace("</head>", `${tag}\n  </head>`);
    },
  };
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
      beastiesPlugin(),
      landingBootstrapPreconnectPlugin(backendUrl),
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
