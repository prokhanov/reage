import { defineConfig, type IndexHtmlTransformContext } from "vite";
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
        .map((file) => `    <link rel="preload" as="style" href="/${file}" />`)
        .join("\n");

      return html.replace(
        /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/,
        `${preloadLinks}\n    <link rel="preconnect" href="https://fonts.googleapis.com" />`
      );
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    injectMainCssPreload(),
    // vite-imagetools transforms images through `sharp` on-demand in dev,
    // causing 3-10s cold-start delays per image. Enable only for production builds.
    mode !== "development" && imagetools(),
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
}));
