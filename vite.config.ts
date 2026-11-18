
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { inspectAttr } from "kimi-plugin-inspect-react";

export default defineConfig({
  base: "/",

  // Caché fuera de Dropbox para evitar errores EBUSY
  cacheDir: process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "convertmyfilepro-vite-cache")
    : "node_modules/.vite",

  // FFmpeg loads its own Web Worker via import.meta.url.
  // Vite dependency pre-bundling can rewrite this URL into a nonexistent
  // optimized deps/worker.js?worker_file&type=module path during development.
  // Keep FFmpeg packages outside the dependency optimizer.
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },

  plugins: [inspectAttr(), react()],

  build: {
    emptyOutDir: false,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
