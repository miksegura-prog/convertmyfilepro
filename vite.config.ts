
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
