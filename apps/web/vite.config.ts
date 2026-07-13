/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const fromFileUrl = (url: URL) =>
  decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:\/)/, "$1");
const appRoot = fromFileUrl(new URL(".", import.meta.url));
const htmlEntry = fromFileUrl(new URL("./index.html", import.meta.url));

export default defineConfig({
  root: appRoot,
  cacheDir: ".vite-cache",
  build: {
    rollupOptions: {
      input: htmlEntry,
    },
  },
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
